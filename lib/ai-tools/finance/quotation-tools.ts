import { tool } from "ai";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { PDFGenerator } from "@/lib/ai-tools/utilities/pdf-generator";

import {
  getBusinessConfig,
  calculateGST,
  getNextDocumentNumber,
  formatINR,
} from "./finance-helpers";

// ============================================================================
// TOOL 1: Generate Quotation
// ============================================================================

export const showQuotationFormTool = tool({
  description:
    "Display the interactive UI form to create a new quotation or edit an existing one. ALWAYS use this tool when the user wants to 'create' or 'edit' a quotation. Show the form first, do NOT ask for item details.",
  inputSchema: z.object({
    clientName: z
      .string()
      .optional()
      .describe("Client name (for new quotation)"),
    projectName: z.string().optional().describe("Project name (optional)"),
    quotationNumber: z
      .string()
      .optional()
      .describe("Quotation number to edit (e.g., QTN-2025-001)"),
  }),
  execute: async ({ clientName, projectName, quotationNumber }) => {
    try {
      const config = await getBusinessConfig();
      const gstRate = config.gstRate ?? 0;

      // EDIT MODE: Load existing quotation
      if (quotationNumber) {
        const { data: quotation, error: qError } = await supabase
          .from("quotations")
          .select("*")
          .eq("quotation_number", quotationNumber)
          .single();

        if (qError || !quotation) {
          return {
            success: false,
            error: `Quotation ${quotationNumber} not found`,
          };
        }

        // Load quotation items
        const { data: items, error: itemsError } = await supabase
          .from("quotation_items")
          .select("*")
          .eq("quotation_id", quotation.id);

        if (itemsError) {
          return {
            success: false,
            error: `Failed to load quotation items: ${itemsError.message}`,
          };
        }

        // Get client and project details
        const { data: client } = await supabase
          .from("clients")
          .select("name")
          .eq("id", quotation.client_id)
          .single();

        let projectNameResolved = null;
        if (quotation.project_id) {
          const { data: project } = await supabase
            .from("projects")
            .select("name")
            .eq("id", quotation.project_id)
            .single();
          if (project) projectNameResolved = project.name;
        }

        return {
          success: true,
          showForm: true,
          isEdit: true,
          quotationNumber,
          clientName: client?.name || "Unknown Client",
          projectName: projectNameResolved,
          gstRate,
          validUntilDays: quotation.valid_until
            ? Math.ceil(
                (new Date(quotation.valid_until).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24)
              )
            : 30,
          applyGST: quotation.is_gst_applicable || false,
          notes: quotation.notes || "",
          items: (items || []).map((item: any) => ({
            name: item.name || "",
            description: item.description || "",
            material: item.material || "",
            size: item.size || "",
            estimatedWeight: item.estimated_weight || undefined,
            finish: item.finish || "",
            optionType: item.option_type || "",
            quantity: item.quantity || 1,
            unit: item.unit || "nos",
            rate: item.unit_cost || 0,
            notes: item.notes || "",
            hsnSacCode: item.hsn_sac_code || "",
          })),
        };
      }

      // CREATE MODE: Get or create client
      if (!clientName) {
        return {
          success: false,
          error: "Please provide either a client name or quotation number",
        };
      }

      const { getOrCreateClient } = await import(
        "@/lib/ai-tools/utilities/workflow-helpers"
      );
      const clientResult = await getOrCreateClient(clientName);

      if (!clientResult.success) {
        return {
          success: false,
          error: clientResult.error || "Failed to get or create client",
        };
      }

      const resolvedClientName = clientResult.clientName!;
      const clientWasCreated = clientResult.created || false;

      return {
        success: true,
        showForm: true,
        isEdit: false,
        clientName: resolvedClientName,
        projectName,
        gstRate,
        clientCreated: clientWasCreated,
      };
    } catch (err) {
      console.error("❌ showQuotationFormTool unexpected error:", err);
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Unknown error in showQuotationFormTool",
      };
    }
  },
});

export const generateQuotationTool = tool({
  description:
    "Generate a professionally formatted quotation with line items, GST calculation, and auto-generated quotation number. Use when: User provides ALL item details directly (name, quantity, rate, etc.) in their message. If user says 'create quotation' WITHOUT item details, use showQuotationFormTool instead. Examples: 'create quotation for ABC Corp with item: Chair @ 5000 x 10', 'generate quote with paint work 50000'.",
  inputSchema: z.object({
    clientName: z.string().describe("Client name (required)"),
    projectName: z.string().optional().describe("Project name (optional)"),
    items: z
      .array(
        z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          hsnSacCode: z.string().optional(),
          quantity: z.number().positive().optional(),
          estimatedWeight: z.number().positive().optional(),
          unit: z
            .string()
            .default("nos")
            .describe("Unit of measurement (nos, kg, hours, etc)"),
          rate: z.number().positive().describe("Rate per unit in INR"),
          notes: z.string().optional(),
          material: z.string().optional(),
          size: z.string().optional(),
          finish: z.string().optional(),
          optionType: z.string().optional(),
        })
      )
      .min(1)
      .describe("Array of line items for the quotation"),
    validUntilDays: z
      .number()
      .default(30)
      .describe("Days the quotation is valid (default 30)"),
    applyGST: z.boolean().default(false).describe("Whether to apply GST"),
    notes: z.string().optional().describe("Additional notes for the quotation"),
  }),
  execute: async ({
    clientName,
    projectName,
    items,
    validUntilDays,
    applyGST,
    notes,
  }) => {
    try {
      // 1. Get business config
      const config = await getBusinessConfig();

      // 2. Get or create CLIENT (intelligent workflow)
      const { getOrCreateClient } = await import(
        "@/lib/ai-tools/utilities/workflow-helpers"
      );
      const clientResult = await getOrCreateClient(clientName);

      if (!clientResult.success) {
        return {
          success: false,
          error: clientResult.error || "Failed to get or create client",
        };
      }

      const clientId = clientResult.clientId!;
      const resolvedClientName = clientResult.clientName!;
      const clientWasCreated = clientResult.created || false;

      // Fetch full client details for state code and PDF
      const { data: clientData } = await supabase
        .from("clients")
        .select("state_code, address, phone")
        .eq("id", clientId)
        .single();

      const clientStateCode = clientData?.state_code ?? config.stateCode;

      // 3. OPTIONAL: Find PROJECT
      let projectId = null;
      let projectName_resolved = null;
      if (projectName) {
        const { data: projectData } = await supabase
          .from("projects")
          .select("*")
          .ilike("name", `%${projectName}%`)
          .maybeSingle();
        if (projectData) {
          projectId = projectData.id;
          projectName_resolved = projectData.name;
        }
      }

      // 4. Calculate line item totals
      const lineItems = items.map((item) => {
        // Prefer weight if present, otherwise quantity
        const qtyOrWeight =
          typeof item.estimatedWeight === "number" && item.estimatedWeight > 0
            ? item.estimatedWeight
            : typeof item.quantity === "number"
            ? item.quantity
            : 1;
        return {
          ...item,
          displayDescription:
            item.name ||
            item.description ||
            `${qtyOrWeight} ${item.unit || ""} @ ₹${item.rate}`,
          calcQuantity: qtyOrWeight,
          amount: Math.round(qtyOrWeight * item.rate * 100) / 100,
        };
      });
      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

      // 5. Calculate GST if applicable
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
          clientStateCode
        );
      }
      const totalAmount = subtotal + gstBreakdown.totalTax;

      // 5.5 Idempotency Check: Prevent duplicate quotations
      // Check for a quotation created in the last 2 minutes with the same client, project, and total amount
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      let idempotencyQuery = supabase
        .from("quotations")
        .select("*")
        .eq("client_id", clientId)
        .eq("total_amount", totalAmount)
        .gte("created_at", twoMinutesAgo)
        .order("created_at", { ascending: false })
        .limit(1);

      if (projectId) {
        idempotencyQuery = idempotencyQuery.eq("project_id", projectId);
      }

      const { data: existingQuotations } = await idempotencyQuery;

      if (existingQuotations && existingQuotations.length > 0) {
        const existing = existingQuotations[0];
        console.log(
          "🔄 Idempotency check: Found existing quotation",
          existing.quotation_number
        );

        // Fetch existing items separately
        const { data: existingItems } = await supabase
          .from("quotation_items")
          .select("*")
          .eq("quotation_id", existing.id);
        const quotationData = {
          quotationNumber: existing.quotation_number,
          date: new Date(existing.created_at).toISOString().split("T")[0],
          validUntil: new Date(existing.valid_until)
            .toISOString()
            .split("T")[0],
          client: {
            name: resolvedClientName,
            address: clientData?.address || "",
            phone: clientData?.phone || "",
          },
          project: {
            name: projectName_resolved || "",
            type: "Sculpture",
            deadline: new Date(existing.valid_until)
              .toISOString()
              .split("T")[0],
          },
          items: lineItems.map((item) => ({
            name: item.name || "",
            description: item.displayDescription || item.description || "",
            quantity: item.quantity || 1,
            unit: item.unit || "",
            rate: item.rate || 0,
            total: item.amount || 0,
            material: item.material || "",
            size: item.size || "",
            finish: item.finish || "",
            notes: item.notes || "",
            hsnSacCode: item.hsnSacCode || "",
            optionType: item.optionType || "",
            estimatedWeight: item.estimatedWeight || 0,
          })),
          subtotal: existing.subtotal,
          tax: existing.tax_amount,
          total: existing.total_amount,
          terms: config.quotationTerms || "",
          companySettings: {
            name: config.businessName,
            address: config.businessAddress || "",
            phone: config.businessPhone || "",
            email: config.businessEmail || "",
            gstin: config.gstin || "",
            bankDetails: config.bankDetails,
          },
        };

        const pdfBytes = await PDFGenerator.generateQuotation(quotationData);
        const base64Pdf = btoa(String.fromCharCode(...pdfBytes));
        const pdfDataUrl = `data:application/pdf;base64,${base64Pdf}`;

        return {
          success: true,
          quotation: {
            id: existing.id,
            quotationNumber: existing.quotation_number,
            projectName: projectName_resolved || "No project",
            clientName: resolvedClientName,
            subtotal: formatINR(existing.subtotal),
            taxType: existing.tax_type,
            taxAmount: formatINR(existing.tax_amount),
            totalAmount: formatINR(existing.total_amount),
            validUntil: new Date(existing.valid_until)
              .toISOString()
              .split("T")[0],
            itemCount: existingItems?.length || 0,
            status: existing.status,
            pdfDataUrl,
            clientCreated: false,
          },
          message: `✅ Found existing quotation ${existing.quotation_number} created just now. (Prevented duplicate)`,
        };
      }

      // 6. Generate quotation number
      const quotationNumber = await getNextDocumentNumber("quotation");

      // 7. Calculate validity
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + validUntilDays);

      // 8. Insert quotation
      const { data: quotation, error: quotationError } = await supabase
        .from("quotations")
        .insert({
          project_id: projectId,
          client_id: clientId,
          quotation_number: quotationNumber,
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
          is_gst_applicable: applyGST,
          tax_type: gstBreakdown.taxType,
          status: "generated",
          valid_until: validUntil.toISOString(),
          notes: notes || null,
          terms_and_conditions: config.quotationTerms,
        })
        .select()
        .single();
      if (quotationError) {
        return {
          success: false,
          error: `Failed to create quotation: ${quotationError.message}`,
        };
      }

      // 9. Insert real quotation items
      const quotationItems = lineItems.map((item) => ({
        quotation_id: quotation.id,
        name: item.name || item.displayDescription,
        description: item.description || item.displayDescription,
        hsn_sac_code: item.hsnSacCode || null,
        quantity: item.quantity ?? 1,
        estimated_weight: item.estimatedWeight ?? null,
        unit: item.unit,
        unit_cost: item.rate,
        total: item.amount,
        notes: item.notes || null,
        material: item.material || null,
        size: item.size || null,
        finish: item.finish || null,
        option_type: item.optionType || null,
      }));
      const { error: itemsError } = await supabase
        .from("quotation_items")
        .insert(quotationItems);
      if (itemsError) {
        await supabase.from("quotations").delete().eq("id", quotation.id);
        return {
          success: false,
          error: `Failed to add quotation items: ${itemsError.message}`,
        };
      }

      // 10. Prepare PDF data using full line items
      const quotationData = {
        quotationNumber,
        date: new Date().toISOString().split("T")[0],
        validUntil: validUntil.toISOString().split("T")[0],
        client: {
          name: resolvedClientName,
          address: clientData?.address || "",
          phone: clientData?.phone || "",
        },
        project: {
          name: projectName_resolved || "",
          type: "Sculpture",
          deadline: validUntil.toISOString().split("T")[0],
        },
        items: lineItems.map((item) => ({
          name: item.name || "",
          description: item.displayDescription || item.description || "",
          quantity: item.quantity || 1,
          unit: item.unit || "",
          rate: item.rate || 0,
          total: item.amount || 0,
          material: item.material || "",
          size: item.size || "",
          finish: item.finish || "",
          notes: item.notes || "",
          hsnSacCode: item.hsnSacCode || "",
          optionType: item.optionType || "",
          estimatedWeight: item.estimatedWeight || 0,
        })),
        subtotal,
        tax: gstBreakdown.totalTax,
        total: totalAmount,
        terms: config.quotationTerms || "",
        companySettings: {
          name: config.businessName,
          address: config.businessAddress || "",
          phone: config.businessPhone || "",
          email: config.businessEmail || "",
          gstin: config.gstin || "",
          bankDetails: config.bankDetails,
        },
      };

      // 11. Generate PDF
      const pdfBytes = await PDFGenerator.generateQuotation(quotationData);
      const base64Pdf = btoa(String.fromCharCode(...pdfBytes));
      const pdfDataUrl = `data:application/pdf;base64,${base64Pdf}`;

      // Build success message
      let successMessage = projectId
        ? `✅ Quotation ${quotationNumber} created for project "${projectName_resolved}". Total: ${formatINR(
            totalAmount
          )}`
        : `✅ Quotation ${quotationNumber} created for client "${resolvedClientName}" (no project yet). Total: ${formatINR(
            totalAmount
          )}`;

      if (clientWasCreated) {
        successMessage += ` | 🆕 Created new client "${resolvedClientName}"`;
      }

      return {
        success: true,
        quotation: {
          id: quotation.id,
          quotationNumber,
          projectName: projectName_resolved || "No project (pre-approval)",
          clientName: resolvedClientName,
          subtotal: formatINR(subtotal),
          taxType: gstBreakdown.taxType,
          taxAmount: formatINR(gstBreakdown.totalTax),
          totalAmount: formatINR(totalAmount),
          validUntil: validUntil.toISOString().split("T")[0],
          itemCount: items.length,
          status: "generated",
          pdfDataUrl,
          clientCreated: clientWasCreated,
        },
        message: successMessage,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error generating quotation",
      };
    }
  },
});

export const listQuotationsTool = tool({
  description:
    "List all quotations with their line items and recalculated totals. Use when: User says 'list quotations', 'show quotes', 'all quotations'. Can filter by client name or ID. ALWAYS call this for fresh quotation data, never answer from memory. Examples: 'show all quotations', 'list quotations for ABC Corp', 'show me my quotes'.",
  inputSchema: z.object({
    clientId: z.string().optional(),
    clientName: z.string().optional(),
  }),
  execute: async (input) => {
    try {
      // 1. Build base query for quotations
      let query = supabase
        .from("quotations")
        .select(
          `
          *,
          clients:client_id (
            id,
            name,
            email,
            phone,
            address,
            state_code,
            gstin
          )
        `
        )
        .order("created_at", { ascending: false });

      // 2. Apply filters if provided
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
          return { success: true, quotations: [] };
        }
      }

      // 3. Fetch quotations
      const { data: quotations, error: quotationsError } = await query;
      if (quotationsError) {
        return { success: false, error: quotationsError.message };
      }

      if (!quotations || quotations.length === 0) {
        return { success: true, quotations: [] };
      }

      // 4. For each quotation, fetch its line items and recalculate totals
      const config = await getBusinessConfig();
      const enrichedQuotations = [];

      for (const quotation of quotations) {
        // Fetch line items for this quotation
        const { data: lineItems, error: itemsError } = await supabase
          .from("quotation_items")
          .select("*")
          .eq("quotation_id", quotation.id);

        if (itemsError) {
          console.error(
            `Error fetching items for quotation ${quotation.quotation_number}:`,
            itemsError
          );
          continue;
        }

        // Calculate subtotal from actual line items
        const subtotal = (lineItems || []).reduce(
          (sum, item) => sum + (parseFloat(item.total) || 0),
          0
        );

        // Recalculate GST if applicable
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
          const clientStateCode =
            (quotation.clients as any)?.state_code || config.stateCode;

          gstBreakdown = calculateGST(
            subtotal,
            config.gstRate,
            config.stateCode,
            clientStateCode
          );
        }

        const totalAmount = subtotal + gstBreakdown.totalTax;

        // Enrich quotation with live data
        enrichedQuotations.push({
          ...quotation,
          line_items: lineItems || [],
          live_subtotal: subtotal,
          live_tax_amount: gstBreakdown.totalTax,
          live_total_amount: totalAmount,
          live_tax_breakdown: gstBreakdown,
          client_name: (quotation.clients as any)?.name,
        });
      }

      return {
        success: true,
        quotations: enrichedQuotations,
        companySettings: {
          name: config.businessName,
          address: config.businessAddress || "",
          phone: config.businessPhone || "",
          email: config.businessEmail || "",
          gstin: config.gstin || "",
          bankDetails: config.bankDetails,
          nonGstBankDetails: config.nonGstBankDetails,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error listing quotations",
      };
    }
  },
});

// ============================================================================
// TOOL 2: Add Quotation Item
// ============================================================================

export const addQuotationItemTool = tool({
  description:
    "Add a new line item to an existing quotation and recalculate totals",
  inputSchema: z.object({
    quotationNumber: z
      .string()
      .describe("Quotation number (e.g., QTN-2025-001)"),
    description: z.string().describe("Item or service description"),
    hsnSacCode: z.string().optional().describe("HSN/SAC code"),
    quantity: z.number().positive().describe("Quantity"),
    unit: z.string().default("nos").describe("Unit of measurement"),
    rate: z.number().positive().describe("Rate per unit in INR"),
  }),
  execute: async ({
    quotationNumber,
    description,
    hsnSacCode,
    quantity,
    unit,
    rate,
  }) => {
    try {
      // 1. Find quotation
      const { data: quotation, error: quotationError } = await supabase
        .from("quotations")
        .select("*, clients:client_id(state)")
        .eq("quotation_number", quotationNumber)
        .single();

      if (quotationError || !quotation) {
        return {
          success: false,
          error: `Quotation ${quotationNumber} not found`,
        };
      }

      if (quotation.status === "accepted" || quotation.status === "rejected") {
        return {
          success: false,
          error: `Cannot modify quotation with status: ${quotation.status}`,
        };
      }

      // 2. Calculate new item total
      const itemAmount = quantity * rate;

      // 3. Insert new item
      const { error: insertError } = await supabase
        .from("quotation_items")
        .insert({
          quotation_id: quotation.id,
          name: description,
          description: description,
          hsn_sac_code: hsnSacCode || null,
          quantity: quantity,
          unit: unit,
          unit_cost: rate,
          total: itemAmount,
        });

      if (insertError) {
        return {
          success: false,
          error: `Failed to add item: ${insertError.message}`,
        };
      }

      // 4. Recalculate quotation totals
      const { data: allItems } = await supabase
        .from("quotation_items")
        .select("total")
        .eq("quotation_id", quotation.id);

      const newSubtotal = (allItems || []).reduce(
        (sum, item) => sum + (item.total || 0),
        0
      );

      // 5. Recalculate GST
      const config = await getBusinessConfig();
      const clientStateCode = (quotation.clients as any)?.state;

      let gstBreakdown = {
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
          newSubtotal,
          config.gstRate,
          config.stateCode,
          clientStateCode
        );
      }

      const newTotalAmount = newSubtotal + gstBreakdown.totalTax;

      // 6. Update quotation
      const { error: updateError } = await supabase
        .from("quotations")
        .update({
          subtotal: newSubtotal,
          tax_amount: gstBreakdown.totalTax,
          cgst_amount: gstBreakdown.cgstAmount,
          sgst_amount: gstBreakdown.sgstAmount,
          igst_amount: gstBreakdown.igstAmount,
          total_amount: newTotalAmount,
        })
        .eq("id", quotation.id);

      if (updateError) {
        return {
          success: false,
          error: `Failed to update quotation totals: ${updateError.message}`,
        };
      }

      return {
        success: true,
        quotation: {
          quotationNumber: quotationNumber,
          newSubtotal: formatINR(newSubtotal),
          newTotalAmount: formatINR(newTotalAmount),
          itemAdded: description,
        },
        message: `✅ Item added to quotation ${quotationNumber}. New total: ${formatINR(
          newTotalAmount
        )}`,
      };
    } catch (error) {
      console.error("Add quotation item error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error adding quotation item",
      };
    }
  },
});

// ============================================================================
// TOOL 3: Update Quotation Status
// ============================================================================

export const updateQuotationStatusTool = tool({
  description:
    "Update quotation status. Valid statuses: generated, rejected, invoiced",
  inputSchema: z.object({
    quotationNumber: z
      .string()
      .describe("Quotation number (e.g., QTN-2025-001)"),
    status: z
      .enum(["generated", "rejected", "invoiced"])
      .describe("New status"),
  }),
  execute: async ({ quotationNumber, status }) => {
    try {
      const { data, error } = await supabase
        .from("quotations")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("quotation_number", quotationNumber)
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
        quotation: {
          quotationNumber,
          status,
        },
        message: `Quotation ${quotationNumber} status updated to ${status}`,
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
// TOOL 4: Update Quotation Tool
// ============================================================================

export const updateQuotationTool = tool({
  description:
    "Update quotation items and recalculate totals. Use this when client requests price changes or item modifications before converting to invoice.",
  inputSchema: z.object({
    quotationNumber: z
      .string()
      .describe("Quotation number to update (e.g., QTN-2025-001)"),
    items: z
      .array(
        z.object({
          name: z.string().optional().describe("Item name"),
          description: z.string().describe("Item description"),
          quantity: z.number().positive(),
          rate: z.number().positive(),
          unit: z.string().default("nos"),
          material: z.string().optional(),
          size: z.string().optional(),
          estimatedWeight: z.number().optional(),
          finish: z.string().optional(),
          optionType: z.string().optional(),
          hsnSacCode: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .optional()
      .describe("New items to replace existing ones"),
    validUntilDays: z
      .number()
      .optional()
      .describe("Extend validity by this many days (from the quotation date)"),
    notes: z.string().optional().describe("Updated notes"),
    quotationDate: z
      .string()
      .optional()
      .describe("New quotation date (YYYY-MM-DD)"),
    applyGST: z.boolean().optional().describe("Whether to apply GST or not"),
  }),
  execute: async ({
    quotationNumber,
    items,
    validUntilDays,
    notes,
    quotationDate,
    applyGST,
  }) => {
    try {
      console.log("✏️ UPDATE QUOTATION:", quotationNumber);

      // 1. Find quotation
      const { data: quotation, error: quotationError } = await supabase
        .from("quotations")
        .select(
          `
          *,
          projects(id, name, client_id),
          clients:client_id(state_code)
        `
        )
        .eq("quotation_number", quotationNumber)
        .single();

      if (quotationError || !quotation) {
        return {
          success: false,
          error: `Quotation ${quotationNumber} not found`,
        };
      }

      // 2. Check if can be updated
      if (quotation.status === "rejected") {
        return {
          success: false,
          error: "Cannot update rejected quotation. Please create a new one.",
        };
      }

      if (quotation.status === "invoiced") {
        return {
          success: false,
          error:
            "Cannot update quotation that has been converted to invoice. Create a new quotation instead.",
        };
      }

      const config = await getBusinessConfig();
      let updatedQuotation: any = { updated_at: new Date().toISOString() };

      // 3. Update items if provided
      if (items && items.length > 0) {
        // Delete old items
        await supabase
          .from("quotation_items")
          .delete()
          .eq("quotation_id", quotation.id);

        // Calculate new totals
        const lineItems = items.map((item) => ({
          ...item,
          amount: item.quantity * item.rate,
        }));

        const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

        // Calculate GST
        const clientStateCode = (quotation.clients as any)?.state_code;
        // Use new applyGST if provided, otherwise use existing
        const shouldApplyGST =
          applyGST !== undefined ? applyGST : quotation.is_gst_applicable;

        const gstBreakdown = shouldApplyGST
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
        const quotationItems = lineItems.map((item) => ({
          quotation_id: quotation.id,
          name: item.name || item.description,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.rate,
          total: item.amount,
          material: item.material || null,
          size: item.size || null,
          estimated_weight: item.estimatedWeight || null,
          finish: item.finish || null,
          option_type: item.optionType || null,
          hsn_sac_code: item.hsnSacCode || null,
          notes: item.notes || null,
        }));

        const { error: itemsError } = await supabase
          .from("quotation_items")
          .insert(quotationItems);

        if (itemsError) {
          return {
            success: false,
            error: `Failed to update items: ${itemsError.message}`,
          };
        }

        // Update quotation totals
        updatedQuotation = {
          ...updatedQuotation,
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
          is_gst_applicable: shouldApplyGST,
        };
      } else if (applyGST !== undefined) {
        // If items aren't changing but GST setting is, recalculate totals
        const { data: currentItems } = await supabase
          .from("quotation_items")
          .select("*")
          .eq("quotation_id", quotation.id);

        if (currentItems && currentItems.length > 0) {
          const subtotal = currentItems.reduce(
            (sum, item) => sum + (item.total || 0),
            0
          );
          const clientStateCode = (quotation.clients as any)?.state_code;
          const gstBreakdown = applyGST
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

          updatedQuotation = {
            ...updatedQuotation,
            subtotal,
            tax_amount: gstBreakdown.totalTax,
            cgst_rate: gstBreakdown.cgstRate,
            cgst_amount: gstBreakdown.cgstAmount,
            sgst_rate: gstBreakdown.sgstRate,
            sgst_amount: gstBreakdown.sgstAmount,
            igst_rate: gstBreakdown.igstRate,
            igst_amount: gstBreakdown.igstAmount,
            total_amount: subtotal + gstBreakdown.totalTax,
            tax_type: gstBreakdown.taxType,
            is_gst_applicable: applyGST,
          };
        }
      }

      // 4. Update quotation date if provided
      let baseDate = new Date();
      if (quotationDate) {
        // Set time to noon to avoid timezone issues with pure dates
        const newDate = new Date(quotationDate);
        newDate.setHours(12, 0, 0, 0);
        updatedQuotation.created_at = newDate.toISOString();
        baseDate = newDate;
      } else {
        // If not updating date, use existing created_at for validity calculation base
        // unless we want "valid from today".
        // Usually "valid for 30 days" implies from the quotation date.
        baseDate = new Date(quotation.created_at);
      }

      // 5. Update validity if provided
      if (validUntilDays) {
        const newValidUntil = new Date(baseDate);
        newValidUntil.setDate(newValidUntil.getDate() + validUntilDays);
        updatedQuotation.valid_until = newValidUntil.toISOString();
      }

      // 6. Update notes if provided
      if (notes) {
        updatedQuotation.notes = notes;
      }

      // 7. Apply updates
      const { data: updated, error: updateError } = await supabase
        .from("quotations")
        .update(updatedQuotation)
        .eq("id", quotation.id)
        .select()
        .single();

      if (updateError) {
        return {
          success: false,
          error: `Failed to update quotation: ${updateError.message}`,
        };
      }

      return {
        success: true,
        quotation: {
          quotationNumber: quotationNumber,
          projectName: (quotation.projects as any)?.name,
          subtotal: formatINR(updated.subtotal),
          taxAmount: formatINR(updated.tax_amount),
          totalAmount: formatINR(updated.total_amount),
          validUntil: updated.valid_until,
          itemCount: items?.length || 0,
          status: updated.status,
        },
        message: `Quotation ${quotationNumber} updated successfully. New total: ${formatINR(
          updated.total_amount
        )}`,
      };
    } catch (error) {
      console.error("❌ Update quotation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// ============================================================================
// TOOL 5: Show Split Quotation Tool
// ============================================================================

export const showSplitQuotationTool = tool({
  description:
    "Show a UI to split an existing quotation into two separate quotations. Use this when the user wants to divide items from one quotation into multiple quotations.",
  inputSchema: z.object({
    quotationNumber: z
      .string()
      .describe("The quotation number to split (e.g., QTN-2025-001)"),
  }),
  execute: async ({ quotationNumber }) => {
    try {
      // 1. Get quotation details
      const { data: quotation, error: qError } = await supabase
        .from("quotations")
        .select("id, quotation_number, client_id, project_id")
        .eq("quotation_number", quotationNumber)
        .single();

      if (qError || !quotation) {
        return {
          success: false,
          error: `Quotation ${quotationNumber} not found.`,
        };
      }

      // Get client name
      const { data: client } = await supabase
        .from("clients")
        .select("name")
        .eq("id", quotation.client_id)
        .single();

      // Get project name
      let projectName = null;
      if (quotation.project_id) {
        const { data: project } = await supabase
          .from("projects")
          .select("name")
          .eq("id", quotation.project_id)
          .single();
        projectName = project?.name;
      }

      // 2. Get quotation items
      const { data: items, error: itemsError } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", quotation.id);

      if (itemsError) {
        return {
          success: false,
          error: `Failed to fetch items for quotation ${quotationNumber}.`,
        };
      }

      if (!items || items.length < 2) {
        return {
          success: false,
          error: `Quotation ${quotationNumber} has fewer than 2 items. Cannot split.`,
        };
      }

      // 3. Return data for UI
      return {
        success: true,
        showSplitUI: true,
        quotationNumber: quotation.quotation_number,
        clientName: client?.name || "Unknown Client",
        projectName: projectName,
        items: items.map((item) => ({
          id: item.id,
          description: item.description || item.name,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.unit_cost,
          amount: item.total,
        })),
      };
    } catch (error) {
      console.error("❌ Show split quotation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// ============================================================================
// TOOL 6: Split Quotation Tool
// ============================================================================

export const splitQuotationTool = tool({
  description:
    "Split a quotation into two new quotations based on selected items. The original quotation is cancelled/marked as split.",
  inputSchema: z.object({
    originalQuotationNumber: z.string().describe("Original quotation number"),
    splitItems: z
      .array(z.string())
      .describe("Array of item IDs to move to the NEW quotation (Part B)"),
  }),
  execute: async ({ originalQuotationNumber, splitItems }) => {
    try {
      console.log(
        `✂️ Splitting quotation ${originalQuotationNumber} with items:`,
        splitItems
      );

      // 1. Fetch original quotation
      const { data: original, error: qError } = await supabase
        .from("quotations")
        .select("*")
        .eq("quotation_number", originalQuotationNumber)
        .single();

      if (qError || !original) {
        return { success: false, error: "Original quotation not found" };
      }

      // 2. Fetch quotation items separately
      const { data: allItems, error: fetchItemsError } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", original.id);

      if (fetchItemsError || !allItems) {
        return { success: false, error: "Failed to fetch quotation items" };
      }
      const itemsForPartB = allItems.filter((item: any) =>
        splitItems.includes(item.id)
      );
      const itemsForPartA = allItems.filter(
        (item: any) => !splitItems.includes(item.id)
      );

      if (itemsForPartB.length === 0 || itemsForPartA.length === 0) {
        return {
          success: false,
          error: "Split must result in at least one item in each quotation.",
        };
      }

      // Fetch Client and Project details for PDF
      const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("id", original.client_id)
        .single();

      let projectData = null;
      if (original.project_id) {
        const { data: project } = await supabase
          .from("projects")
          .select("*")
          .eq("id", original.project_id)
          .single();
        projectData = project;
      }

      const config = await getBusinessConfig();

      // Helper to calculate totals
      const calculateTotals = async (items: any[]) => {
        const subtotal = items.reduce(
          (sum, item) => sum + (item.total || 0),
          0
        );
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

        if (original.is_gst_applicable) {
          // Fetch client state code
          const { data: client } = await supabase
            .from("clients")
            .select("state_code")
            .eq("id", original.client_id)
            .single();
          const clientStateCode = client?.state_code || config.stateCode;

          gstBreakdown = calculateGST(
            subtotal,
            config.gstRate,
            config.stateCode,
            clientStateCode
          );
        }

        return {
          subtotal,
          taxAmount: gstBreakdown.totalTax,
          totalAmount: subtotal + gstBreakdown.totalTax,
          gstBreakdown,
        };
      };

      const totalsA = await calculateTotals(itemsForPartA);
      const totalsB = await calculateTotals(itemsForPartB);

      // 2. Generate new quotation numbers
      // We'll append -A and -B to the original number for clarity, or generate new ones
      // Let's generate new sequential numbers to keep it clean, but reference the old one in notes
      const qNumA = await getNextDocumentNumber("quotation");
      const qNumB = await getNextDocumentNumber("quotation");

      // 3. Create Quotation A
      const createQuotation = async (
        qNum: string,
        totals: any,
        items: any[],
        partLabel: string
      ) => {
        const { data: newQ, error: createError } = await supabase
          .from("quotations")
          .insert({
            ...original,
            id: undefined, // Let DB generate ID
            quotation_number: qNum,
            created_at: new Date().toISOString(),
            subtotal: totals.subtotal,
            tax_amount: totals.taxAmount,
            total_amount: totals.totalAmount,
            cgst_amount: totals.gstBreakdown.cgstAmount,
            sgst_amount: totals.gstBreakdown.sgstAmount,
            igst_amount: totals.gstBreakdown.igstAmount,
            status: "generated",
            notes: `Split from ${originalQuotationNumber} (Part ${partLabel}). ${
              original.notes || ""
            }`,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Insert items
        // Insert items
        const newItems = items.map((item) => {
          const { id, created_at, quotation_id, ...rest } = item;
          return {
            ...rest,
            quotation_id: newQ.id,
          };
        });

        const { error: insertItemsError } = await supabase
          .from("quotation_items")
          .insert(newItems);

        if (insertItemsError) throw insertItemsError;

        // Generate PDF
        const quotationData = {
          quotationNumber: qNum,
          date: new Date().toISOString().split("T")[0],
          validUntil: new Date(original.valid_until)
            .toISOString()
            .split("T")[0],
          client: {
            name: clientData?.name || "Unknown Client",
            address: clientData?.address || "",
            phone: clientData?.phone || "",
          },
          project: {
            name: projectData?.name || "",
            type: "Sculpture",
            deadline: new Date(original.valid_until)
              .toISOString()
              .split("T")[0],
          },
          items: items.map((item) => ({
            name: item.name || "",
            description: item.description || "",
            quantity: item.quantity || 1,
            unit: item.unit || "",
            rate: item.unit_cost || 0,
            total: item.total || 0,
            material: item.material,
            size: item.size,
            finish: item.finish,
            notes: item.notes,
            hsnSacCode: item.hsn_sac_code,
            estimatedWeight: item.estimated_weight,
            optionType: item.option_type,
          })),
          subtotal: totals.subtotal,
          tax: totals.taxAmount,
          total: totals.totalAmount,
          terms: config.quotationTerms || "",
          companySettings: {
            name: config.businessName,
            address: config.businessAddress || "",
            phone: config.businessPhone || "",
            email: config.businessEmail || "",
            gstin: config.gstin || "",
            bankDetails: config.bankDetails,
          },
        };

        const pdfBytes = await PDFGenerator.generateQuotation(quotationData);
        const base64Pdf = btoa(String.fromCharCode(...pdfBytes));
        const pdfDataUrl = `data:application/pdf;base64,${base64Pdf}`;

        return { ...newQ, pdfDataUrl, items };
      };

      const quoteA = await createQuotation(qNumA, totalsA, itemsForPartA, "A");
      const quoteB = await createQuotation(qNumB, totalsB, itemsForPartB, "B");

      // 4. Cancel original quotation
      await supabase
        .from("quotations")
        .update({
          status: "rejected", // Or a specific 'split' status if available, but 'rejected' or 'cancelled' is safer
          notes: `Split into ${qNumA} and ${qNumB}. ${original.notes || ""}`,
        })
        .eq("id", original.id);

      return {
        success: true,
        originalQuotation: originalQuotationNumber,
        newQuotations: [
          {
            number: qNumA,
            total: formatINR(totalsA.totalAmount),
            pdfDataUrl: quoteA.pdfDataUrl,
            items: quoteA.items.map((i: any) => ({
              description: i.description,
              amount: formatINR(i.total),
              material: i.material,
              size: i.size,
              finish: i.finish,
              quantity: i.quantity,
              unit: i.unit,
            })),
          },
          {
            number: qNumB,
            total: formatINR(totalsB.totalAmount),
            pdfDataUrl: quoteB.pdfDataUrl,
            items: quoteB.items.map((i: any) => ({
              description: i.description,
              amount: formatINR(i.total),
              material: i.material,
              size: i.size,
              finish: i.finish,
              quantity: i.quantity,
              unit: i.unit,
            })),
          },
        ],
        message: `Successfully split ${originalQuotationNumber} into ${qNumA} and ${qNumB}.`,
      };
    } catch (error: any) {
      console.error("❌ Split quotation error:", error);
      return {
        success: false,
        error:
          error?.message ||
          (typeof error === "string"
            ? error
            : "Unknown error splitting quotation"),
      };
    }
  },
});

// ============================================================================
// TOOL 7: Show Combine Quotation Tool
// ============================================================================

export const showCombineQuotationTool = tool({
  description:
    "Show a UI to combine multiple existing quotations into a single new quotation. Use this when the user wants to merge quotations.",
  inputSchema: z.object({
    quotationNumbers: z
      .array(z.string())
      .describe(
        "Array of quotation numbers to combine (e.g., ['QTN-001', 'QTN-002'])"
      ),
  }),
  execute: async ({ quotationNumbers }) => {
    try {
      if (quotationNumbers.length < 2) {
        return {
          success: false,
          error: "At least two quotations are required to combine.",
        };
      }

      // 1. Fetch all quotations
      const { data: quotations, error: qError } = await supabase
        .from("quotations")
        .select("*")
        .in("quotation_number", quotationNumbers);

      if (
        qError ||
        !quotations ||
        quotations.length !== quotationNumbers.length
      ) {
        return {
          success: false,
          error: "Could not find all specified quotations.",
        };
      }

      // 2. Validate Client/Project consistency
      const firstClientId = quotations[0].client_id;
      const firstProjectId = quotations[0].project_id;

      const isConsistent = quotations.every(
        (q) => q.client_id === firstClientId && q.project_id === firstProjectId
      );

      if (!isConsistent) {
        return {
          success: false,
          error: "All quotations must belong to the same client and project.",
        };
      }

      // 3. Get Client & Project Names
      const { data: client } = await supabase
        .from("clients")
        .select("name")
        .eq("id", firstClientId)
        .single();

      let projectName = null;
      if (firstProjectId) {
        const { data: project } = await supabase
          .from("projects")
          .select("name")
          .eq("id", firstProjectId)
          .single();
        projectName = project?.name;
      }

      // 4. Calculate Preview Total
      const totalAmount = quotations.reduce(
        (sum, q) => sum + (q.total_amount || 0),
        0
      );

      // 5. Prepare Response
      return {
        success: true,
        showCombineUI: true,
        clientName: client?.name || "Unknown Client",
        projectName: projectName,
        previewTotal: formatINR(totalAmount),
        quotations: quotations.map((q) => ({
          quotationNumber: q.quotation_number,
          totalAmount: formatINR(q.total_amount),
          itemCount: q.quotation_items.length,
          date: new Date(q.created_at).toLocaleDateString("en-IN"),
        })),
      };
    } catch (error) {
      console.error("❌ Show combine quotation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// ============================================================================
// TOOL 8: Combine Quotation Tool
// ============================================================================

export const combineQuotationTool = tool({
  description:
    "Execute the merge of multiple quotations into a single new quotation. The original quotations are cancelled.",
  inputSchema: z.object({
    quotationNumbers: z
      .array(z.string())
      .describe("Array of quotation numbers to combine"),
  }),
  execute: async ({ quotationNumbers }) => {
    try {
      console.log(`🔄 Combining quotations:`, quotationNumbers);

      // 1. Fetch original quotations
      const { data: originals, error: qError } = await supabase
        .from("quotations")
        .select("*")
        .in("quotation_number", quotationNumbers);

      if (qError || !originals || originals.length === 0) {
        return {
          success: false,
          error: "Failed to fetch quotations to combine.",
        };
      }

      // 2. Fetch all items for these quotations
      const quotationIds = originals.map((q) => q.id);
      const { data: allItemsData, error: fetchItemsError } = await supabase
        .from("quotation_items")
        .select("*")
        .in("quotation_id", quotationIds);

      if (fetchItemsError) {
        return {
          success: false,
          error: "Failed to fetch quotation items.",
        };
      }

      const allItems = allItemsData || [];

      // 3. Calculate New Totals
      const subtotal = allItems.reduce(
        (sum, item) => sum + (item.total || 0),
        0
      );
      const config = await getBusinessConfig();

      // Use the first quotation's client info for tax calculation
      const firstQ = originals[0];
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

      if (firstQ.is_gst_applicable) {
        const { data: client } = await supabase
          .from("clients")
          .select("state_code")
          .eq("id", firstQ.client_id)
          .single();
        const clientStateCode = client?.state_code || config.stateCode;

        gstBreakdown = calculateGST(
          subtotal,
          config.gstRate,
          config.stateCode,
          clientStateCode
        );
      }

      const totalAmount = subtotal + gstBreakdown.totalTax;

      // 4. Create New Quotation
      const newNumber = await getNextDocumentNumber("quotation");

      const { data: newQ, error: createError } = await supabase
        .from("quotations")
        .insert({
          client_id: firstQ.client_id,
          project_id: firstQ.project_id,
          quotation_number: newNumber,
          created_at: new Date().toISOString(),
          valid_until: firstQ.valid_until, // Use validity of first quote or default?
          subtotal: subtotal,
          tax_amount: gstBreakdown.totalTax,
          total_amount: totalAmount,
          cgst_amount: gstBreakdown.cgstAmount,
          sgst_amount: gstBreakdown.sgstAmount,
          igst_amount: gstBreakdown.igstAmount,
          is_gst_applicable: firstQ.is_gst_applicable,
          status: "generated",
          notes: `Combined from ${quotationNumbers.join(", ")}.`,
        })
        .select()
        .single();

      if (createError) throw createError;

      // 5. Insert Items
      // 5. Insert Items
      const newItems = allItems.map((item) => {
        const { id, created_at, quotation_id, ...rest } = item;
        return {
          ...rest,
          quotation_id: newQ.id,
        };
      });

      const { error: insertItemsError } = await supabase
        .from("quotation_items")
        .insert(newItems);

      if (insertItemsError) throw insertItemsError;

      // 6. Cancel Original Quotations
      await supabase
        .from("quotations")
        .update({
          status: "rejected", // or 'merged' if available
          notes: `Merged into ${newNumber}.`,
        })
        .in(
          "id",
          originals.map((q) => q.id)
        );

      return {
        success: true,
        message: `Successfully combined ${quotationNumbers.length} quotations into ${newNumber}.`,
        newQuotation: {
          number: newNumber,
          total: formatINR(totalAmount),
          itemCount: newItems.length,
        },
      };
    } catch (error) {
      console.error("❌ Combine quotation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
