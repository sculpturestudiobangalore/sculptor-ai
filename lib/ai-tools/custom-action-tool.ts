// lib/ai-tools/custom-action-tool.ts
import { z } from "zod";
import { tool } from "ai";
import {
  listInvoicesTool,
  convertQuotationToInvoiceTool,
} from "./finance/invoice-tools";

/**
 * customActionTool
 * A flexible routing tool that parses plain-English commands and
 * dispatches to specific tools.
 *
 * This file is intentionally defensive:
 * - Uses `any` casts when calling other tools to avoid strict TS signature mismatches.
 * - Provides basic parsers for common phrases (invoice/quotation id, split parts, list).
 *
 * Replace/extend parsers as you need more coverage.
 */

// ------------------- Helpers -------------------

const extractQuotationId = (text: string) => {
  const m = text.match(/QTN[- ]?\d{4}[- ]?\d{3}/i);
  return m ? m[0].replace(/\s+/g, "") : null;
};

const extractInvoiceId = (text: string) => {
  const m = text.match(/INV[- ]?\d{4}[- ]?\d{3}/i);
  return m ? m[0].replace(/\s+/g, "") : null;
};

// safe-invoke helper for tool.execute with flexible typing
const callToolSafe = async (toolObj: any, input: any) => {
  if (!toolObj || !(toolObj as any).execute) {
    throw new Error("Target tool not available");
  }
  // some tools in this repo expect 2 args, some 1; pass undefined as second to be safe
  return await (toolObj as any).execute(input, undefined);
};

// ------------------- Tool definition -------------------

export const customActionTool = tool({
  name: "customActionTool",
  description:
    "Handle flexible user requests like splitting invoices, rescheduling tasks, converting quotations, or listing objects. Provide the command field with natural language.",
  inputSchema: z.object({
    command: z
      .string()
      .min(3, "Please provide a command")
      .describe("Natural language command to parse"),
  }),
  execute: async ({ command }) => {
    try {
      const lower = (command || "").toString().trim().toLowerCase();

      // ---------- LIST INVOICES (plain phrases) ----------
      if (
        lower === "list all" ||
        (lower.includes("list") && lower.includes("invoice"))
      ) {
        try {
          // Map to listInvoicesTool
          // We can try to extract client name if present, but for now just list all
          const resList = await callToolSafe(listInvoicesTool, {});
          return resList;
        } catch (err: any) {
          return {
            success: false,
            message: `List invoices failed: ${err?.message || String(err)}`,
          };
        }
      }

      // ---------- CONVERT QUOTATION TO INVOICE ----------
      if (lower.includes("convert") && /qtn/i.test(command)) {
        const qId = extractQuotationId(command);
        if (!qId)
          return {
            success: false,
            message:
              "Could not find a quotation id (QTN-YYYY-XXX). Please include the QTN id.",
          };

        // try to detect net days like "net 30" or "30 days"
        let netDays = 30;
        if (command.includes("immediate")) {
          netDays = 0;
        } else if (
          command.includes("delivery") ||
          command.includes("project")
        ) {
          netDays = -1; // Signal to use project deadline
        } else {
          const daysMatch = command.match(/(net\s*)?(\d{1,3})\s*days?/i);
          if (daysMatch) netDays = Number(daysMatch[2]);
        }

        // Check for advance payment mention
        const advanceMatch = command.match(/advance\s*(?:of\s*)?(\d+)/i);
        const advancePaid = advanceMatch ? Number(advanceMatch[1]) : 0;

        const input = {
          quotationNumber: qId,
          dueInDays: netDays,
          advancePaid: advancePaid,
          notes: `Converted via AI command: "${command}"`,
        };

        try {
          const resConvert = await callToolSafe(
            convertQuotationToInvoiceTool,
            input
          );
          return resConvert;
        } catch (err: any) {
          return {
            success: false,
            message: `Convert failed: ${err?.message || String(err)}`,
          };
        }
      }

      // ---------- SPLIT INVOICE ----------
      if (lower.includes("split") && /inv/i.test(command)) {
        return {
          success: false,
          message:
            "To split an invoice, please use the 'Split Invoice' button in the invoice list. This allows you to select specific items to split, which is more accurate than splitting by percentage.",
        };
      }

      // ---------- Fallback: suggest clarifying question ----------
      return {
        success: false,
        message:
          "I couldn't parse that command automatically. Try phrasing as: 'Convert QTN-2025-005 to invoice', 'List invoices', or use the UI for advanced actions like splitting.",
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || "customActionTool failed",
      };
    }
  },
});
