import { tool } from "ai";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { formatINR } from "./finance-helpers";

// ============================================================================
// TOOL 9: Get Payment History
// ============================================================================

export const getPaymentHistoryTool = tool({
  description: "Retrieve full payment history for an invoice or project",
  inputSchema: z.object({
    invoiceNumber: z.string().optional(),
    projectId: z.string().uuid().optional(),
  }),
  execute: async ({ invoiceNumber, projectId }) => {
    try {
      if (!invoiceNumber && !projectId) {
        return {
          success: false,
          error: "Provide invoice number or project ID",
        };
      }

      // Build query
      let query = supabase
        .from("payments")
        .select(
          "id, amount, payment_date, payment_method, reference_number, receipt_number, notes"
        );

      if (invoiceNumber) {
        const { data: invoice } = await supabase
          .from("invoices_enhanced")
          .select("id")
          .eq("invoice_number", invoiceNumber)
          .single();

        if (!invoice) {
          return {
            success: false,
            error: `Invoice ${invoiceNumber} not found`,
          };
        }

        query = query.eq("invoice_id", invoice.id);
      }

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query.order("payment_date", {
        ascending: false,
      });

      if (error) {
        return {
          success: false,
          error: `Failed to fetch payment history: ${error.message}`,
        };
      }

      if (!data || data.length === 0) {
        return {
          success: true,
          payments: [],
          message: "No payments found.",
        };
      }

      const payments = data.map((p) => ({
        id: p.id,
        amount: formatINR(p.amount),
        paymentDate: new Date(p.payment_date).toISOString().split("T")[0],
        paymentMethod: p.payment_method,
        referenceNumber: p.reference_number || "N/A",
        receiptNumber: p.receipt_number || "N/A",
        notes: p.notes || "",
      }));

      return { success: true, payments };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// ============================================================================
// TOOL 10: Generate Payment Reminder Message
// ============================================================================

export const generatePaymentReminderTool = tool({
  description:
    "Generate a WhatsApp message template reminding client of outstanding payment",
  inputSchema: z.object({
    invoiceNumber: z.string().describe("Invoice number"),
  }),
  execute: async ({ invoiceNumber }) => {
    try {
      // Fetch invoice and client info
      const { data: invoice, error } = await supabase
        .from("invoices_enhanced")
        .select(
          `invoice_number, due_date, total_amount, balance_due, clients(name, phone)`
        )
        .eq("invoice_number", invoiceNumber)
        .single();

      if (error || !invoice) {
        return {
          success: false,
          error: `Invoice ${invoiceNumber} not found`,
        };
      }

      if (invoice.balance_due <= 0) {
        return {
          success: false,
          error: `Invoice ${invoiceNumber} has no outstanding balance.`,
        };
      }

      const client = Array.isArray(invoice.clients)
        ? invoice.clients[0]
        : invoice.clients;

      const message = `Dear ${
        client?.name || "Customer"
      },\n\nThis is a friendly reminder that invoice ${
        invoice.invoice_number
      }, amounting to ₹${invoice.total_amount.toLocaleString(
        "en-IN"
      )}, is due on ${new Date(invoice.due_date).toLocaleDateString(
        "en-IN"
      )}. The outstanding balance is ₹${invoice.balance_due.toLocaleString(
        "en-IN"
      )}.\n\nPlease make the payment at your earliest convenience.\n\nThank you,\nSculpture Studio`;

      return { success: true, reminderMessage: message };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// ============================================================================
// TOOL 11: Generate Credit Note Tool
// ============================================================================

export const generateCreditNoteTool = tool({
  description: "Generate a credit note for a refund or adjustment",
  inputSchema: z.object({
    invoiceNumber: z
      .string()
      .describe("Invoice number to associate credit note with"),
    amount: z.number().positive().describe("Credit amount"),
    reason: z.string().describe("Reason for credit"),
  }),
  execute: async ({ invoiceNumber, amount, reason }) => {
    try {
      // Find invoice
      const { data: invoice, error } = await supabase
        .from("invoices_enhanced")
        .select("id, invoice_number, client_name, project_name")
        .eq("invoice_number", invoiceNumber)
        .single();

      if (error || !invoice) {
        return {
          success: false,
          error: `Invoice ${invoiceNumber} not found`,
        };
      }

      // Create credit note record (assuming a credits table)
      const { data: creditNote, error: creditError } = await supabase
        .from("credits")
        .insert({
          invoice_id: invoice.id,
          client_name: invoice.client_name,
          project_name: invoice.project_name,
          credit_amount: amount,
          reason,
          credit_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (creditError) {
        return {
          success: false,
          error: `Failed to create credit note: ${creditError.message}`,
        };
      }

      // TODO: Update invoice balance accordingly (outstanding tasks)

      return {
        success: true,
        creditNote,
        message: `Credit note for ₹${amount} created successfully.`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

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
