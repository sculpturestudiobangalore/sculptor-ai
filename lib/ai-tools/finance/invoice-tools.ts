import { tool } from "ai";
import { z } from "zod";
import {
  PDFGenerator,
  InvoiceData,
} from "@/lib/ai-tools/utilities/pdf-generator";
import { supabase } from "@/lib/supabase";
import {
  getBusinessConfig,
  calculateGST,
  getNextDocumentNumber,
  formatINR,
} from "./finance-helpers";

const debugLog = (toolName: string, step: string, data: any) => {
  console.log(`🔍 [${toolName}] ${step}:`, data);
};

// ============================================================================
// TOOL 4: Generate Invoice
// ============================================================================

export const generateInvoiceTool = tool({
  description:
    "Generate a professional tax invoice with line items, GST calculation, advance payment tracking, and auto-generated invoice number. Shows all previous payments and balance due.",
  inputSchema: z.object({
    projectName: z.string().describe("Project name to link invoice to"),
    items: z
      .array(
        z.object({
          description: z.string().describe("Item or service description"),
          hsnSacCode: z.string().optional().describe("HSN/SAC code"),
          quantity: z.number().positive().describe("Quantity"),
          unit: z.string().default("nos").describe("Unit of measurement"),
          rate: z.number().positive().describe("Rate per unit in INR"),
        })
      )
      .min(1)
      .describe("Array of line items for the invoice"),
    dueInDays: z
      .number()
      .default(30)
      .describe("Payment due in days (default 30)"),
    applyGST: z.boolean().default(true).describe("Whether to apply GST"),
    advancePaid: z
      .number()
      .default(0)
      .describe("Advance amount already paid by client (if any)"),
    notes: z.string().optional().describe("Additional notes for the invoice"),
  }),
  execute: async ({
    projectName,
    items,
    dueInDays,
    applyGST,
    advancePaid,
    notes,
  }) => {
    try {
      // 1. Get business config
      const config = await getBusinessConfig();

      // 2. Find project with client details

      // 2. Find project with client details - WITH PROPER TYPING
      const { data: projects, error: projectError } = await supabase
        .from("projects")
        .select(
          `
    id, 
    name, 
    client_name,
    clients!inner(id, name, email, phone, state_code, company, address)
  `
        )
        .or(`name.eq.${projectName},name.ilike.%${projectName}%`)
        .order("name", { ascending: true });

      console.log("🔍 [INVOICE TOOL] Project search results:", {
        projectName,
        found: projects?.length,
        rawData: projects, // Log the raw structure
      });

      if (projectError) {
        return {
          success: false,
          error: `Database error: ${projectError.message}`,
        };
      }

      if (!projects || projects.length === 0) {
        return {
          success: false,
          error: `Project "${projectName}" not found. Please check the project name.`,
        };
      }

      // Handle multiple matches with proper typing
      interface ProjectWithClient {
        id: string;
        name: string;
        client_name: string;
        clients: Array<{
          id: string;
          name: string;
          email: string;
          phone: string;
          state_code: string;
          company: string;
          address: string;
        }>;
      }

      const typedProjects = projects as ProjectWithClient[];

      let project: ProjectWithClient;
      if (typedProjects.length > 1) {
        const exactMatch = typedProjects.find(
          (p) => p.name?.toLowerCase() === projectName.toLowerCase()
        );
        if (exactMatch) {
          project = exactMatch;
        } else {
          return {
            success: false,
            multipleMatches: true,
            matches: typedProjects.map((p) => {
              const clientData = p.clients[0]; // First client in array
              return {
                id: p.id,
                name: p.name || "Unnamed Project",
                client: clientData?.name || "Unknown Client",
              };
            }),
            error: `Multiple projects found matching "${projectName}". Please specify exact project name.`,
          };
        }
      } else {
        project = typedProjects[0];
      }

      // Extract client data - Now properly typed
      const client = project.clients[0];
      console.log("🔍 [INVOICE TOOL] Using client:", client);

      if (!client) {
        return {
          success: false,
          error: `Client details missing for project "${project.name}".`,
        };
      }

      console.log("Project query error:", projectError);
      console.log("Projects returned:", projects);

      // 3. Check for existing payments on this project (NOT linked to any invoice yet)
      console.log("💰 Querying payments for project:", project.id);
      const { data: existingPayments } = await supabase
        .from("payments")
        .select("id, amount, payment_date, payment_method, receipt_number")
        .eq("project_id", project.id)
        .is("invoice_id", null) // Only get unlinked payments (advances)
        .order("payment_date", { ascending: true });

      console.log("💰 Found existing payments:", existingPayments?.length || 0);

      const totalPreviousPayments =
        (existingPayments || []).reduce((sum, p) => sum + (p.amount || 0), 0) +
        advancePaid;

      console.log("💰 Total advance paid:", totalPreviousPayments);

      // 4. Calculate line item totals
      const lineItems = items.map((item) => {
        const amount = item.quantity * item.rate;
        return {
          ...item,
          amount: Math.round(amount * 100) / 100,
        };
      });

      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

      // 5. Calculate GST
      let gstBreakdown = {
        taxType: "none",
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate: 0,
        igstAmount: 0,
        totalTax: 0,
      };

      if (applyGST) {
        gstBreakdown = calculateGST(
          subtotal,
          config.gstRate,
          config.stateCode,
          client?.state_code
        );
      }

      // DEBUG: Log what we're getting
      console.log("GST Breakdown:", {
        taxType: gstBreakdown.taxType,
        configState: config.stateCode,
        clientState: client?.state_code,
        applyGST: applyGST,
      });

      // Map tax_type for database
      const dbTaxType =
        gstBreakdown.taxType === "cgst+sgst" ? "gst" : gstBreakdown.taxType;
      console.log("Mapped tax_type for DB:", dbTaxType);

      const totalAmount = subtotal + gstBreakdown.totalTax;
      const balanceDue = totalAmount - totalPreviousPayments;

      // 5.5 Idempotency Check: Prevent duplicate invoices
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data: existingInvoices } = await supabase
        .from("invoices_enhanced")
        .select("*, invoice_items(*)")
        .eq("project_name", project.name) // Using project name as it's a key identifier here
        .eq("total_amount", totalAmount)
        .gte("created_at", twoMinutesAgo)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingInvoices && existingInvoices.length > 0) {
        const existing = existingInvoices[0];
        console.log(
          "🔄 Idempotency check: Found existing invoice",
          existing.invoice_number
        );

        // Regenerate PDF
        const pdfData: InvoiceData = {
          invoiceNumber: existing.invoice_number,
          date: new Date(existing.issue_date).toISOString().split("T")[0],
          dueDate: new Date(existing.due_date).toISOString().split("T")[0],
          client: {
            name: client?.name || "",
            address: client?.address || "",
            phone: client?.phone || "",
          },
          project: {
            name: project.name,
            type: "Sculpture",
            deadline: new Date(existing.due_date).toISOString().split("T")[0],
          },
          items: lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
          })),
          subtotal: existing.subtotal,
          tax: existing.tax_amount,
          total: existing.total_amount,
          advancePaid: existing.advance_paid,
          balanceDue: existing.balance_due,
          terms: config.invoiceTerms || "",
          companySettings: {
            name: config.businessName,
            address: config.businessAddress || "",
            phone: config.businessPhone || "",
            email: config.businessEmail || "",
            gstin: config.gstin || "",
            bankDetails: config.bankDetails,
          },
        };

        const pdfBytes = await PDFGenerator.generateInvoice(pdfData);
        const base64Pdf = btoa(String.fromCharCode(...pdfBytes));
        const pdfDataUrl = `data:application/pdf;base64,${base64Pdf}`;

        return {
          success: true,
          invoice: {
            id: existing.id,
            invoiceNumber: existing.invoice_number,
            projectName: project.name,
            clientName: client?.name,
            issueDate: new Date(existing.issue_date)
              .toISOString()
              .split("T")[0],
            dueDate: new Date(existing.due_date).toISOString().split("T")[0],
            subtotal: formatINR(existing.subtotal),
            taxType: existing.tax_type,
            taxAmount: formatINR(existing.tax_amount),
            totalAmount: formatINR(existing.total_amount),
            advancePaid: formatINR(existing.advance_paid),
            balanceDue: formatINR(existing.balance_due),
            itemCount: (existing.invoice_items || []).length,
            status: existing.status,
            previousPayments: existingPayments?.length || 0,
            pdfDataUrl,
          },
          message: `✅ Found existing invoice ${existing.invoice_number} created just now. (Prevented duplicate)`,
        };
      }

      // 6. Generate invoice number
      const invoiceNumber = await getNextDocumentNumber("invoice");

      // 7. Calculate due date
      const issueDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueInDays);

      // 8. Insert invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices_enhanced")
        .insert({
          invoice_number: invoiceNumber,
          project_name: project.name,
          client_name: project.client_name,
          issue_date: issueDate.toISOString(),
          due_date: dueDate.toISOString(),
          subtotal: subtotal,
          tax_rate: applyGST ? config.gstRate : 0,
          tax_amount: gstBreakdown.totalTax,
          cgst_rate: gstBreakdown.cgstRate,
          cgst_amount: gstBreakdown.cgstAmount,
          sgst_rate: gstBreakdown.sgstRate,
          sgst_amount: gstBreakdown.sgstAmount,
          igst_rate: gstBreakdown.igstRate,
          igst_amount: gstBreakdown.igstAmount,
          total_amount: totalAmount,
          advance_paid: totalPreviousPayments,
          paid_amount: 0,
          balance_due: balanceDue,
          is_gst_applicable: applyGST,
          tax_type: gstBreakdown.taxType,
          status: "draft",
          notes: notes || null,
          terms_and_conditions: config.invoiceTerms,
          payment_terms: `Net ${dueInDays}`,
        })
        .select()
        .single();

      if (invoiceError) {
        console.error("Invoice creation error:", invoiceError);
        return {
          success: false,
          error: `Failed to create invoice: ${invoiceError.message}`,
        };
      }

      // 9. Insert invoice items
      const invoiceItems = lineItems.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        hsn_sac_code: item.hsnSacCode || null,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.rate,
        total_price: item.amount,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItems);

      if (itemsError) {
        console.error("Invoice items error:", itemsError);
        // Rollback
        await supabase.from("invoices_enhanced").delete().eq("id", invoice.id);
        return {
          success: false,
          error: `Failed to add invoice items: ${itemsError.message}`,
        };
      }

      // 10. Link existing payments to this invoice
      if (existingPayments && existingPayments.length > 0) {
        console.log(
          `🔗 Linking ${existingPayments.length} payments to invoice ${invoice.id}`
        );
        const paymentIds = existingPayments.map((p) => p.id);
        const { error: linkError } = await supabase
          .from("payments")
          .update({ invoice_id: invoice.id })
          .in("id", paymentIds);

        if (linkError) {
          console.error(
            "⚠️ Warning: Failed to link payments to invoice:",
            linkError
          );
          // Don't fail the whole operation, just log the warning
        } else {
          console.log("✅ Successfully linked payments to invoice");
        }
      }

      // Prepare data for PDF generation
      const invoiceData: InvoiceData = {
        invoiceNumber: invoiceNumber,
        date: issueDate.toISOString().split("T")[0],
        dueDate: dueDate.toISOString().split("T")[0],
        client: {
          name: client?.name || "", // ✅ Use 'client' not 'clientName'
          address: client?.address || "",
          phone: client?.phone || "",
        },
        project: {
          // ✅ ADD THIS
          name: project.name,
          type: "Sculpture",
          deadline: dueDate.toISOString().split("T")[0],
        },
        items: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
        })),
        subtotal,
        tax: gstBreakdown.totalTax,
        total: totalAmount,
        advancePaid: totalPreviousPayments, // ✅ ADD THIS (already calculated)
        balanceDue: balanceDue, // ✅ ADD THIS (already calculated)
        terms: config.invoiceTerms || "", // ✅ ADD THIS
        companySettings: {
          name: config.businessName,
          address: config.businessAddress || "",
          phone: config.businessPhone || "",
          email: config.businessEmail || "",
          gstin: config.gstin || "",
          bankDetails: config.bankDetails,
        },
      };

      // Generate PDF bytes using your PDFGenerator
      const pdfBytes = await PDFGenerator.generateInvoice(invoiceData);

      // Convert PDF bytes into base64 string for download
      const base64Pdf = btoa(String.fromCharCode(...pdfBytes));
      const pdfDataUrl = `data:application/pdf;base64,${base64Pdf}`;

      console.log("Projects found:", projects);
      console.log("Using project:", project);
      console.log("Client data:", client);

      return {
        success: true,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoiceNumber,
          projectName: project.name,
          clientName: client?.name,
          issueDate: issueDate.toISOString().split("T")[0],
          dueDate: dueDate.toISOString().split("T")[0],
          subtotal: formatINR(subtotal),
          taxType: gstBreakdown.taxType,
          taxAmount: formatINR(gstBreakdown.totalTax),
          totalAmount: formatINR(totalAmount),
          advancePaid: formatINR(totalPreviousPayments),
          balanceDue: formatINR(balanceDue),
          itemCount: items.length,
          status: "draft",
          previousPayments: existingPayments?.length || 0,
          pdfDataUrl,
        },
        message: `✅ Invoice ${invoiceNumber} created. Total: ${formatINR(
          totalAmount
        )}, Balance Due: ${formatINR(balanceDue)}`,
      };
    } catch (error) {
      console.error("Generate invoice error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error generating invoice",
      };
    }
  },
});

// ============================================================================
// TOOL 5: Convert Quotation to Invoice
// ============================================================================

// ============================================================================
// TOOL 6: Update Invoice Status
// ============================================================================

export const updateInvoiceStatusTool = tool({
  description:
    "Update invoice status. Valid statuses: generated, paid, cancelled",
  inputSchema: z.object({
    invoiceNumber: z.string().describe("Invoice number (e.g., INV-2025-001)"),
    status: z.enum(["generated", "paid", "cancelled"]).describe("New status"),
  }),
  execute: async ({ invoiceNumber, status }) => {
    try {
      const { data, error } = await supabase
        .from("invoices_enhanced")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("invoice_number", invoiceNumber)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to update status: ${error.message}`,
        };
      }

      return {
        success: true,
        invoice: {
          invoiceNumber,
          status,
        },
        message: `Invoice ${invoiceNumber} status updated to ${status}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// ============================================================================
// TOOL 7: list Invoice tool
// ============================================================================

export const listInvoicesTool = tool({
  description:
    "List all invoices, optionally filtered by client ID or client name",
  inputSchema: z.object({
    clientId: z.string().optional(),
    clientName: z.string().optional(),
  }),
  execute: async (input) => {
    try {
      let query = supabase
        .from("invoices_enhanced")
        .select("*")
        .order("created_at", { ascending: false });

      if (input.clientId) {
        query = query.eq("client_id", input.clientId);
      } else if (input.clientName) {
        const { data: clients } = await supabase
          .from("clients")
          .select("id")
          .ilike("name", `%${input.clientName}%`)
          .limit(1);
        if (clients && clients.length > 0) {
          query = query.eq("client_id", clients[0].id);
        } else {
          return { success: true, invoices: [] };
        }
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        invoices: data || [],
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error in list invoices tool",
      };
    }
  },
});

// ============================================================================
// TOOL 8: Show Invoice Edit Form
// ============================================================================

export const showInvoiceEditFormTool = tool({
  description:
    "Show an interactive form to edit an existing invoice. Load invoice data and display it for modification.",
  inputSchema: z.object({
    invoiceNumber: z
      .string()
      .describe("Invoice number to edit (e.g., INV-2025-001)"),
  }),
  execute: async ({ invoiceNumber }) => {
    try {
      // Load invoice
      const { data: invoice, error: invError } = await supabase
        .from("invoices_enhanced")
        .select("*")
        .eq("invoice_number", invoiceNumber)
        .single();

      if (invError || !invoice) {
        return {
          success: false,
          error: `Invoice ${invoiceNumber} not found`,
        };
      }

      // Load invoice items
      const { data: items, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoice.id);

      if (itemsError) {
        return {
          success: false,
          error: `Failed to load invoice items: ${itemsError.message}`,
        };
      }

      // Get client and project details
      const { data: client } = await supabase
        .from("clients")
        .select("name")
        .eq("id", invoice.client_id)
        .single();

      let projectName = null;
      if (invoice.project_id) {
        const { data: project } = await supabase
          .from("projects")
          .select("name")
          .eq("id", invoice.project_id)
          .single();
        if (project) projectName = project.name;
      }

      return {
        success: true,
        showForm: true,
        invoiceNumber,
        clientName: client?.name || "Unknown Client",
        projectName,
        invoiceData: {
          issueDate: invoice.issue_date
            ? new Date(invoice.issue_date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          dueDate: invoice.due_date
            ? new Date(invoice.due_date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          applyGST: invoice.is_gst_applicable || false,
          advancePaid: invoice.advance_paid || 0,
          notes: invoice.notes || "",
          items: (items || []).map((item: any) => ({
            name: item.name || "",
            description: item.description || "",
            material: item.material || "",
            size: item.size || "",
            finish: item.finish || "",
            quantity: item.quantity || 1,
            unit: item.unit || "nos",
            rate: item.unit_price || 0,
            notes: item.notes || "",
            hsnSacCode: item.hsn_sac_code || "",
          })),
        },
      };
    } catch (err) {
      console.error("❌ showInvoiceEditFormTool unexpected error:", err);
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Unknown error in showInvoiceEditFormTool",
      };
    }
  },
});

// ============================================================================
// TOOL 9: Update Invoice Tool
// ============================================================================

export const updateInvoiceTool = tool({
  description:
    "Update an existing invoice. Can update items, dates, advance paid, and notes. Recalculates totals and taxes.",
  inputSchema: z.object({
    invoiceNumber: z
      .string()
      .describe("Invoice number to update (e.g., INV-2025-001)"),
    items: z
      .array(
        z.object({
          description: z.string().describe("Item description"),
          quantity: z.number().positive(),
          rate: z.number().positive(),
          unit: z.string().default("nos"),
        })
      )
      .optional()
      .describe("New items to replace existing ones"),
    issueDate: z.string().optional().describe("New issue date (YYYY-MM-DD)"),
    dueDate: z.string().optional().describe("New due date (YYYY-MM-DD)"),
    advancePaid: z
      .number()
      .optional()
      .describe("Updated advance payment amount"),
    notes: z.string().optional().describe("Updated notes"),
  }),
  execute: async ({
    invoiceNumber,
    items,
    issueDate,
    dueDate,
    advancePaid,
    notes,
  }) => {
    try {
      console.log("✏️ UPDATE INVOICE:", invoiceNumber);

      // 1. Find invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices_enhanced")
        .select(
          `
          *,
          clients:client_id(state_code)
        `
        )
        .eq("invoice_number", invoiceNumber)
        .single();

      if (invoiceError || !invoice) {
        return {
          success: false,
          error: `Invoice ${invoiceNumber} not found`,
        };
      }

      // 2. Check if can be updated
      if (invoice.status === "paid" || invoice.status === "cancelled") {
        return {
          success: false,
          error: `Cannot update invoice with status: ${invoice.status}`,
        };
      }

      const config = await getBusinessConfig();
      let updatedInvoice: any = { updated_at: new Date().toISOString() };

      // 3. Update items if provided
      if (items && items.length > 0) {
        // Delete old items
        await supabase
          .from("invoice_items")
          .delete()
          .eq("invoice_id", invoice.id);

        // Calculate new totals
        const lineItems = items.map((item) => ({
          ...item,
          amount: item.quantity * item.rate,
        }));

        const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

        // Calculate GST
        const clientStateCode = (invoice.clients as any)?.state_code;
        const gstBreakdown = invoice.is_gst_applicable
          ? calculateGST(
              subtotal,
              config.gstRate,
              config.stateCode,
              clientStateCode
            )
          : {
              taxType: "none",
              cgstRate: 0,
              cgstAmount: 0,
              sgstRate: 0,
              sgstAmount: 0,
              igstRate: 0,
              igstAmount: 0,
              totalTax: 0,
            };

        const totalAmount = subtotal + gstBreakdown.totalTax;

        // Insert new items
        const invoiceItems = lineItems.map((item) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.rate,
          total_price: item.amount,
        }));

        const { error: itemsError } = await supabase
          .from("invoice_items")
          .insert(invoiceItems);

        if (itemsError) {
          return {
            success: false,
            error: `Failed to update items: ${itemsError.message}`,
          };
        }

        // Update invoice totals
        updatedInvoice = {
          ...updatedInvoice,
          subtotal,
          tax_amount: gstBreakdown.totalTax,
          cgst_rate: gstBreakdown.cgstRate,
          cgst_amount: gstBreakdown.cgstAmount,
          sgst_rate: gstBreakdown.sgstRate,
          sgst_amount: gstBreakdown.sgstAmount,
          igst_rate: gstBreakdown.igstRate,
          igst_amount: gstBreakdown.igstAmount,
          total_amount: totalAmount,
          tax_type: gstBreakdown.taxType,
        };
      }

      // 4. Update dates if provided
      if (issueDate) {
        // Set to noon to avoid timezone issues
        const newDate = new Date(issueDate);
        newDate.setHours(12, 0, 0, 0);
        updatedInvoice.issue_date = newDate.toISOString();
      }
      if (dueDate) {
        const newDate = new Date(dueDate);
        newDate.setHours(12, 0, 0, 0);
        updatedInvoice.due_date = newDate.toISOString();
      }

      // 5. Update advance paid if provided
      if (advancePaid !== undefined) {
        updatedInvoice.advance_paid = advancePaid;
      }

      // 6. Update notes if provided
      if (notes) {
        updatedInvoice.notes = notes;
      }

      // 7. Recalculate balance due
      // We need the latest total_amount and advance_paid
      const currentTotal =
        updatedInvoice.total_amount !== undefined
          ? updatedInvoice.total_amount
          : invoice.total_amount;
      const currentAdvance =
        updatedInvoice.advance_paid !== undefined
          ? updatedInvoice.advance_paid
          : invoice.advance_paid;

      // Also consider paid_amount if any (though usually 0 for draft/generated)
      const paidAmount = invoice.paid_amount || 0;

      updatedInvoice.balance_due = currentTotal - currentAdvance - paidAmount;

      // 8. Apply updates
      const { data: updated, error: updateError } = await supabase
        .from("invoices_enhanced")
        .update(updatedInvoice)
        .eq("id", invoice.id)
        .select()
        .single();

      if (updateError) {
        return {
          success: false,
          error: `Failed to update invoice: ${updateError.message}`,
        };
      }

      return {
        success: true,
        invoice: {
          invoiceNumber: invoiceNumber,
          issueDate: updated.issue_date,
          dueDate: updated.due_date,
          subtotal: formatINR(updated.subtotal),
          taxAmount: formatINR(updated.tax_amount),
          totalAmount: formatINR(updated.total_amount),
          advancePaid: formatINR(updated.advance_paid),
          balanceDue: formatINR(updated.balance_due),
          status: updated.status,
        },
        message: `Invoice ${invoiceNumber} updated successfully. New total: ${formatINR(
          updated.total_amount
        )}, Balance Due: ${formatINR(updated.balance_due)}`,
      };
    } catch (error) {
      console.error("❌ Update invoice error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
// ============================================================================
// TOOL 8: Show Split Invoice Tool
// ============================================================================

export const showSplitInvoiceTool = tool({
  description:
    "Show a UI to split an existing invoice into two separate invoices. Use this when the user wants to divide items from one invoice into multiple invoices.",
  inputSchema: z.object({
    invoiceNumber: z
      .string()
      .describe("The invoice number to split (e.g., INV-2025-001)"),
  }),
  execute: async ({ invoiceNumber }) => {
    try {
      // 1. Get invoice details
      const { data: invoice, error: invError } = await supabase
        .from("invoices_enhanced")
        .select("id, invoice_number, client_name, project_name")
        .eq("invoice_number", invoiceNumber)
        .single();

      if (invError || !invoice) {
        return {
          success: false,
          error: `Invoice ${invoiceNumber} not found.`,
        };
      }

      // 2. Get invoice items
      const { data: items, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoice.id);

      if (itemsError) {
        return {
          success: false,
          error: `Failed to fetch items for invoice ${invoiceNumber}.`,
        };
      }

      if (!items || items.length < 2) {
        return {
          success: false,
          error: `Invoice ${invoiceNumber} has fewer than 2 items. Cannot split.`,
        };
      }

      // 3. Return data for UI
      return {
        success: true,
        showSplitUI: true,
        invoiceNumber: invoice.invoice_number,
        clientName: invoice.client_name,
        projectName: invoice.project_name,
        items: items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.unit_price,
          amount: item.total_price,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// ============================================================================
// TOOL 9: Split Invoice Tool
// ============================================================================

// Helper function for converting quotation to invoice
async function convertQuotationToInvoice(
  quotationNumber: string,
  dueDate?: string
) {
  // 1. Fetch Quotation
  const { data: quotation, error: qError } = await supabase
    .from("quotations")
    .select("*, clients(*), quotation_items(*), projects(*)")
    .eq("quotation_number", quotationNumber)
    .single();

  if (qError || !quotation) {
    throw new Error(`Quotation ${quotationNumber} not found`);
  }

  if (quotation.status !== "approved") {
    throw new Error(
      `Quotation ${quotationNumber} is not approved (Status: ${quotation.status})`
    );
  }

  // 2. Check if Invoice already exists
  const { data: existingInvoice } = await supabase
    .from("invoices_enhanced")
    .select("invoice_number")
    .eq("quotation_id", quotation.id)
    .maybeSingle();

  if (existingInvoice) {
    throw new Error(
      `Invoice ${existingInvoice.invoice_number} already exists for this quotation`
    );
  }

  // 3. Generate Invoice Number
  const nextInvoiceNumber = await getNextDocumentNumber("invoice");

  // 4. Calculate Due Date
  let finalDueDate = dueDate;
  if (!finalDueDate) {
    // Default to project deadline or 30 days
    if (quotation.projects?.deadline) {
      finalDueDate = quotation.projects.deadline;
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      finalDueDate = d.toISOString().split("T")[0];
    }
  }

  // 5. Create Invoice Record
  const { data: invoice, error: iError } = await supabase
    .from("invoices_enhanced")
    .insert({
      invoice_number: nextInvoiceNumber,
      client_id: quotation.client_id,
      project_id: quotation.project_id,
      quotation_id: quotation.id,
      issue_date: new Date().toISOString().split("T")[0],
      due_date: finalDueDate,
      total_amount: quotation.total_amount,
      status: "draft", // Start as draft
      notes: `Created from Quotation ${quotationNumber}`,
    })
    .select()
    .single();

  if (iError) {
    throw new Error(`Failed to create invoice: ${iError.message}`);
  }

  // 6. Copy Items
  if (quotation.quotation_items && quotation.quotation_items.length > 0) {
    const invoiceItemsToInsert = quotation.quotation_items.map((item: any) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      hsn_sac_code: item.hsn_sac_code,
      material: item.material,
      size: item.size,
      finish: item.finish,
      unit: item.unit,
      notes: item.notes,
      estimated_weight: item.estimated_weight,
      option_type: item.option_type,
    }));

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(invoiceItemsToInsert);

    if (itemsError) {
      console.error("Failed to copy items:", itemsError);
      // Don't fail the whole process, but warn
    }
  }

  // 7. Generate PDF
  const businessConfig = await getBusinessConfig();

  // Calculate subtotal
  const subtotal = (quotation.quotation_items || []).reduce(
    (sum: number, item: any) => sum + (item.total_price || 0),
    0
  );

  let gstBreakdown = {
    taxType: "none",
    cgstRate: 0,
    cgstAmount: 0,
    sgstRate: 0,
    sgstAmount: 0,
    igstRate: 0,
    igstAmount: 0,
    totalTax: 0,
  };

  if (quotation.is_gst_applicable) {
    gstBreakdown = calculateGST(
      subtotal,
      businessConfig.gstRate,
      businessConfig.stateCode,
      quotation.clients?.state_code
    );
  }

  const invoiceData: InvoiceData = {
    invoiceNumber: invoice.invoice_number,
    date: invoice.issue_date,
    dueDate: invoice.due_date,
    client: {
      name: quotation.clients?.name || "Unknown Client",
      address: quotation.clients?.address || "",
      phone: quotation.clients?.phone || "",
      gstin: quotation.clients?.gstin,
    },
    project: {
      name: quotation.projects?.name || "",
      type: quotation.projects?.project_type || "",
      deadline: quotation.projects?.deadline || "",
    },
    items: (quotation.quotation_items || []).map((item: any) => ({
      description: item.description,
      hsnSacCode: item.hsn_sac_code,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.unit_price,
      amount: item.total_price,
      material: item.material,
      size: item.size,
      finish: item.finish,
      notes: item.notes,
      estimatedWeight: item.estimated_weight,
      optionType: item.option_type,
    })),
    subtotal: subtotal,
    tax: gstBreakdown.totalTax,
    total: invoice.total_amount,
    advancePaid: 0,
    balanceDue: invoice.total_amount,
    terms: businessConfig.invoiceTerms || "",
    companySettings: {
      name: businessConfig.businessName,
      address: businessConfig.businessAddress || "",
      phone: businessConfig.businessPhone || "",
      email: businessConfig.businessEmail || "",
      gstin: businessConfig.gstin || "",
      bankDetails: businessConfig.bankDetails,
    },
  };

  const pdfBytes = await PDFGenerator.generateInvoice(invoiceData);
  const base64Pdf = btoa(String.fromCharCode(...pdfBytes));
  const pdfDataUrl = `data:application/pdf;base64,${base64Pdf}`;

  return {
    invoice,
    pdfDataUrl,
    itemCount: quotation.quotation_items?.length || 0,
  };
}

/**
 * TOOL 2: Convert Quotation to Invoice
 */
export const convertQuotationToInvoiceTool = tool({
  description:
    "Convert an approved quotation into an invoice. Copies all items and details.",
  inputSchema: z.object({
    quotationNumber: z
      .string()
      .describe("Quotation Number (e.g., QTN-2024-001)"),
    dueInDays: z.number().optional().describe("Days until due (default: 30)"),
  }),
  execute: async ({ quotationNumber, dueInDays }) => {
    try {
      let dueDate: string | undefined;
      if (dueInDays) {
        const d = new Date();
        d.setDate(d.getDate() + dueInDays);
        dueDate = d.toISOString().split("T")[0];
      }

      const result = await convertQuotationToInvoice(quotationNumber, dueDate);

      return {
        success: true,
        invoice: result.invoice,
        pdfDataUrl: result.pdfDataUrl,
        message: `✅ Invoice ${result.invoice.invoice_number} created from ${quotationNumber}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * TOOL: Create Invoice From Project
 */
export const createInvoiceFromProjectTool = tool({
  description:
    "Create an invoice for a project by finding its approved quotation.",
  inputSchema: z.object({
    projectId: z.string().describe("Project ID"),
  }),
  execute: async ({ projectId }) => {
    try {
      // Find the latest approved quotation for this project
      const { data: quotation, error } = await supabase
        .from("quotations")
        .select("quotation_number")
        .eq("project_id", projectId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !quotation) {
        return {
          success: false,
          error:
            "No approved quotation found for this project. Please create and approve a quotation first.",
        };
      }

      // Use the conversion logic
      const result = await convertQuotationToInvoice(
        quotation.quotation_number
      );

      return {
        success: true,
        invoice: result.invoice,
        pdfDataUrl: result.pdfDataUrl,
        message: `✅ Invoice ${result.invoice.invoice_number} created from Project (Quotation ${quotation.quotation_number})`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create invoice from project",
      };
    }
  },
});

export const splitInvoiceTool = tool({
  description:
    "Execute the split of an invoice into two new invoices based on selected items. This cancels the original invoice and creates two new ones.",
  inputSchema: z.object({
    originalInvoiceNumber: z.string(),
    selectedItemIds: z.array(z.string()),
    splitStrategy: z.enum(["create_two_new"]).default("create_two_new"),
    groupAGstStatus: z
      .boolean()
      .optional()
      .describe("Apply GST to the first new invoice (selected items)"),
    groupBGstStatus: z
      .boolean()
      .optional()
      .describe("Apply GST to the second new invoice (remaining items)"),
  }),
  execute: async ({
    originalInvoiceNumber,
    selectedItemIds,
    groupAGstStatus,
    groupBGstStatus,
  }) => {
    try {
      console.log(`✂️ Splitting Invoice ${originalInvoiceNumber}`);

      // 1. Fetch Original Invoice
      const { data: original, error: origError } = await supabase
        .from("invoices_enhanced")
        .select("*")
        .eq("invoice_number", originalInvoiceNumber)
        .single();

      if (origError || !original) {
        return { success: false, error: "Original invoice not found" };
      }

      // 2. Fetch Items
      const { data: allItems, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", original.id);

      if (itemsError || !allItems) {
        return { success: false, error: "Failed to fetch invoice items" };
      }

      // 3. Separate Items
      const groupAItems = allItems.filter((item) =>
        selectedItemIds.includes(item.id)
      );
      const groupBItems = allItems.filter(
        (item) => !selectedItemIds.includes(item.id)
      );

      if (groupAItems.length === 0 || groupBItems.length === 0) {
        return {
          success: false,
          error: "Cannot split: One of the resulting invoices would be empty.",
        };
      }

      // Fetch Client and Project details for PDF
      // We need to fetch the project to get the client details properly if not fully available in invoice
      // But invoice_enhanced usually has client_name. For full details we might need to query.
      // Let's query project and client to be safe.
      let projectData = null;
      let clientData = null;

      if (original.project_id) {
        const { data: project } = await supabase
          .from("projects")
          .select("*, clients(*)")
          .eq("id", original.project_id)
          .single();
        projectData = project;
        clientData = project?.clients;
      } else if (original.client_id) {
        const { data: client } = await supabase
          .from("clients")
          .select("*")
          .eq("id", original.client_id)
          .single();
        clientData = client;
      }

      const config = await getBusinessConfig();

      // 4. Helper to create a new invoice
      const createSplitInvoice = async (
        partLabel: string,
        items: any[],
        applyGst: boolean
      ): Promise<{
        number: string;
        total: string;
        itemCount: number;
        pdfDataUrl: string;
        items: any[];
      }> => {
        // Generate a completely new invoice number
        const newNumber = await getNextDocumentNumber("invoice");

        // Calculate totals
        const subtotal = items.reduce((sum, i) => sum + i.total_price, 0);

        // Recalculate Tax
        const config = await getBusinessConfig();
        let gstBreakdown = {
          taxType: "none",
          cgstRate: 0,
          cgstAmount: 0,
          sgstRate: 0,
          sgstAmount: 0,
          igstRate: 0,
          igstAmount: 0,
          totalTax: 0,
        };

        if (applyGst) {
          // Quick fetch of client state
          let clientState = config.stateCode; // Default to local
          if (original.place_of_supply) {
            clientState = original.place_of_supply;
          }

          gstBreakdown = calculateGST(
            subtotal,
            config.gstRate,
            config.stateCode,
            clientState
          );
        }

        const totalAmount = subtotal + gstBreakdown.totalTax;

        // Insert Invoice
        const { data: newInv, error: newInvError } = await supabase
          .from("invoices_enhanced")
          .insert({
            ...original, // Copy most fields
            id: undefined, // New ID
            created_at: undefined,
            invoice_number: newNumber,
            subtotal: subtotal,
            tax_amount: gstBreakdown.totalTax,
            total_amount: totalAmount,
            balance_due: totalAmount, // Reset payments
            advance_paid: 0, // Reset advance
            paid_amount: 0,
            status: "draft", // Start as draft
            notes: `Split from ${original.invoice_number} (Part ${partLabel})`,
            cgst_amount: gstBreakdown.cgstAmount,
            sgst_amount: gstBreakdown.sgstAmount,
            igst_amount: gstBreakdown.igstAmount,
            is_gst_applicable: applyGst,
          })
          .select()
          .single();
        if (newInvError) throw new Error(newInvError.message);

        // Insert Items
        const newItems = items.map((item) => {
          const { id, created_at, invoice_id, ...rest } = item;
          return {
            ...rest,
            invoice_id: newInv.id,
          };
        });

        const { error: insertError } = await supabase
          .from("invoice_items")
          .insert(newItems);

        if (insertError) throw insertError;

        // Generate PDF
        const invoiceData: InvoiceData = {
          invoiceNumber: newNumber,
          date: new Date().toISOString().split("T")[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], // Default 30 days
          client: {
            name: clientData?.name || original.client_name || "Unknown Client",
            address: clientData?.address || "",
            phone: clientData?.phone || "",
          },
          project: {
            name: projectData?.name || original.project_name || "",
            type: "Sculpture",
            deadline: "",
          },
          items: items.map((item) => ({
            description: item.description,
            hsnSacCode: item.hsn_sac_code,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.unit_price,
            amount: item.total_price,
            material: item.material,
            size: item.size,
            finish: item.finish,
            notes: item.notes,
            estimatedWeight: item.estimated_weight,
            optionType: item.option_type,
          })),
          subtotal: subtotal,
          tax: gstBreakdown.totalTax,
          total: totalAmount,
          advancePaid: 0,
          balanceDue: totalAmount,
          terms: config.invoiceTerms || "",
          companySettings: {
            name: config.businessName,
            address: config.businessAddress || "",
            phone: config.businessPhone || "",
            email: config.businessEmail || "",
            gstin: config.gstin || "",
            bankDetails: config.bankDetails,
          },
        };

        const pdfBytes = await PDFGenerator.generateInvoice(invoiceData);
        const base64Pdf = btoa(String.fromCharCode(...pdfBytes));
        const pdfDataUrl = `data:application/pdf;base64,${base64Pdf}`;

        return {
          number: newNumber,
          total: formatINR(totalAmount),
          itemCount: items.length,
          pdfDataUrl,
          items: items.map((i: any) => ({
            description: i.description,
            amount: formatINR(i.total_price),
            material: i.material,
            size: i.size,
            finish: i.finish,
            quantity: i.quantity,
            unit: i.unit,
          })),
        };
      };

      // 5. Create the two new invoices
      // Note: Since we are awaiting inside, we should do them sequentially or ensure getNextDocumentNumber handles concurrency
      // Ideally getNextDocumentNumber should be atomic or we lock.
      // For now, sequential execution is safer to avoid duplicate numbers if the function isn't perfectly atomic.
      const invoiceA = await createSplitInvoice(
        "A",
        groupAItems,
        groupAGstStatus !== undefined
          ? groupAGstStatus
          : original.is_gst_applicable
      );
      const invoiceB = await createSplitInvoice(
        "B",
        groupBItems,
        groupBGstStatus !== undefined
          ? groupBGstStatus
          : original.is_gst_applicable
      );

      // 6. Cancel Original Invoice
      await supabase
        .from("invoices_enhanced")
        .update({
          status: "cancelled",
          notes: `${original.notes || ""} [Split into ${invoiceA.number} & ${
            invoiceB.number
          }]`,
        })
        .eq("id", original.id);

      return {
        success: true,
        originalInvoice: originalInvoiceNumber,
        partA: invoiceA,
        partB: invoiceB,
        message: `Successfully split ${originalInvoiceNumber} into ${invoiceA.number} and ${invoiceB.number}.`,
      };
    } catch (error: any) {
      console.error("Split Invoice Error:", error);
      return {
        success: false,
        error:
          error?.message ||
          (typeof error === "string"
            ? error
            : "Unknown error splitting invoice"),
      };
    }
  },
});

// ============================================================================
// TOOL 10: Show Combine Invoice Tool
// ============================================================================

export const showCombineInvoiceTool = tool({
  description:
    "Show a UI to combine multiple existing invoices into a single new invoice. Use this when the user wants to merge invoices.",
  inputSchema: z.object({
    invoiceNumbers: z
      .array(z.string())
      .describe(
        "Array of invoice numbers to combine (e.g., ['INV-001', 'INV-002'])"
      ),
  }),
  execute: async ({ invoiceNumbers }) => {
    try {
      if (invoiceNumbers.length < 2) {
        return {
          success: false,
          error: "At least two invoices are required to combine.",
        };
      }

      // 1. Fetch all invoices
      const { data: invoices, error: invError } = await supabase
        .from("invoices_enhanced")
        .select("*, invoice_items(*)")
        .in("invoice_number", invoiceNumbers);

      if (invError || !invoices || invoices.length !== invoiceNumbers.length) {
        return {
          success: false,
          error: "Could not find all specified invoices.",
        };
      }

      // 2. Validate Client/Project consistency
      // Note: invoices_enhanced has client_name and project_name, but we should check IDs if available or names
      // Assuming client_name is consistent.
      const firstClientName = invoices[0].client_name;
      const firstProjectName = invoices[0].project_name;

      const isConsistent = invoices.every(
        (inv) =>
          inv.client_name === firstClientName &&
          inv.project_name === firstProjectName
      );

      if (!isConsistent) {
        return {
          success: false,
          error: "All invoices must belong to the same client and project.",
        };
      }

      // 3. Calculate Preview Total
      const totalAmount = invoices.reduce(
        (sum, inv) => sum + (inv.total_amount || 0),
        0
      );

      // 4. Prepare Response
      return {
        success: true,
        showCombineUI: true,
        clientName: firstClientName || "Unknown Client",
        projectName: firstProjectName,
        previewTotal: formatINR(totalAmount),
        invoices: invoices.map((inv) => ({
          invoiceNumber: inv.invoice_number,
          totalAmount: formatINR(inv.total_amount),
          itemCount: inv.invoice_items.length,
          date: new Date(inv.created_at).toLocaleDateString("en-IN"),
        })),
      };
    } catch (error) {
      console.error("❌ Show combine invoice error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// ============================================================================
// TOOL 11: Combine Invoice Tool
// ============================================================================

export const combineInvoiceTool = tool({
  description:
    "Execute the merge of multiple invoices into a single new invoice. The original invoices are cancelled.",
  inputSchema: z.object({
    invoiceNumbers: z
      .array(z.string())
      .describe("Array of invoice numbers to combine"),
  }),
  execute: async ({ invoiceNumbers }) => {
    try {
      console.log(`🔄 Combining invoices:`, invoiceNumbers);

      // 1. Fetch original invoices with items
      const { data: originals, error: invError } = await supabase
        .from("invoices_enhanced")
        .select("*, invoice_items(*)")
        .in("invoice_number", invoiceNumbers);

      if (invError || !originals || originals.length === 0) {
        return {
          success: false,
          error: "Failed to fetch invoices to combine.",
        };
      }

      // 2. Aggregate Items
      const allItems = originals.flatMap((inv) => inv.invoice_items);

      // 3. Calculate New Totals
      const subtotal = allItems.reduce(
        (sum, item) => sum + (item.total_price || 0),
        0
      );
      const config = await getBusinessConfig();

      const firstInv = originals[0];
      let gstBreakdown = {
        taxType: "none",
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate: 0,
        igstAmount: 0,
        totalTax: 0,
      };

      if (firstInv.is_gst_applicable) {
        // Try to get client state from place_of_supply or config
        let clientState = config.stateCode;
        if (firstInv.place_of_supply) {
          clientState = firstInv.place_of_supply;
        }

        gstBreakdown = calculateGST(
          subtotal,
          config.gstRate,
          config.stateCode,
          clientState
        );
      }

      const totalAmount = subtotal + gstBreakdown.totalTax;

      // 4. Create New Invoice
      const newNumber = await getNextDocumentNumber("invoice");

      const { data: newInv, error: createError } = await supabase
        .from("invoices_enhanced")
        .insert({
          ...firstInv, // Copy basic fields from first invoice
          id: undefined,
          invoice_number: newNumber,
          created_at: undefined,
          subtotal: subtotal,
          tax_amount: gstBreakdown.totalTax,
          total_amount: totalAmount,
          balance_due: totalAmount,
          advance_paid: 0,
          paid_amount: 0,
          status: "draft",
          notes: `Combined from ${invoiceNumbers.join(", ")}.`,
          cgst_amount: gstBreakdown.cgstAmount,
          sgst_amount: gstBreakdown.sgstAmount,
          igst_amount: gstBreakdown.igstAmount,
        })
        .select()
        .single();

      if (createError) throw createError;

      // 5. Insert Items
      const newItems = allItems.map((item) => ({
        invoice_id: newInv.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_price: item.total_price,
        // Omit id and created_at
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(newItems);

      if (itemsError) throw itemsError;

      // 6. Cancel Original Invoices
      await supabase
        .from("invoices_enhanced")
        .update({
          status: "cancelled",
          notes: `Merged into ${newNumber}.`,
        })
        .in(
          "id",
          originals.map((inv) => inv.id)
        );

      return {
        success: true,
        message: `Successfully combined ${invoiceNumbers.length} invoices into ${newNumber}.`,
        newInvoice: {
          number: newNumber,
          total: formatINR(totalAmount),
          itemCount: newItems.length,
        },
      };
    } catch (error) {
      console.error("❌ Combine invoice error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
