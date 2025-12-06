import { z } from "zod";
import { tool } from "ai";
import { supabase } from "@/lib/supabase";

export const universalSearchTool = tool({
  name: "universalSearchTool",
  description:
    "Search across projects, clients, quotations, and invoices using a keyword",
  inputSchema: z.object({
    query: z.string().min(2, "Please enter at least 2 characters to search"),
  }),
  execute: async ({ query }) => {
    const lowerQuery = query.toLowerCase();
    const results = {
      projects: [] as any[],
      clients: [] as any[],
      quotations: [] as any[],
      invoices: [] as any[],
    };

    // Projects
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, description, deadline, status");

    if (projects)
      results.projects = projects.filter(
        (p) =>
          p.name?.toLowerCase().includes(lowerQuery) ||
          p.description?.toLowerCase().includes(lowerQuery)
      );

    // Clients
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, phone, email, company");

    if (clients)
      results.clients = clients.filter(
        (c) =>
          c.name?.toLowerCase().includes(lowerQuery) ||
          c.company?.toLowerCase().includes(lowerQuery)
      );

    // Quotations (joined with single project)
    const { data: quotationsRaw } = await supabase
      .from("quotations")
      .select(
        "id, quotation_number, total_amount, status, notes, project_id, projects!inner(name)"
      );

    if (quotationsRaw)
      results.quotations = quotationsRaw.filter((q) => {
        const projectName = (q as any)?.projects?.name?.toLowerCase?.() || "";
        return (
          q.quotation_number?.toLowerCase().includes(lowerQuery) ||
          q.notes?.toLowerCase().includes(lowerQuery) ||
          projectName.includes(lowerQuery)
        );
      });

    // Invoices
    const { data: invoices } = await supabase
      .from("invoices_enhanced")
      .select("id, invoice_number, total_amount, status, notes");

    if (invoices)
      results.invoices = invoices.filter(
        (i) =>
          i.invoice_number?.toLowerCase().includes(lowerQuery) ||
          i.notes?.toLowerCase().includes(lowerQuery)
      );

    return {
      summary: `Found ${results.projects.length} projects, ${results.clients.length} clients, ${results.quotations.length} quotations, and ${results.invoices.length} invoices matching "${query}"`,
      ...results,
    };
  },
});
