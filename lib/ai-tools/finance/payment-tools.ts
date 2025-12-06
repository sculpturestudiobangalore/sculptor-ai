import { tool } from "ai";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { getBusinessConfig, formatINR } from "./finance-helpers";

// ============================================================================
// TOOL 7: Record Payment
// ============================================================================

export const recordPaymentTool = tool({
  description:
    "Record a payment/advance paid against an invoice or project. Can use project name instead of ID. For advance payments before invoice, just provide project name and amount. IMPORTANT: When parsing dates like '14th Oct', always use the current year (2025) unless explicitly specified otherwise.",
  inputSchema: z.object({
    invoiceNumber: z.string().optional(),
    projectId: z.string().uuid().optional(),
    projectName: z
      .string()
      .optional()
      .describe("Project name to lookup project ID"),
    amount: z.number().positive(),
    paymentDate: z
      .string()
      .optional()
      .describe(
        "Payment date in YYYY-MM-DD format. If user says '14th Oct', convert to 2025-10-14 (use current year 2025)."
      ),
    paymentMethod: z.string().optional(),
    referenceNumber: z.string().optional(),
    notes: z.string().optional(),
  }),
  execute: async ({
    invoiceNumber,
    projectId,
    projectName,
    amount,
    paymentDate,
    paymentMethod,
    referenceNumber,
    notes,
  }) => {
    try {
      console.log("💰 Record Payment Tool:", {
        invoiceNumber,
        projectId,
        projectName,
        amount,
      });

      if (!invoiceNumber && !projectId && !projectName) {
        return {
          success: false,
          error: "Provide at least invoiceNumber, projectId, or projectName",
        };
      }

      // Find invoice by number if provided
      let invoiceId = null;
      let projectIDFinal = projectId || null;

      // If project name provided, lookup project ID and client ID
      if (projectName && !projectId) {
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .select("id, name, client_id")
          .ilike("name", `%${projectName}%`)
          .limit(1)
          .maybeSingle();

        if (projectError || !project) {
          console.error("❌ Project lookup failed:", projectError);
          return {
            success: false,
            error: `Project "${projectName}" not found`,
          };
        }

        console.log("✅ Found project:", project);
        projectIDFinal = project.id;
      }

      // Get client_id from project
      let clientId = null;
      if (projectIDFinal) {
        const { data: project } = await supabase
          .from("projects")
          .select("client_id")
          .eq("id", projectIDFinal)
          .single();

        clientId = project?.client_id || null;
        console.log("💼 Client ID for payment:", clientId);
      }

      if (invoiceNumber) {
        const { data: invoice, error: invoiceError } = await supabase
          .from("invoices_enhanced")
          .select("id, project_name, balance_due")
          .eq("invoice_number", invoiceNumber)
          .single();

        if (invoiceError || !invoice) {
          return {
            success: false,
            error: `Invoice ${invoiceNumber} not found`,
          };
        }

        invoiceId = invoice.id;
        projectIDFinal = invoice.project_name;

        if (amount > invoice.balance_due) {
          return {
            success: false,
            error: `Payment amount exceeds invoice balance due of ${formatINR(
              invoice.balance_due
            )}`,
          };
        }
      }

      // Record payment
      console.log("💳 Recording payment:", {
        invoiceId,
        projectIDFinal,
        clientId,
        amount,
      });
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert([
          {
            invoice_id: invoiceId,
            project_id: projectIDFinal,
            client_id: clientId, // Add client_id for direct tracking
            amount,
            payment_date: paymentDate || new Date().toISOString(),
            payment_method: paymentMethod || "cash",
            reference_number: referenceNumber || null,
            notes: notes || null,
            receipt_number: null, // receipt generation tool later
          },
        ])
        .select()
        .single();

      if (paymentError || !payment) {
        console.error("❌ Payment recording failed:", paymentError);
        return {
          success: false,
          error: `Failed to record payment: ${
            paymentError?.message || "Unknown error"
          }`,
        };
      }

      console.log("✅ Payment recorded successfully:", payment);

      // Update invoice's paid_amount and balance_due if invoiceId present
      if (invoiceId) {
        // Fetch current invoice amounts
        const { data: invoiceData, error: fetchError } = await supabase
          .from("invoices_enhanced")
          .select("paid_amount, balance_due")
          .eq("id", invoiceId)
          .single();

        if (fetchError || !invoiceData) {
          throw new Error("Invoice not found for update");
        }

        const updatedPaidAmount = (invoiceData.paid_amount || 0) + amount;
        const updatedBalanceDue = (invoiceData.balance_due || 0) - amount;

        // Update with calculated values
        await supabase
          .from("invoices_enhanced")
          .update({
            paid_amount: updatedPaidAmount,
            balance_due: updatedBalanceDue,
          })
          .eq("id", invoiceId);
      }

      return {
        success: true,
        payment,
        message: `✅ Payment of ${formatINR(amount)} recorded successfully.`,
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
// TOOL 8: Get Outstanding Payments
// ============================================================================

export const getOutstandingPaymentsTool = tool({
  description: "Fetch list of invoices or projects with outstanding balances",
  inputSchema: z
    .object({
      projectId: z.string().uuid().optional(),
      clientId: z.string().uuid().optional(),
    })
    .optional(),
  execute: async (input) => {
    try {
      const projectId = input?.projectId;
      const clientId = input?.clientId;

      let query = supabase
        .from("invoices_enhanced")
        .select("*, projects(*), clients(*)");

      if (projectId) query = query.eq("project_id", projectId);
      if (clientId) query = query.eq("client_id", clientId);

      query = query.gt("balance_due", 0).order("due_date", { ascending: true });

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: `Database error: ${error.message}`,
        };
      }

      if (!data || data.length === 0) {
        return {
          success: true,
          invoices: [],
          message: "No outstanding payments found.",
        };
      }

      return {
        success: true,
        invoices: data,
        message: `Found ${data.length} invoices with outstanding balances.`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
