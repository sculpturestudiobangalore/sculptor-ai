import { tool } from "ai";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { getBusinessConfig, formatINR } from "./finance/finance-helpers";

// ============================================================================
// TOOL: Generate Report
// ============================================================================

export const generateReportTool = tool({
  description:
    "Generate business reports including GST, Profitability, Company Performance, and Client Statements.",
  inputSchema: z.object({
    reportType: z
      .enum([
        "gst",
        "profitability",
        "performance",
        "client_statement",
        "material_usage",
      ])
      .describe("Type of report to generate"),
    startDate: z.string().describe("Start date (YYYY-MM-DD)"),
    endDate: z.string().describe("End date (YYYY-MM-DD)"),
    clientId: z.string().optional().describe("Client ID for Client Statement"),
    gstFilter: z
      .enum(["all", "gst_only", "non_gst_only"])
      .default("all")
      .describe("Filter transactions by GST applicability"),
  }),
  execute: async ({ reportType, startDate, endDate, clientId, gstFilter }) => {
    try {
      console.log(
        `📊 Generating ${reportType} report from ${startDate} to ${endDate} (Filter: ${gstFilter})`
      );

      const config = await getBusinessConfig();
      let reportData: any = {};
      let summary: any = {};

      // Helper to apply GST filter
      const applyGstFilter = (query: any) => {
        if (gstFilter === "gst_only") {
          return query.eq("is_gst_applicable", true);
        } else if (gstFilter === "non_gst_only") {
          return query.eq("is_gst_applicable", false);
        }
        return query;
      };

      if (reportType === "gst") {
        // GST Report: List of invoices with tax breakdown
        let query = supabase
          .from("invoices_enhanced")
          .select("*")
          .gte("issue_date", startDate)
          .lte("issue_date", endDate)
          .order("issue_date", { ascending: true });

        // For GST report, usually we want GST invoices, but user might want to see non-gst too if they selected 'all'
        // But strictly speaking, a "GST Report" implies GST data.
        // However, we'll respect the filter. If 'gst_only' is passed (default for this type in UI), we filter.
        query = applyGstFilter(query);

        const { data: invoices, error } = await query;
        if (error) throw error;

        reportData = invoices;
        summary = {
          totalTaxableValue: invoices.reduce(
            (sum, inv) => sum + (inv.subtotal || 0),
            0
          ),
          totalCGST: invoices.reduce(
            (sum, inv) => sum + (inv.cgst_amount || 0),
            0
          ),
          totalSGST: invoices.reduce(
            (sum, inv) => sum + (inv.sgst_amount || 0),
            0
          ),
          totalIGST: invoices.reduce(
            (sum, inv) => sum + (inv.igst_amount || 0),
            0
          ),
          totalTax: invoices.reduce(
            (sum, inv) => sum + (inv.tax_amount || 0),
            0
          ),
          totalInvoiceValue: invoices.reduce(
            (sum, inv) => sum + (inv.total_amount || 0),
            0
          ),
          count: invoices.length,
        };
      } else if (reportType === "profitability") {
        // Profitability: Projects Budget vs Actuals (Invoices - Expenses)
        // This is complex. We need projects, their invoices, and their expenses (materials, labor).
        // For simplicity, we'll use project 'actual_cost' if tracked, or sum materials + estimated labor.
        // And 'revenue' from invoices.

        const { data: projects, error } = await supabase
          .from("projects")
          .select(
            "*, clients(name), invoices_enhanced(total_amount, is_gst_applicable)"
          )
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Process projects
        const processedProjects = projects.map((p) => {
          // Filter invoices based on GST filter if needed (though usually profitability includes all)
          const relevantInvoices = p.invoices_enhanced.filter((inv: any) => {
            if (gstFilter === "gst_only") return inv.is_gst_applicable;
            if (gstFilter === "non_gst_only") return !inv.is_gst_applicable;
            return true;
          });

          const revenue = relevantInvoices.reduce(
            (sum: number, inv: any) => sum + (inv.total_amount || 0),
            0
          );
          const cost = p.actual_cost || 0; // Assuming this is updated elsewhere or we fetch materials
          const profit = revenue - cost;
          const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

          return {
            id: p.id,
            name: p.name,
            clientName: p.clients?.name || "Unknown",
            status: p.status,
            budget: p.budget_amount,
            revenue,
            cost,
            profit,
            margin: margin.toFixed(2) + "%",
          };
        });

        reportData = processedProjects;
        summary = {
          totalRevenue: processedProjects.reduce(
            (sum, p) => sum + p.revenue,
            0
          ),
          totalCost: processedProjects.reduce((sum, p) => sum + p.cost, 0),
          totalProfit: processedProjects.reduce((sum, p) => sum + p.profit, 0),
        };
      } else if (reportType === "performance") {
        // Performance: Monthly Revenue vs Expenses
        // Revenue from Invoices
        // Expenses from Material Purchases + (Transactions where type=expense)

        // 1. Revenue
        let invQuery = supabase
          .from("invoices_enhanced")
          .select("total_amount, issue_date, is_gst_applicable")
          .gte("issue_date", startDate)
          .lte("issue_date", endDate);
        invQuery = applyGstFilter(invQuery);
        const { data: invoices } = await invQuery;

        // 2. Expenses (Material Purchases)
        // Note: Material purchases might not have 'is_gst_applicable' flag directly on the table in all schemas,
        // but let's assume we take all expenses for performance unless we strictly want to filter.
        // If the user asks for "Non-GST Only" performance, we should try to filter expenses too if possible.
        // For now, we'll just fetch all within date range.
        const { data: expenses } = await supabase
          .from("material_purchases")
          .select("total_cost, purchase_date")
          .gte("purchase_date", startDate)
          .lte("purchase_date", endDate);

        const totalRevenue =
          invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
        const totalExpenses =
          expenses?.reduce((sum, exp) => sum + (exp.total_cost || 0), 0) || 0;

        reportData = {
          invoices: invoices || [],
          expenses: expenses || [],
        };
        summary = {
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
        };
      } else if (reportType === "client_statement") {
        if (!clientId)
          throw new Error("Client ID is required for Client Statement");

        // Invoices
        let invQuery = supabase
          .from("invoices_enhanced")
          .select("*")
          .eq("client_id", clientId)
          .gte("issue_date", startDate)
          .lte("issue_date", endDate)
          .order("issue_date", { ascending: true });
        invQuery = applyGstFilter(invQuery);
        const { data: invoices } = await invQuery;

        // Payments (Payments are usually linked to invoices, but we might have generic payments)
        // We'll fetch payments linked to these invoices
        const invoiceIds = invoices?.map((i) => i.id) || [];
        const { data: payments } = await supabase
          .from("payments")
          .select("*")
          .in("invoice_id", invoiceIds)
          .order("payment_date", { ascending: true });

        reportData = {
          invoices: invoices || [],
          payments: payments || [],
        };

        const totalBilled =
          invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
        const totalPaid =
          payments?.reduce((sum, pay) => sum + (pay.amount || 0), 0) || 0;

        summary = {
          clientName: invoices?.[0]?.client_name || "Client", // Fallback
          totalBilled,
          totalPaid,
          balanceDue: totalBilled - totalPaid,
        };
      }

      return {
        success: true,
        reportType,
        dateRange: { startDate, endDate },
        gstFilter,
        data: reportData,
        summary,
        message: `Generated ${reportType} report.`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

export const showReportGeneratorTool = tool({
  description:
    "Show the interactive Report Generator UI to select report type, date range, and filters.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const { data: clients, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) throw error;

      return {
        success: true,
        showReportGeneratorUI: true,
        clients: clients || [],
        message: "Opening Report Generator...",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
