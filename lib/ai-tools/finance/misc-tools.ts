import { tool } from "ai";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { formatINR } from "./finance-helpers";

// ============================================================================
// TOOL 12: Generate Payment Receipt
// ============================================================================

export const generatePaymentReceiptTool = tool({
  description: "Generate and store receipt number for a recorded payment",
  inputSchema: z.object({
    paymentId: z.string().uuid(),
  }),
  execute: async ({ paymentId }) => {
    try {
      // Generate receipt number (RCP-YYYY-XXX)
      const receiptNumber = await supabase.rpc("get_next_document_number", {
        doc_type: "receipt",
        prefix: "RCP",
      });

      // Update payment with receipt number
      const { data: payment, error } = await supabase
        .from("payments")
        .update({ receipt_number: receiptNumber })
        .eq("id", paymentId)
        .select()
        .single();

      if (error || !payment) {
        return {
          success: false,
          error: "Payment not found or failed to update receipt number",
        };
      }

      return {
        success: true,
        receiptNumber: payment.receipt_number,
        payment,
        message: `Receipt number assigned: ${payment.receipt_number}`,
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
// TOOL 13: Generate Debit Note
// ============================================================================

export const generateDebitNoteTool = tool({
  description:
    "Create a debit note for additional charges to an invoice or project.",
  inputSchema: z.object({
    invoiceNumber: z
      .string()
      .describe("Invoice number to associate debit note with"),
    amount: z.number().positive(),
    reason: z.string(),
  }),
  execute: async ({ invoiceNumber, amount, reason }) => {
    try {
      const { data: invoice, error } = await supabase
        .from("invoices_enhanced")
        .select("id, client_name, project_name")
        .eq("invoice_number", invoiceNumber)
        .single();

      if (error || !invoice) {
        return { success: false, error: "Invoice not found" };
      }

      const { data: debitNote, error: debitError } = await supabase
        .from("debit_notes")
        .insert({
          invoice_id: invoice.id,
          client_name: invoice.client_name,
          project_name: invoice.project_name,
          amount,
          reason,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (debitError) {
        return { success: false, error: debitError.message };
      }

      return {
        success: true,
        debitNote,
        message: `Debit note created for ₹${amount}`,
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
// TOOL 14: Cancel Invoice
// ============================================================================

export const cancelInvoiceTool = tool({
  description:
    "Cancel an existing invoice with a reason. Adds audit trail entry.",
  inputSchema: z.object({
    invoiceNumber: z.string(),
    reason: z.string(),
  }),
  execute: async ({ invoiceNumber, reason }) => {
    try {
      // Update invoice to cancelled status
      const { data, error } = await supabase
        .from("invoices_enhanced")
        .update({ status: "cancelled", notes: reason })
        .eq("invoice_number", invoiceNumber)
        .select()
        .single();

      if (error || !data) {
        return {
          success: false,
          error: `Could not cancel invoice ${invoiceNumber}: ${
            error?.message || "Not found"
          }`,
        };
      }

      // Insert audit trail record
      await supabase.from("invoice_audits").insert({
        invoice_number: invoiceNumber,
        action: "cancelled",
        reason,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: `Invoice ${invoiceNumber} has been cancelled.`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
