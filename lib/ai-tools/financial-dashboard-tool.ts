import { tool } from "ai";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { formatINR } from "./finance/finance-helpers";

/**
 * Comprehensive Financial Dashboard Tool
 * Shows all payments, invoices, revenue, and financial metrics
 */
export const getFinancialDashboardTool = tool({
  description:
    "Get comprehensive financial dashboard showing all payments received, invoices, revenue, outstanding balances, and company financial metrics. Use this when user asks for 'finance data', 'payment details', 'company finances', 'financial report', 'show all payments', etc.",
  inputSchema: z.object({
    startDate: z
      .string()
      .optional()
      .describe("Start date filter (YYYY-MM-DD), defaults to 90 days ago"),
    endDate: z
      .string()
      .optional()
      .describe("End date filter (YYYY-MM-DD), defaults to today"),
    clientId: z.string().optional().describe("Filter by specific client ID"),
  }),
  execute: async ({ startDate, endDate, clientId }) => {
    try {
      // Default date range: last 90 days
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 90);

      const start = startDate || defaultStartDate.toISOString().split("T")[0];
      const end = endDate || defaultEndDate.toISOString().split("T")[0];

      console.log(`💰 Fetching financial dashboard from ${start} to ${end}`);

      // 1. Fetch all payments with related data
      let paymentsQuery = supabase
        .from("payments")
        .select(
          `
          *,
          projects(id, name, clients(id, name)),
          invoices_enhanced(invoice_number, total_amount)
        `
        )
        .gte("payment_date", start)
        .lte("payment_date", end)
        .order("payment_date", { ascending: false });

      if (clientId) {
        paymentsQuery = paymentsQuery.eq("client_id", clientId);
      }

      const { data: payments, error: paymentsError } = await paymentsQuery;
      if (paymentsError) throw paymentsError;

      // 2. Fetch all invoices with payment status
      let invoicesQuery = supabase
        .from("invoices_enhanced")
        .select(
          `
          *,
          projects(name, clients(name)),
          payments(amount, payment_date)
        `
        )
        .gte("issue_date", start)
        .lte("issue_date", end)
        .order("issue_date", { ascending: false });

      if (clientId) {
        invoicesQuery = invoicesQuery.eq("client_id", clientId);
      }

      const { data: invoices, error: invoicesError } = await invoicesQuery;
      if (invoicesError) throw invoicesError;

      // 3. Process payments data
      const paymentsData = (payments || []).map((p: any) => ({
        id: p.id,
        date: p.payment_date,
        amount: p.amount,
        method: p.payment_method || "cash",
        referenceNumber: p.reference_number,
        projectName: p.projects?.name || "N/A",
        clientName: p.projects?.clients?.name || "N/A",
        invoiceNumber: p.invoices_enhanced?.invoice_number || null,
        isAdvance: !p.invoice_id, // No invoice = advance payment
        notes: p.notes,
      }));

      // 4. Process invoices data
      const invoicesData = (invoices || []).map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        date: inv.issue_date,
        dueDate: inv.due_date,
        projectName: inv.projects?.[0]?.name || inv.project_name || "N/A",
        clientName:
          inv.projects?.[0]?.clients?.name || inv.client_name || "N/A",
        totalAmount: inv.total_amount,
        advancePaid: inv.advance_paid || 0,
        balanceDue: inv.balance_due || 0,
        status: inv.status,
        paidAmount: inv.paid_amount || 0,
      }));

      // 5. Calculate financial metrics
      const totalPaymentsReceived = paymentsData.reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      );

      const totalAdvances = paymentsData
        .filter((p) => p.isAdvance)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const totalInvoicePayments = paymentsData
        .filter((p) => !p.isAdvance)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const totalInvoiced = invoicesData.reduce(
        (sum, inv) => sum + (inv.totalAmount || 0),
        0
      );

      const totalOutstanding = invoicesData.reduce(
        (sum, inv) => sum + (inv.balanceDue || 0),
        0
      );

      const completedInvoices = invoicesData.filter(
        (inv) => inv.status === "paid" || inv.balanceDue === 0
      ).length;

      const pendingInvoices = invoicesData.filter(
        (inv) => inv.balanceDue > 0
      ).length;

      // 6. Payment methods breakdown
      const paymentMethodBreakdown = paymentsData.reduce((acc: any, p) => {
        const method = p.method || "cash";
        acc[method] = (acc[method] || 0) + p.amount;
        return acc;
      }, {});

      // 7. Monthly revenue trend (last 3 months)
      const monthlyRevenue: any = {};
      paymentsData.forEach((p) => {
        const month = p.date?.substring(0, 7); // YYYY-MM
        if (month) {
          monthlyRevenue[month] = (monthlyRevenue[month] || 0) + p.amount;
        }
      });

      return {
        success: true,
        dateRange: { start, end },
        summary: {
          totalPaymentsReceived,
          totalAdvances,
          totalInvoicePayments,
          totalInvoiced,
          totalOutstanding,
          totalRevenue: totalPaymentsReceived, // Money actually received
          collectionRate:
            totalInvoiced > 0
              ? Math.round(
                  ((totalInvoiced - totalOutstanding) / totalInvoiced) * 100
                )
              : 0,
          completedInvoices,
          pendingInvoices,
          totalInvoices: invoicesData.length,
          totalPayments: paymentsData.length,
        },
        payments: paymentsData,
        invoices: invoicesData,
        paymentMethodBreakdown,
        monthlyRevenue,
        message: `✅ Financial dashboard loaded. ${paymentsData.length} payments, ${invoicesData.length} invoices.`,
      };
    } catch (error) {
      console.error("❌ Financial dashboard error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
