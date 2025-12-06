import { tool } from "ai";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { TASK_TEMPLATES } from "@/lib/ai-tools/utilities/task-templates";
import type { Tables } from "@/lib/ai-tools/types/database.types";
import {
  getErrorMessage,
  type ProjectAnalysis,
  type TaskWithRelations,
  type ProjectWithRelations,
  type InvoiceWithRelations,
} from "@/lib/ai-tools/types/business.types";
import {
  retry,
  normalizeDbError,
} from "@/lib/ai-tools/utilities/supabase-helpers";

// ============================================================================
// SECTION 1: CLIENT MANAGEMENT TOOLS
// ============================================================================

// ============================================================================
// HELPER FUNCTIONS - PRIVATE (for internal use only)
// ============================================================================

/**
 * Calculate project completion percentage based on task statuses
 * @param tasks - Array of task objects
 * @returns Percentage (0-100)
 */
function calculateProjectProgress(tasks: any[]): number {
  if (!tasks || tasks.length === 0) return 0;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  return Math.round((completedTasks / tasks.length) * 100);
}

/**
 * Get next 3 steps to complete for a project
 * @param tasks - Array of task objects
 * @returns Array of next task names
 */
function getNextSteps(tasks: any[]): string[] {
  if (!tasks || tasks.length === 0) return [];

  // Filter pending tasks and sort by dependencies
  const pendingTasks = tasks
    .filter((t) => t.status !== "completed" && t.status !== "in_progress")
    .sort((a, b) => {
      // Tasks with no dependencies come first
      if (a.depends_on === null && b.depends_on !== null) return -1;
      if (a.depends_on !== null && b.depends_on === null) return 1;
      return 0;
    })
    .slice(0, 3); // Get next 3 tasks

  return pendingTasks.map((t) => t.name || "Unnamed Task");
}

/**
 * Generate professional client update message based on progress
 * @param progress - Progress percentage (0-100)
 * @param clientName - Name of the client
 * @returns Professional status message
 */
function generateClientMessage(progress: number, clientName: string): string {
  const name = clientName || "Valued Client";

  if (progress === 0) {
    return `Hi ${name}, we're excited to begin your project! We're currently in the planning and setup phase.`;
  } else if (progress < 25) {
    return `Hi ${name}, your project is underway (${progress}% complete). We're in the initial foundation and preparation stage.`;
  } else if (progress < 50) {
    return `Hi ${name}, great progress! Your project is ${progress}% complete. We're moving into the detailed work phase.`;
  } else if (progress < 75) {
    return `Hi ${name}, we're in the home stretch! Your project is ${progress}% complete. Refinement and detailing underway.`;
  } else if (progress < 100) {
    return `Hi ${name}, nearly there! Your project is ${progress}% complete. Final quality checks and touch-ups in progress.`;
  } else {
    return `Hi ${name}, congratulations! Your project is 100% complete and ready for delivery!`;
  }
}

/**
 * Determine if IGST applies based on client state
 * Business location: Karnataka
 * IGST applies if client is NOT in Karnataka
 * @param clientStateCode - State code (e.g., 'TN', 'MH', 'KA')
 * @returns boolean - true if IGST applies, false if CGST+SGST applies
 */
async function determineGSTType(clientStateCode: string | null): Promise<{
  type: "IGST" | "CGST+SGST";
  rate: number;
  breakdown?: { cgst: number; sgst: number };
}> {
  const { data: config } = await supabase
    .from("business_config")
    .select("business_state, cgst_rate, sgst_rate, igst_rate")
    .single();

  const businessState = config?.business_state ?? "KA";
  const cgst = config?.cgst_rate ?? 6;
  const sgst = config?.sgst_rate ?? 6;
  const igst = config?.igst_rate ?? 12;

  if (
    !clientStateCode ||
    clientStateCode.toUpperCase() === businessState.toUpperCase()
  ) {
    return {
      type: "CGST+SGST",
      rate: cgst + sgst,
      breakdown: { cgst, sgst },
    };
  } else {
    return {
      type: "IGST",
      rate: igst,
    };
  }
}

// ============================================================================
// SHARED UTILITIES & TYPE ALIASES
// ============================================================================

const success = <T extends Record<string, unknown>>(payload: T) => ({
  success: true,
  ...payload,
});
const failure = (message: string) => ({ success: false, error: message });

const toISODate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

type ClientRow = Tables<"clients">;
type ProjectRow = Tables<"projects">;
type TaskRow = Tables<"tasks">;
type MaterialRow = Tables<"materials">;
type ProjectMaterialRow = Tables<"project_materials">;
type QuotationRow = Tables<"quotations">;
type InvoiceRow = Tables<"invoices_enhanced">;
type PaymentRow = Tables<"payments">;
type VendorRow = Tables<"external_vendors">;
type MaterialPurchaseRow = Tables<"material_purchases">;
type WorkLogRow = Tables<"work_log">;
type TimeEntryRow = Tables<"time_entries">;
type BusinessConfigRow = Tables<"business_config">;

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const ClientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  email: z.string().email("Invalid email format").optional().nullable(),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Phone must be 10 digits")
    .optional()
    .nullable(),
  company: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).optional().nullable(),
  state_code: z
    .string()
    .length(2, "State code must be 2 characters")
    .optional()
    .nullable(),
  gstin: z
    .string()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      "Invalid GST format"
    )
    .optional()
    .nullable(),
});

/**
 * TOOL 1: Create a new client
 * AI will use this when user says: "Add a new client named John"
 */
export const createClientTool = tool({
  description:
    "Create a new client in the system. Use when: User says 'add client', 'create client', 'new client' with a name. Automatically checks for duplicates. Examples: 'add client John Doe', 'create new client ABC Company'.",
  inputSchema: z.object({
    name: z.string().describe("Client name"),
    email: z.string().email().optional().describe("Client email"),
    phone: z.string().optional().describe("Client phone number"),
    company: z.string().optional().describe("Client company name"),
    address: z.string().optional().describe("Client address"),
    notes: z.string().optional().describe("Additional notes about the client"),
    state_code: z.string().optional().describe("State code (KA, MH, TN, etc.)"),
    gstin: z.string().optional().describe("GST ID number"),
    priority: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("Client priority"),
  }),
  // ✅ REMOVED outputSchema - let TypeScript infer from return
  execute: async ({
    name,
    email,
    phone,
    company,
    address,
    notes,
    state_code,
    gstin,
    priority,
  }) => {
    try {
      // Check for duplicate
      const { data: existingByName, error: searchError } = await supabase
        .from("clients")
        .select("id, name, email, phone")
        .ilike("name", name)
        .limit(1);

      if (searchError) {
        return {
          success: false,
          clientId: "",
          message: `❌ Database error: ${searchError.message}`,
        };
      }

      if (existingByName && existingByName.length > 0) {
        const existing = existingByName[0];
        return {
          success: false,
          clientId: existing.id,
          message: `❌ Client "${name}" already exists. Email: ${
            existing.email || "N/A"
          }, Phone: ${
            existing.phone || "N/A"
          }. Use updateClient tool to modify.`,
        };
      }

      // Create new client
      const { data, error } = await supabase
        .from("clients")
        .insert({
          name,
          email: email || null,
          phone: phone || null,
          company: company || null,
          address: address || null,
          notes: notes || null,
          state_code: state_code ? state_code.toUpperCase() : null,
          gstin: gstin || null,
          priority: priority || "medium",
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          clientId: "",
          message: `❌ Failed to create client: ${error.message}`,
        };
      }

      return {
        success: true,
        clientId: data.id,
        message: `✅ Successfully created client "${name}" (ID: ${data.id})`,
      };
    } catch (error) {
      return {
        success: false,
        clientId: "",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error creating client",
      };
    }
  },
});

/**
 * TOOL 2: List all clients with optional filtering
 * AI will use this when user says: "Show me all my clients" or "List high priority clients"
 */
export const listClientsTool = tool({
  description:
    "Retrieve list of all clients with optional filtering. Use when: User asks 'list clients', 'show all clients', 'who are my clients'. ALWAYS call this tool for list queries, never answer from memory. Can filter by priority, name search, or state. Examples: 'show me all clients', 'list high priority clients', 'find clients in Karnataka'.",
  inputSchema: z.object({
    priority: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("Filter by priority level"),
    search: z.string().optional().describe("Search by client name or company"),
    state: z.string().optional().describe("Filter by state code"),
    limit: z
      .number()
      .optional()
      .describe("Maximum number of results (default: 50)"),
  }),
  execute: async (input) => {
    try {
      let query = supabase.from("clients").select("*");

      if (input.priority) {
        query = query.eq("priority", input.priority);
      }

      if (input.state) {
        query = query.eq("state_code", input.state);
      }

      if (input.search) {
        query = query.or(
          `name.ilike.%${input.search}%,company.ilike.%${input.search}%,email.ilike.%${input.search}%`
        );
      }

      const { data, error } = await query.limit(input.limit || 50);

      // Get total count separately
      const { count } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        total: count || 0,
        clients:
          data?.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            company: c.company,
            priority: c.priority,
            state: c.state_code,
            hasGST: !!c.gstin,
          })) || [],
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to list clients",
      };
    }
  },
});

/**
 * TOOL 3: Get detailed information about a specific client
 * AI will use this when user says: "Tell me about John's details"
 */
export const getClientTool = tool({
  description:
    "Retrieve complete details for a specific client by name, phone, or ID. ALWAYS use this tool when the user asks to 'show' or 'see' client details to render the Client Card UI. You can search by client name (e.g., 'Mumbai Museum'), phone number, or client ID.",
  inputSchema: z.object({
    clientId: z
      .string()
      .optional()
      .describe("The unique identifier (UUID) of the client"),
    clientName: z
      .string()
      .optional()
      .describe("Client name or partial name to search for"),
    clientPhone: z
      .string()
      .optional()
      .describe("Client phone number to search for"),
  }),
  execute: async (input) => {
    try {
      // At least one search parameter is required
      if (!input.clientId && !input.clientName && !input.clientPhone) {
        return {
          success: false,
          error:
            "Please provide clientId, clientName, or clientPhone to fetch client details",
        };
      }

      // Build query based on available input
      let clientQuery = supabase.from("clients").select("*");

      if (input.clientId) {
        clientQuery = clientQuery.eq("id", input.clientId);
      } else if (input.clientName) {
        clientQuery = clientQuery.ilike("name", `%${input.clientName}%`);
      } else if (input.clientPhone) {
        clientQuery = clientQuery.ilike("phone", `%${input.clientPhone}%`);
      }

      const { data: client, error } = await clientQuery.single();

      if (error || !client) {
        return {
          success: false,
          error: `Client not found${
            input.clientName ? ` with name matching "${input.clientName}"` : ""
          }`,
        };
      }

      // Fetch all projects for this client WITH tasks and payments
      const { data: projects } = await supabase
        .from("projects")
        .select(
          `
          id, 
          name, 
          budget_amount, 
          actual_cost, 
          status, 
          deadline, 
          created_at,
          tasks(id, status),
          payments(id, amount, payment_date, invoice_id),
          invoices_enhanced(id, invoice_number, total_amount, balance_due)
        `
        )
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });

      // Process projects with financial details
      const projectsWithFinancials = (projects || []).map((p: any) => {
        const tasks = p.tasks || [];
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(
          (t: any) => t.status === "completed"
        ).length;
        const progress =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const payments = p.payments || [];
        const totalPaid = payments.reduce(
          (sum: number, payment: any) => sum + (payment.amount || 0),
          0
        );

        // Advances are payments not linked to any invoice yet
        const advances = payments.filter((payment: any) => !payment.invoice_id);
        const totalAdvances = advances.reduce(
          (sum: number, adv: any) => sum + (adv.amount || 0),
          0
        );

        const invoices = p.invoices_enhanced || [];
        const totalInvoiced = invoices.reduce(
          (sum: number, inv: any) => sum + (inv.total_amount || 0),
          0
        );
        const totalBalance = invoices.reduce(
          (sum: number, inv: any) => sum + (inv.balance_due || 0),
          0
        );

        return {
          id: p.id,
          name: p.name,
          budget: p.budget_amount,
          actualCost: p.actual_cost || 0,
          status: p.status,
          deadline: p.deadline,
          progress,
          totalTasks,
          completedTasks,
          totalPaid,
          totalAdvances,
          totalInvoiced,
          balanceDue: totalBalance,
          budgetUtilization:
            p.budget_amount > 0
              ? Math.round(((p.actual_cost || 0) / p.budget_amount) * 100)
              : 0,
        };
      });

      // Calculate client-level totals
      const clientTotals = {
        totalBudget: projectsWithFinancials.reduce(
          (sum, p) => sum + (p.budget || 0),
          0
        ),
        totalSpent: projectsWithFinancials.reduce(
          (sum, p) => sum + (p.actualCost || 0),
          0
        ),
        totalAdvances: projectsWithFinancials.reduce(
          (sum, p) => sum + p.totalAdvances,
          0
        ),
        totalBalance: projectsWithFinancials.reduce(
          (sum, p) => sum + p.balanceDue,
          0
        ),
        activeProjects: projectsWithFinancials.filter(
          (p) => p.status === "in_progress"
        ).length,
      };

      const gstInfo = await determineGSTType(client.state_code);

      return {
        success: true,
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          company: client.company,
          address: client.address,
          notes: client.notes,
          priority: client.priority,
          state_code: client.state_code,
          gstin: client.gstin,
          gstType: gstInfo.type,
          gstRate: gstInfo.rate,
          projectCount: projects?.length || 0,
          created_at: client.created_at,
          updated_at: client.updated_at,
          projects: projectsWithFinancials,
          totals: clientTotals,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get client details",
      };
    }
  },
});

/**
 * TOOL 4: Update client information (including GST/State details)
 * AI will use this when user says: "Update John's email" or "Add GST number for John"
 */
export const updateClientTool = tool({
  description:
    "Update any client information including contact details, address, priority, and tax information. Can identify client by either their unique ID or by their name. Use this for both regular updates and tax compliance updates.",
  inputSchema: z.object({
    clientId: z
      .string()
      .optional()
      .describe("The unique identifier of the client (if known)"),
    clientName: z
      .string()
      .optional()
      .describe(
        "The name of the client to find and update (if ID not provided)"
      ),
    clientEmail: z
      .string()
      .optional()
      .describe(
        "Email address to disambiguate if multiple clients have same name"
      ),
    clientPhone: z
      .string()
      .optional()
      .describe(
        "Phone number to disambiguate if multiple clients have same name"
      ),
    email: z.string().optional().describe("New email address"),
    phone: z.string().optional().describe("New phone number"),
    company: z.string().optional().describe("New company name"),
    address: z.string().optional().describe("New address"),
    notes: z.string().optional().describe("Updated notes"),
    priority: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("New priority level"),
    state_code: z
      .string()
      .optional()
      .describe("New state code for GST/IGST calculation"),
    gstin: z.string().optional().describe("GST Identification Number"),
  }),
  execute: async (input) => {
    try {
      let clientId = input.clientId;
      let clientName = input.clientName;

      // ✅ STEP 1: Find client by ID or Name
      if (!clientId && !clientName) {
        return {
          success: false,
          error: "Please provide either a client ID or client name",
        };
      }

      if (!clientId && clientName) {
        // Search by name
        let query = supabase
          .from("clients")
          .select("id, name, email, phone")
          .ilike("name", `%${clientName}%`);

        // ✅ If email or phone provided, use them to disambiguate
        if (input.clientEmail) {
          query = query.ilike("email", `%${input.clientEmail}%`);
        }
        if (input.clientPhone) {
          query = query.eq("phone", input.clientPhone);
        }

        const { data: clients, error: searchError } = await query.limit(5);

        if (searchError || !clients || clients.length === 0) {
          return {
            success: false,
            error: `Client "${clientName}" not found in the system`,
          };
        }

        // ✅ Handle multiple matches
        if (clients.length > 1) {
          const matches = clients
            .map(
              (c) =>
                `${c.name} (ID: ${c.id}, Email: ${c.email || "N/A"}, Phone: ${
                  c.phone || "N/A"
                })`
            )
            .join("\n");

          return {
            success: false,
            error: `Multiple clients found with name "${clientName}". Please provide more details to disambiguate:\n\n${matches}\n\nYou can:\n1. Provide their email or phone to narrow down\n2. Use their client ID directly`,
            matchCount: clients.length,
            matches: clients.map((c) => ({
              id: c.id,
              name: c.name,
              email: c.email,
              phone: c.phone,
            })),
          };
        }

        clientId = clients[0].id;
        clientName = clients[0].name;
      }

      // ✅ STEP 2: Filter out undefined values
      const updateFields = {
        email: input.email,
        phone: input.phone,
        company: input.company,
        address: input.address,
        notes: input.notes,
        priority: input.priority,
        state_code: input.state_code,
        gstin: input.gstin,
      };

      const cleanUpdates = Object.fromEntries(
        Object.entries(updateFields).filter(([, v]) => v !== undefined)
      );

      if (Object.keys(cleanUpdates).length === 0) {
        return {
          success: false,
          error: "No fields to update provided",
        };
      }

      // ✅ STEP 3: Validate state code and gstin if provided
      if (input.state_code || input.gstin) {
        const validationData = {
          state_code: input.state_code,
          gstin: input.gstin,
        };
        ClientSchema.pick({ state_code: true, gstin: true }).parse(
          validationData
        );
      }

      // ✅ STEP 4: Update the client
      const updateData = {
        ...cleanUpdates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("clients")
        .update(updateData)
        .eq("id", clientId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const gstInfo = await determineGSTType(data.state_code);

      return {
        success: true,
        message: `✅ Client "${
          data.name
        }" updated successfully with the following changes: ${Object.keys(
          cleanUpdates
        ).join(", ")}`,
        client: {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          address: data.address,
          state_code: data.state_code,
          gstin: data.gstin,
          gstType: gstInfo.type,
          gstRate: `${gstInfo.rate}%`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update client",
      };
    }
  },
});

/**
 * TOOL 5: Validate client data before creating/updating
 * AI will use this when unsure about data validity
 */
export const validateClientDataTool = tool({
  description:
    "Validate and audit a client's data quality. Check for missing fields, incorrect formats, and data completeness. Use this when asked to 'validate', 'check', or 'audit' client data.",
  inputSchema: z.object({
    name: z.string().optional().describe("Client name to validate"),
    email: z.string().optional().describe("Email address to validate"),
    phone: z.string().optional().describe("Phone number to validate"),
    state_code: z.string().optional().describe("State code to validate"),
    gstin: z.string().optional().describe("GST number to validate"),
  }),
  execute: async (input) => {
    try {
      const issues: string[] = [];

      // Check name
      if (input.name !== undefined) {
        if (!input.name || input.name.trim().length === 0) {
          issues.push("Client name is required and cannot be empty");
        } else if (input.name.length < 2) {
          issues.push("Client name must be at least 2 characters");
        }
      }

      // Check email
      if (input.email !== undefined) {
        if (input.email && !z.string().email().safeParse(input.email).success) {
          issues.push(`"${input.email}" is not a valid email format`);
        }
      }

      // Check phone
      if (input.phone !== undefined) {
        if (input.phone && !/^[0-9]{10}$/.test(input.phone)) {
          issues.push(`"${input.phone}" is not a valid 10-digit phone number`);
        }
      }

      // Check state code
      if (input.state_code !== undefined) {
        if (input.state_code && input.state_code.length !== 2) {
          issues.push(
            `State code "${input.state_code}" must be exactly 2 characters (e.g., "TN", "MH", "KA")`
          );
        }
      }

      // Check GSTIN
      if (input.gstin !== undefined) {
        if (
          input.gstin &&
          !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
            input.gstin
          )
        ) {
          issues.push(
            `"${input.gstin}" is not a valid GSTIN format. Valid format: 15 alphanumeric characters`
          );
        }
      }

      if (issues.length === 0) {
        return {
          success: true,
          isValid: true,
          message: "All provided data is valid!",
        };
      } else {
        return {
          success: true,
          isValid: false,
          issues,
          message: `Found ${issues.length} validation issue(s)`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Validation failed",
      };
    }
  },
});

/**
 * TOOL 6: Generate client update message with project progress
 * Internal use - helps create professional client communications
 */
export const generateClientUpdateTool = tool({
  description:
    "Generate professional client progress reports for WhatsApp forwarding. Returns structured data with progress percentage, message, and next steps. Works with any project status (not just active).",
  inputSchema: z.object({
    clientName: z.string().optional().describe("Client name for search"),
    projectName: z.string().optional().describe("Project name for search"),
    status: z
      .enum([
        "draft",
        "quoted",
        "waiting_approval",
        "in_progress",
        "invoiced",
        "completed",
      ])
      .optional()
      .describe("Filter by project status (optional - defaults to ALL)"),
    limit: z
      .number()
      .min(1)
      .max(50)
      .default(5)
      .describe("Maximum projects to return"),
  }),
  execute: async (input) => {
    try {
      console.log("📊 CLIENT UPDATE Input:", input);

      // VALIDATE INPUT
      if (!input.clientName && !input.projectName) {
        return {
          success: false,
          error: "Please provide either client name or project name",
        };
      }

      let projects: any[] = [];
      let client: any = null;

      // SCENARIO 1: PROJECT NAME PROVIDED - FIND SPECIFIC PROJECT
      if (input.projectName) {
        console.log("🔍 CLIENT UPDATE: Searching project", input.projectName);

        let projectQuery = supabase
          .from("projects")
          .select(
            `
            id, 
            name, 
            status, 
            deadline, 
            budget_amount,
            actual_cost,
            clients!inner(id, name, email, phone, company)
          `
          )
          .ilike("name", `%${input.projectName}%`)
          .limit(input.limit);

        // Apply status filter only if provided
        if (input.status) {
          projectQuery = projectQuery.eq("status", input.status);
        }

        const { data, error } = await projectQuery;

        if (error) {
          return {
            success: false,
            error: `Database error: ${error.message}`,
          };
        }

        if (!data || data.length === 0) {
          return {
            success: false,
            error: `No projects found matching "${input.projectName}"${
              input.status ? ` with status "${input.status}"` : ""
            }`,
          };
        }

        projects = data;

        // If client name also provided, verify it matches
        if (input.clientName && projects.length > 0) {
          const firstProject = projects[0];
          const projectClient = Array.isArray(firstProject.clients)
            ? firstProject.clients[0]
            : firstProject.clients;

          if (
            !projectClient?.name
              ?.toLowerCase()
              .includes(input.clientName.toLowerCase())
          ) {
            return {
              success: false,
              error: `Project "${input.projectName}" does not belong to client "${input.clientName}"`,
            };
          }
        }
      }
      // SCENARIO 2: CLIENT NAME ONLY - FIND ALL PROJECTS (any status)
      else if (input.clientName) {
        console.log("🔍 CLIENT UPDATE: Searching client", input.clientName);

        // Find client first
        const { data: clients, error: clientError } = await supabase
          .from("clients")
          .select("id, name, email, phone, company")
          .ilike("name", `%${input.clientName}%`)
          .limit(1);

        if (clientError || !clients || clients.length === 0) {
          return {
            success: false,
            error: `Client "${input.clientName}" not found`,
          };
        }

        client = clients[0];

        // Find client's projects (all statuses unless filtered)
        let projectsQuery = supabase
          .from("projects")
          .select("id, name, status, deadline, budget_amount, actual_cost")
          .eq("client_id", client.id)
          .order("created_at", { ascending: false })
          .limit(input.limit);

        // Apply status filter only if provided
        if (input.status) {
          projectsQuery = projectsQuery.eq("status", input.status);
        }

        const { data: clientProjects, error: projectsError } =
          await projectsQuery;

        if (projectsError) {
          return {
            success: false,
            error: `Database error: ${projectsError.message}`,
          };
        }

        if (!clientProjects || clientProjects.length === 0) {
          return {
            success: false,
            error: `No projects found for client "${input.clientName}"${
              input.status ? ` with status "${input.status}"` : ""
            }`,
            hint: "Try without status filter to see all projects",
          };
        }

        projects = clientProjects;
      }

      // HANDLE MULTIPLE PROJECTS - NEEDS CLARIFICATION
      if (projects.length > 1) {
        console.log(
          "📋 CLIENT UPDATE: Multiple projects found",
          projects.length
        );
        return {
          success: false,
          needsClarification: true,
          client:
            client ||
            (projects[0].clients
              ? Array.isArray(projects[0].clients)
                ? projects[0].clients[0]
                : projects[0].clients
              : null),
          projects: projects.map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            deadline: p.deadline,
            budget: p.budget_amount,
            spent: p.actual_cost,
          })),
          message: `Found ${projects.length} projects. Please specify which project to generate update for.`,
        };
      }

      // SINGLE PROJECT - GENERATE REPORT
      const project = projects[0];
      const projectClient =
        client ||
        (project.clients
          ? Array.isArray(project.clients)
            ? project.clients[0]
            : project.clients
          : null);

      if (!projectClient) {
        return {
          success: false,
          error: "Could not find client details for project",
        };
      }

      console.log(
        "✅ CLIENT UPDATE: Generating report for",
        project.name,
        "client:",
        projectClient.name
      );

      // GET PROJECT TASKS
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, name, status, estimated_hours, actual_hours")
        .eq("project_id", project.id);

      if (tasksError) {
        return {
          success: false,
          error: `Could not fetch project tasks: ${tasksError.message}`,
        };
      }

      // CALCULATE PROGRESS AND GENERATE REPORT
      const progress = calculateProjectProgress(tasks);
      const nextSteps = getNextSteps(tasks);
      const message = generateClientMessage(progress, projectClient.name);

      // STRUCTURED REPORT FOR WHATSAPP FORWARDING
      const report = {
        clientName: projectClient.name,
        clientContact: projectClient.phone || projectClient.email,
        projectName: project.name,
        projectId: project.id,
        progressPercentage: progress,
        completedTasks:
          tasks?.filter((t: any) => t.status === "completed").length || 0,
        totalTasks: tasks?.length || 0,
        message: message,
        nextSteps:
          nextSteps.length > 0 ? nextSteps : ["Project planning and setup"],
        generatedAt: new Date().toISOString(),
        whatsappReady: true,
        structuredData: {
          deadline: project.deadline,
          status: project.status,
        },
      };

      console.log("✅ CLIENT UPDATE: Generated report", report);

      return {
        success: true,
        report: report,
        message: `Client update generated for ${projectClient.name} - ${project.name} (${progress}% complete)`,
      };
    } catch (error) {
      console.error("❌ CLIENT UPDATE: Unexpected error", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate client update",
      };
    }
  },
});

/**
 * TOOL: Update Client State Code
 */
export const updateClientStateTool = tool({
  description: "Update the state code for a client (affects GST calculation)",
  inputSchema: z.object({
    clientId: z.string().uuid().describe("Client ID"),
    state_code: z
      .string()
      .length(2)
      .describe("New state code (e.g., KA, MH, TN)"),
  }),
  execute: async ({ clientId, state_code }) => {
    try {
      const { data: client, error: fetchError } = await supabase
        .from("clients")
        .select("id, name, state_code")
        .eq("id", clientId)
        .single();

      if (fetchError || !client) {
        return failure(`Client not found: ${clientId}`);
      }

      const { data, error } = await supabase
        .from("clients")
        .update({
          state_code: state_code.toUpperCase(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId)
        .select()
        .single();

      if (error) {
        return failure(`Failed to update state: ${error.message}`);
      }

      const gstInfo = await determineGSTType(state_code);

      return success({
        clientId: data.id,
        oldState: client.state_code,
        newState: state_code.toUpperCase(),
        gstType: gstInfo.type,
        message: `✅ Updated client state to ${state_code.toUpperCase()}. GST type: ${
          gstInfo.type
        }`,
      });
    } catch (error) {
      return failure(getErrorMessage(error));
    }
  },
});

// ============================================
// SECTION 2: PROJECT MANAGEMENT TOOLS (6 tools)
// ============================================

/**
 * HELPER: Calculate project timeline from task templates
 */
function calculateProjectTimeline(projectType: "2D" | "3D" | "OTHERS") {
  const tasks = TASK_TEMPLATES[projectType];
  const totalHours = tasks.reduce(
    (sum, task) => sum + (task.estimated_minutes || 0) / 60, // Convert minutes to hours
    0
  );

  // Estimate working days: total_minutes / (8 hours * 60 minutes * parallelization_factor)
  // parallelization_factor = 0.75 (assumes 25% of tasks run in parallel)
  const estimatedDays = Math.ceil(totalHours / (8 * 0.75));
  const estimatedEndDate = new Date();
  estimatedEndDate.setDate(estimatedEndDate.getDate() + estimatedDays);

  return {
    totalHours,
    estimatedDays,
    estimatedEndDate: estimatedEndDate.toISOString().split("T")[0],
  };
}

/**
 * TOOL 6.5: Show Project Creation Form
 * Fetches all necessary data to display the unified project creation form
 */
export const showCreateProjectFormTool = tool({
  description:
    "🎯 MANDATORY TOOL: Display the interactive UI form to create a new project. YOU MUST USE THIS TOOL for ANY project creation request including: 'create project', 'new project', 'create project for [client]', 'create project from [quotation]'. This tool shows an interactive form where users can select the client, quotation, and fill in all project details. NEVER ask the user for project details manually - ALWAYS show this form instead. This is the PRIMARY way to create projects.",
  inputSchema: z.object({
    clientName: z
      .string()
      .optional()
      .describe("Pre-fill client name if provided"),
  }),
  execute: async (input) => {
    console.log("🚀 showCreateProjectFormTool called with input:", input);
    try {
      // Fetch all clients
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, name, email, phone, company")
        .order("name", { ascending: true })
        .limit(100);

      if (clientsError) {
        return {
          success: false,
          error: `Failed to fetch clients: ${clientsError.message}`,
        };
      }

      // Fetch all quotations
      const { data: quotations, error: quotationsError } = await supabase
        .from("quotations")
        .select(
          "id, quotation_number, client_id, total_amount, status, valid_until"
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (quotationsError) {
        return {
          success: false,
          error: `Failed to fetch quotations: ${quotationsError.message}`,
        };
      }

      // Create a client lookup map for efficient client name retrieval
      const clientMap = new Map(clients?.map((c) => [c.id, c.name]) || []);

      const result = {
        success: true,
        showForm: true,
        prefillClientName: input.clientName,
        clients: clients || [],
        quotations:
          quotations?.map((q) => ({
            id: q.id,
            quotation_number: q.quotation_number,
            client_id: q.client_id,
            client_name: clientMap.get(q.client_id) || "Unknown",
            total_amount: q.total_amount,
            status: q.status,
            valid_until: q.valid_until,
          })) || [],
        message: "📝 Please fill in the project details below",
      };
      console.log("✅ showCreateProjectFormTool returning success:", {
        clientCount: result.clients.length,
        quotationCount: result.quotations.length,
        prefill: result.prefillClientName,
      });
      return result;
    } catch (error) {
      console.error("❌ showCreateProjectFormTool error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load project form data",
      };
    }
  },
});

/**
 * TOOL 7: Create Project (with auto-loaded task template)
 */
export const createProjectTool = tool({
  description:
    "Create a new project with workflow tasks. Use this tool ONLY when: (1) User is submitting data from the project creation form with specific client ID and quotation ID, OR (2) Creating project programmatically with all details available. For casual 'create project' requests WITHOUT specific IDs, use showCreateProjectFormTool instead. IMPORTANT: If the user message contains 'client ID' or 'quotation ID', this is a form submission - execute this tool immediately.",
  inputSchema: z.object({
    name: z.string().describe("Project name"),
    clientName: z
      .string()
      .optional()
      .describe("Client name (will lookup or create)"),
    clientId: z
      .string()
      .uuid()
      .optional()
      .describe("Client ID (preferred if available from form)"),
    projectType: z
      .enum(["2D", "3D"])
      .optional()
      .describe("Project type: 2D or 3D (default: 3D)"),
    description: z.string().optional().describe("Project description"),
    quotedBudget: z.number().optional().describe("Quoted budget amount"),
    deadline: z.string().optional().describe("Deadline (YYYY-MM-DD)"),
    priority: z
      .enum(["low", "medium", "high", "urgent"])
      .optional()
      .describe("Priority level"),
    status: z
      .enum(["draft", "quoted", "in_progress", "completed"])
      .optional()
      .describe("Project status (default: quoted)"),
    quotationId: z
      .string()
      .optional()
      .describe("Quotation ID to link (if creating from quotation)"),
  }),
  execute: async (input) => {
    try {
      console.log("🏗️ [createProjectTool] Input:", input);

      let clientId: string;
      let clientWasCreated = false;

      // Prefer direct clientId if provided (from form submission)
      if (input.clientId) {
        console.log("✅ Using provided clientId:", input.clientId);
        clientId = input.clientId;
      } else if (input.clientName) {
        // Fallback to client name lookup/creation
        console.log("🔍 Looking up client by name:", input.clientName);
        const { getOrCreateClient } = await import(
          "@/lib/ai-tools/utilities/workflow-helpers"
        );
        const clientResult = await getOrCreateClient(input.clientName);

        if (!clientResult.success) {
          return {
            success: false,
            error: clientResult.error || "Failed to get or create client",
          };
        }

        clientId = clientResult.clientId!;
        clientWasCreated = clientResult.created || false;
      } else {
        return {
          success: false,
          error: "Either clientId or clientName must be provided",
        };
      }

      // Parse deadline
      let finalDeadline: string | null = null;
      if (input.deadline) {
        const deadlineDate = new Date(input.deadline);
        if (!isNaN(deadlineDate.getTime())) {
          finalDeadline = input.deadline;
        }
      }

      const projectType = input.projectType || "3D";

      // Create project - ONLY with columns that exist in schema
      const projectStatus = input.status || "quoted"; // Default to quoted if not specified
      console.log("📝 Creating project with status:", projectStatus);

      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          client_id: clientId,
          name: input.name,
          description: input.description || null,
          status: projectStatus,
          budget_amount: input.quotedBudget || 0,
          deadline: finalDeadline,
          priority: input.priority || "medium",
          project_type: projectType,
          start_date: new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to create project: ${error.message}`,
        };
      }

      // Get task templates for this project type
      const taskTemplates = TASK_TEMPLATES[projectType] || TASK_TEMPLATES["3D"];

      // Create tasks without dependencies first
      const tasksToInsert = taskTemplates.map(
        (template: any, index: number) => ({
          project_id: project.id,
          name: template.name,
          status: "pending",
          priority: template.priority || "medium",
          estimated_hours: Number((template.estimated_minutes / 60).toFixed(2)),
          sequence_order: index + 1,
          assigned_to: template.assigned_to || null,
        })
      );

      const { data: createdTasks, error: tasksError } = await supabase
        .from("tasks")
        .insert(tasksToInsert)
        .select();

      if (tasksError) {
        console.error("Failed to create tasks:", tasksError);
        return {
          success: true,
          project: {
            id: project.id,
            name: project.name,
            client: input.clientName,
            type: projectType,
            budget: project.budget_amount,
            deadline: project.deadline,
            status: project.status,
            tasksCreated: 0,
            clientCreated: clientWasCreated,
          },
          message: `✅ Project "${project.name}" created, but tasks failed: ${
            tasksError.message
          }${
            clientWasCreated
              ? ` | 🆕 Created new client "${input.clientName}"`
              : ""
          }`,
        };
      }

      // Now map dependencies using actual UUIDs
      if (createdTasks && createdTasks.length > 0) {
        const dependencyUpdates = taskTemplates
          .map((template: any, index: number) => {
            if (
              template.depends_on !== null &&
              template.depends_on !== undefined
            ) {
              const dependsOnIndex = template.depends_on - 1; // Convert 1-based to 0-based
              if (dependsOnIndex >= 0 && dependsOnIndex < createdTasks.length) {
                return {
                  id: createdTasks[index].id,
                  depends_on: createdTasks[dependsOnIndex].id, // Use actual UUID
                };
              }
            }
            return null;
          })
          .filter(Boolean);

        // Update tasks with dependencies
        for (const update of dependencyUpdates) {
          await supabase
            .from("tasks")
            .update({ depends_on: update!.depends_on })
            .eq("id", update!.id);
        }
      }

      let successMessage = `✅ Project "${project.name}" created with ${createdTasks.length} tasks`;
      if (clientWasCreated) {
        successMessage += ` | 🆕 Created new client "${input.clientName}"`;
      }

      // Link Quotation if provided
      if (input.quotationId) {
        const { error: linkError } = await supabase
          .from("quotations")
          .update({
            project_id: project.id,
            status: "approved",
          })
          .eq("id", input.quotationId);

        if (!linkError) {
          successMessage += ` | 🔗 Linked to Quotation`;
        }
      }

      return {
        type: "project_created",
        success: true,
        data: {
          id: project.id,
          name: project.name,
          client: input.clientName,
          type: projectType,
          budget: project.budget_amount,
          deadline: project.deadline,
          status: project.status,
          tasksCreated: createdTasks?.length || 0, // ← Add this line
        },
        displayCard: {
          title: "✅ Project Created",
          subtitle: project.name,
          fields: [
            { label: "Client", value: input.clientName },
            { label: "Type", value: projectType },
            { label: "Status", value: "Planning" },
            {
              label: "Budget",
              value: project.budget_amount
                ? `₹${project.budget_amount.toLocaleString("en-IN")}`
                : "Not set",
            },
            { label: "Deadline", value: project.deadline || "Not set" },
            {
              label: "Tasks Created",
              value: `${createdTasks?.length || 0} tasks`,
            },
          ],
        },
        message: successMessage,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create project",
      };
    }
  },
});

/**
 * TOOL 8: List Projects (with filtering)
 */
export const listProjectsTool = tool({
  description:
    "List ALL projects or filter projects by client, status, or priority. Use this tool for commands like 'show all projects', 'show all project details', 'list all projects', 'view all projects', or 'show projects'. This shows a summary view of multiple projects, NOT detailed view of a single project.",
  inputSchema: z.object({
    clientName: z.string().optional().describe("Filter by client name"),
    status: z
      .enum([
        "draft",
        "quoted",
        "waiting_approval",
        "in_progress",
        "invoiced",
        "completed",
      ])
      .optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    limit: z.number().optional().default(50),
  }),
  execute: async (input) => {
    try {
      console.log("🔍 [PROJECTS TOOL] Input:", input);

      let query = supabase.from("projects").select(`
          id,
          name,
          description,
          status,
          budget_amount,
          actual_cost,
          deadline,
          priority,
          created_at,
          clients!inner(id, name, email),
          tasks(id, name, status, sequence_order, completed_at)
        `);

      // Apply filters
      if (input.clientName) {
        query = query.ilike("clients.name", `%${input.clientName}%`);
      }

      if (input.status) {
        query = query.eq("status", input.status);
      }

      if (input.priority) {
        query = query.eq("priority", input.priority);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(input.limit);

      console.log("🔍 [PROJECTS TOOL] Found projects:", data?.length);
      console.log("🔍 [PROJECTS TOOL] Raw results:", data);

      if (error) {
        return {
          success: false,
          error: `Failed to fetch projects: ${error.message}`,
        };
      }

      const projects = (data || []).map((p: any) => {
        const tasks = p.tasks || [];
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(
          (t: any) => t.status === "completed"
        ).length;
        const progress =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        console.log(`📊 [${p.name}] Tasks:`, {
          total: totalTasks,
          completed: completedTasks,
          progress,
          taskList: tasks.map((t: any) => ({ name: t.name, status: t.status })),
        });

        // Find last completed task (most recent by sequence_order among completed tasks)
        const completedTaskList = tasks
          .filter((t: any) => t.status === "completed")
          .sort(
            (a: any, b: any) =>
              (b.sequence_order || 0) - (a.sequence_order || 0)
          );
        const lastCompletedTask =
          completedTaskList.length > 0 ? completedTaskList[0].name : null;

        return {
          id: p.id,
          name: p.name,
          client: p.clients?.name || "N/A",
          clientEmail: p.clients?.email || "N/A",
          description: p.description,
          status: p.status,
          budget: p.budget_amount,
          spent: p.actual_cost,
          deadline: p.deadline,
          priority: p.priority,
          progress,
          lastCompletedTask,
          totalTasks,
          completedTasks,
        };
      });

      return {
        success: true,
        count: projects.length,
        projects,
        message: `✅ Found ${projects.length} projects${
          input.clientName ? ` for client "${input.clientName}"` : ""
        }`,
      };
    } catch (error) {
      console.error("❌ [PROJECTS TOOL] Error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to list projects",
      };
    }
  },
});

/**
 * TOOL 9: Get Project Details (with full task breakdown)
 */
export const getProjectDetailsTool = tool({
  description:
    "Get complete project details including progress, tasks, materials, and client info. Use this to show project status, progress percentage, and task breakdown.",
  inputSchema: z.object({
    projectId: z.string().optional().describe("Project UUID if known"),
    projectName: z
      .string()
      .optional()
      .describe("Project name (partial match allowed)"),
    showEditForm: z.boolean().optional().describe("Show edit form immediately"),
  }),
  execute: async ({ projectId, projectName, showEditForm }) => {
    try {
      console.log("📊 GET PROJECT DETAILS:", { projectId, projectName });

      if (!projectId && !projectName) {
        return {
          success: false,
          error: "Please provide either projectId or projectName",
        };
      }

      // STEP 1: Find project
      let query = supabase.from("projects").select(
        `
        id, 
        name, 
        status, 
        deadline, 
        budget_amount,
        actual_cost,
        
        clients!inner(id, name, email, phone, company)
      `
      );

      if (projectId) {
        query = query.eq("id", projectId);
      } else if (projectName) {
        query = query.ilike("name", `%${projectName}%`);
      }

      const { data: projects, error: projectError } = await query;

      if (projectError) {
        console.error("❌ Project fetch error:", projectError);
        return {
          success: false,
          error: `Database error: ${projectError.message}`,
        };
      }

      if (!projects || projects.length === 0) {
        return {
          success: false,
          error: `Project "${projectName || projectId}" not found`,
        };
      }

      // Handle multiple matches
      if (projects.length > 1) {
        return {
          success: false,
          multipleMatches: true,
          matches: projects.map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status,
          })),
          error: `Multiple projects found. Please specify exact project name or use project ID.`,
        };
      }

      const project = projects[0];
      console.log("✅ Found project:", project.name);

      // STEP 2: Fetch ALL tasks for this project
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select(
          "id, name, status, estimated_hours, actual_hours, sequence_order, completed_at"
        )
        .eq("project_id", project.id)
        .order("sequence_order", { ascending: true });

      if (tasksError) {
        console.error("❌ Tasks fetch error:", tasksError);
        return {
          success: false,
          error: `Failed to fetch tasks: ${tasksError.message}`,
        };
      }

      console.log("📋 Tasks fetched:", tasks?.length || 0);

      // STEP 3: Calculate progress
      const totalTasks = tasks?.length || 0;
      const completedTasks =
        tasks?.filter((t) => t.status === "completed").length || 0;
      const inProgressTasks =
        tasks?.filter((t) => t.status === "in_progress").length || 0;
      const pendingTasks =
        tasks?.filter((t) => t.status === "pending").length || 0;

      const progress =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      console.log("📊 Progress:", progress, "%");
      console.log("✅ Completed:", completedTasks, "/", totalTasks);

      // STEP 4: Get next steps
      const nextSteps =
        tasks
          ?.filter((t) => t.status === "pending" || t.status === "in_progress")
          .slice(0, 3)
          .map((t) => t.name) || [];

      // STEP 5: Fetch materials
      const { data: projectMaterials } = await supabase
        .from("project_materials")
        .select(
          `
          id, 
          quantity, 
          quantity_used,
          materials!inner(id, name, unit, unit_cost)
        `
        )
        .eq("project_id", project.id);

      const materials =
        projectMaterials?.map((pm: any) => ({
          id: pm.id,
          name: pm.materials?.name,
          quantity: pm.quantity,
          used: pm.quantity_used,
          unit: pm.materials?.unit,
          unitCost: pm.materials?.unit_cost,
          totalCost: (pm.materials?.unit_cost || 0) * (pm.quantity || 0),
        })) || [];

      // STEP 6: Build response
      const client = Array.isArray(project.clients)
        ? project.clients[0]
        : project.clients;

      return {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          status: project.status,
          deadline: project.deadline,
          budget: project.budget_amount,
          actualCost: project.actual_cost,
          progress: progress,

          client: {
            id: client?.id,
            name: client?.name,
            email: client?.email,
            phone: client?.phone,
            company: client?.company,
          },
          tasks: {
            total: totalTasks,
            completed: completedTasks,
            inProgress: inProgressTasks,
            pending: pendingTasks,
            list: tasks?.map((t) => ({
              id: t.id,
              name: t.name,
              status: t.status,
              estimatedHours: t.estimated_hours,
              actualHours: t.actual_hours,
              sequenceOrder: t.sequence_order,
              completedAt: t.completed_at,
            })),
            nextSteps: nextSteps,
          },
          materials: materials,
        },
        showEditForm: showEditForm || false,
        message: `Project "${project.name}" is ${progress}% complete (${completedTasks}/${totalTasks} tasks)`,
      };
    } catch (error) {
      console.error("❌ GET PROJECT DETAILS Error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get project details",
      };
    }
  },
});

/**
 * TOOL 10: Update Project (status, deadline, budget, etc.)
 */
export const updateProjectTool = tool({
  description:
    "Update project information including status, deadline, budget, description, and project type. Supports status workflow: draft → quoted → waiting_approval → in_progress → invoiced → completed",
  inputSchema: z.object({
    projectId: z.string().optional().describe("Project ID (preferred)"),
    projectName: z.string().optional().describe("Project name to update"),
    status: z
      .enum([
        "draft",
        "quoted",
        "waiting_approval",
        "in_progress",
        "invoiced",
        "completed",
      ])
      .optional(),
    description: z.string().optional().describe("Project description"),
    budget: z.number().optional().describe("Project budget"),
    deadline: z.string().optional().describe("Project deadline"),
    projectType: z
      .enum(["2D", "3D", "OTHERS"])
      .optional()
      .describe("Project type (triggers task auto-population if changed)"),
    priority: z.string().optional().describe("Project priority"),
  }),
  execute: async ({
    projectId,
    projectName,
    status,
    description,
    budget,
    deadline,
    projectType,
    priority,
  }) => {
    try {
      // Find project
      let query = supabase.from("projects").select("id, project_type");

      if (projectId) {
        query = query.eq("id", projectId);
      } else if (projectName) {
        query = query.ilike("name", projectName);
      } else {
        return { success: false, error: "Project ID or Name required" };
      }

      const { data: project, error: fetchError } = await query
        .limit(1)
        .single();

      if (fetchError || !project) {
        return {
          success: false,
          error: `Project not found`,
        };
      }

      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (status) updates.status = status;
      if (description) updates.description = description;
      if (budget) updates.budget_amount = budget;
      if (deadline) updates.deadline = deadline;
      if (projectType) updates.project_type = projectType;
      if (priority) updates.priority = priority;

      const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", project.id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to update project: ${error.message}`,
        };
      }

      // Check if we need to auto-populate tasks
      let tasksMessage = "";
      if (projectType && projectType !== project.project_type) {
        // Check if tasks already exist
        const { count } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("project_id", project.id);

        if (count === 0) {
          // Auto-populate tasks
          const taskTemplates =
            TASK_TEMPLATES[projectType as keyof typeof TASK_TEMPLATES] ||
            TASK_TEMPLATES["3D"];

          const tasksToInsert = taskTemplates.map(
            (template: any, index: number) => ({
              project_id: project.id,
              name: template.name,
              status: "pending",
              priority: template.priority || "medium",
              estimated_hours: Number(
                (template.estimated_minutes / 60).toFixed(2)
              ),
              sequence_order: index + 1,
              assigned_to: template.assigned_to || null,
            })
          );

          const { error: tasksError } = await supabase
            .from("tasks")
            .insert(tasksToInsert);

          if (!tasksError) {
            tasksMessage = ` | 📋 Auto-populated ${tasksToInsert.length} tasks for ${projectType} workflow`;
          } else {
            console.error("Failed to auto-populate tasks:", tasksError);
          }
        }
      }

      return {
        success: true,
        project: data,
        message: `✅ Updated project "${data.name}"${tasksMessage}`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update project",
      };
    }
  },
});

/**
 * TOOL 12: Create Project From Quotation
 */
export const createProjectFromQuotationTool = tool({
  description:
    "⚠️ INTERNAL TOOL ONLY: Create a new project from an approved quotation (for programmatic use). DO NOT USE THIS for user requests like 'create project from QTN-XXX' - use showCreateProjectFormTool instead which provides a better interactive UI experience.",
  inputSchema: z.object({
    quotationNumber: z
      .string()
      .describe("Quotation Number (e.g., QTN-2024-001)"),
    projectName: z
      .string()
      .optional()
      .describe("Optional override for project name"),
  }),
  execute: async ({ quotationNumber, projectName }) => {
    try {
      // 1. Fetch Quotation
      const { data: quotation, error: qError } = await supabase
        .from("quotations")
        .select("*, clients(*)")
        .eq("quotation_number", quotationNumber)
        .single();

      if (qError || !quotation) {
        return {
          success: false,
          error: `Quotation ${quotationNumber} not found`,
        };
      }

      // 2. Prepare Draft Project Data (Do NOT create yet)
      const draftProjectName = projectName || `Project - ${quotationNumber}`;

      // Fetch client name for display
      const { data: client } = await supabase
        .from("clients")
        .select("name")
        .eq("id", quotation.client_id)
        .single();

      return {
        success: true,
        project: {
          id: "new", // Indicator for UI that this is a new project
          name: draftProjectName,
          client_id: quotation.client_id,
          clientName: client?.name || "Unknown Client",
          budget_amount: quotation.total_amount,
          description: `Created from Quotation ${quotationNumber}`,
          status: "in_progress",
          project_type: "3D", // Default
          quotationId: quotation.id, // Pass for linking later
        },
        showEditForm: true,
        message: `✅ Found Quotation ${quotationNumber}. Please review and create the project.`,
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
 * TOOL 13: Create Prototype Project
 */
export const createPrototypeProjectTool = tool({
  description: "Create a prototype project (billable separately).",
  inputSchema: z.object({
    clientName: z.string().describe("Client Name"),
    name: z.string().describe("Prototype Name"),
    description: z.string().optional(),
    budget: z.number().optional(),
  }),
  execute: async ({ clientName, name, description, budget }) => {
    try {
      // 1. Find Client
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .ilike("name", `%${clientName}%`)
        .limit(1)
        .single();

      if (!client) {
        return { success: false, error: `Client "${clientName}" not found` };
      }

      // 2. Create Project with Prototype Tag
      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          client_id: client.id,
          name: `${name} (Prototype)`,
          description: description,
          budget_amount: budget || 0,
          status: "in_progress",
          project_type: "prototype",
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        project: project,
        message: `✅ Prototype project "${project.name}" created.`,
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
 * TOOL 11: Add Project Material (with (Reserve + Inventory Deduction))
 */
export const addProjectMaterialTool = tool({
  description: "Add material to a project and reserve quantity",
  inputSchema: z.object({
    projectName: z.string().describe("Project name"),
    materialName: z.string().describe("Material name"),
    quantityNeeded: z.number().describe("Quantity needed for project"),
    notes: z.string().optional().describe("Notes about this material usage"),
  }),
  execute: async (input) => {
    try {
      // Find project
      const { data: projectData } = await supabase
        .from("projects")
        .select("id")
        .ilike("name", input.projectName)
        .limit(1)
        .single();

      if (!projectData) {
        return {
          success: false,
          error: `Project "${input.projectName}" not found`,
        };
      }

      // Find material
      let materialData = null;
      const { data: existingMaterial } = await supabase
        .from("materials")
        .select("id, name, quantity_available, quantity_reserved, unit_cost")
        .ilike("name", input.materialName)
        .limit(1)
        .maybeSingle();

      if (existingMaterial) {
        materialData = existingMaterial;
      } else {
        // Auto-create material if not found
        const { data: newMaterial, error: createError } = await supabase
          .from("materials")
          .insert({
            name: input.materialName,
            unit: "kg",
            unit_cost: 0,
            quantity_available: input.quantityNeeded, // Set initial stock to match needed quantity
            quantity_reserved: 0,
            category: "raw_material",
          })
          .select("id, name, quantity_available, quantity_reserved, unit_cost")
          .single();

        if (createError || !newMaterial) {
          return {
            success: false,
            error: `Could not create material "${input.materialName}": ${createError?.message}`,
          };
        }
        materialData = newMaterial;
      }

      // Check availability
      if (materialData.quantity_available < input.quantityNeeded) {
        return {
          success: false,
          error: `Insufficient material. Available: ${materialData.quantity_available}, Needed: ${input.quantityNeeded}`,
        };
      }

      // Add to project_materials - MUST provide quantity (NOT nullable)
      const { error: insertError } = await supabase
        .from("project_materials")
        .insert({
          project_id: projectData.id,
          material_id: materialData.id,
          quantity: input.quantityNeeded, // ← THIS IS REQUIRED (NOT nullable)
          quantity_reserved: input.quantityNeeded,
          reserved_at: new Date().toISOString(),
          quantity_used: null, // ← CAN be NULL (nullable)
          cost_at_time: null, // ← CAN be NULL
          used_date: null,
          notes: input.notes || null,
        });

      if (insertError) {
        return {
          success: false,
          error: `Failed to add material: ${insertError.message}`,
        };
      }

      // Update material inventory
      await supabase
        .from("materials")
        .update({
          quantity_available:
            materialData.quantity_available - input.quantityNeeded,
          quantity_reserved:
            (materialData.quantity_reserved || 0) + input.quantityNeeded,
        })
        .eq("id", materialData.id);

      return {
        success: true,
        material: {
          name: materialData.name,
          quantityReserved: input.quantityNeeded,
          costPerUnit: materialData.unit_cost,
          totalCost: input.quantityNeeded * materialData.unit_cost,
        },
        message: `✅ Material "${materialData.name}" reserved for project`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to add material to project",
      };
    }
  },
});

/**
 * TOOL 12: Update Task Progress (with Material Usage Tracking)
 */
export const updateTaskProgressTool = tool({
  description:
    'Update task status and mark complete. Automatically moves reserved materials to "used" and recalculates project progress percentage.',
  inputSchema: z.object({
    projectName: z.string().describe("Project name"),
    taskName: z.string().describe("Task name to update"),
    status: z
      .enum(["pending", "in_progress", "completed", "blocked", "approved"])
      .describe("New task status"),
    notes: z.string().optional().describe("Notes about task completion"),
  }),
  execute: async (input) => {
    try {
      // ✅ STEP 1: Find project
      const { data: projectData } = await supabase
        .from("projects")
        .select("id, name")
        .ilike("name", `%${input.projectName}%`)
        .limit(1);

      if (!projectData || projectData.length === 0) {
        return {
          success: false,
          error: `Project "${input.projectName}" not found`,
        };
      }

      const projectId = projectData[0].id;

      // ✅ STEP 2: Find task
      const { data: taskData } = await supabase
        .from("tasks")
        .select("id, name, estimated_hours, status")
        .eq("project_id", projectId)
        .ilike("name", `%${input.taskName}%`)
        .limit(1);

      if (!taskData || taskData.length === 0) {
        return {
          success: false,
          error: `Task "${input.taskName}" not found in this project`,
        };
      }

      const task = taskData[0];

      // ✅ STEP 3: Update task status
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          status: input.status,
          completed_at:
            input.status === "completed" ? new Date().toISOString() : undefined,
          notes: input.notes ?? undefined,
        })
        .eq("id", task.id);

      if (updateError) {
        return {
          success: false,
          error: `Failed to update task: ${updateError.message}`,
        };
      }

      // ✅ STEP 4: If task completed, move reserved materials to used
      let materialsProcessed = 0;
      if (input.status === "completed") {
        // Get all reserved materials for this project
        const { data: reservedMaterials } = await supabase
          .from("project_materials")
          .select(
            "id, material_id, quantity_reserved, materials(name, unit_cost)"
          )
          .eq("project_id", projectId)
          .not("quantity_reserved", "is", null);

        if (reservedMaterials && reservedMaterials.length > 0) {
          for (const allocation of reservedMaterials) {
            const material = allocation.materials as any;
            const quantityReserved = allocation.quantity_reserved || 0;
            const unitCost = material?.unit_cost || 0;

            // Move from reserved → used
            await supabase
              .from("project_materials")
              .update({
                quantity_reserved: null,
                reserved_at: null,
                quantity_used: quantityReserved,
                cost_at_time: unitCost,
                used_date: new Date().toISOString().split("T")[0],
              })
              .eq("id", allocation.id);

            // Update materials.quantity_reserved
            const { data: materialData } = await supabase
              .from("materials")
              .select("quantity_reserved")
              .eq("id", allocation.material_id)
              .single();

            const currentReserved = materialData?.quantity_reserved || 0;

            // Update
            await supabase
              .from("materials")
              .update({
                quantity_reserved: currentReserved - quantityReserved,
              })
              .eq("id", allocation.material_id);

            materialsProcessed++;
          }
        }
      }

      // ✅ STEP 5: Recalculate project progress
      const { data: allTasks } = await supabase
        .from("tasks")
        .select("status, estimated_hours")
        .eq("project_id", projectId);

      const completedHours =
        allTasks
          ?.filter((t: any) => t.status === "completed")
          .reduce((sum: number, t: any) => sum + (t.estimated_hours || 0), 0) ||
        0;
      const totalHours =
        allTasks?.reduce(
          (sum: number, t: any) => sum + (t.estimated_hours || 0),
          0
        ) || 0;

      const progressPercentage =
        totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;

      // Update project progress
      await supabase
        .from("projects")
        .update({ progress_percentage: progressPercentage })
        .eq("id", projectId);

      return {
        success: true,
        task: {
          name: task.name,
          status: input.status,
          estimatedMinutes: task.estimated_hours,
        },
        projectProgress: `${progressPercentage}%`,
        materialsProcessed,
        message: `✅ Updated task "${task.name}" to ${
          input.status
        }. Project progress: ${progressPercentage}%${
          materialsProcessed > 0
            ? `. Moved ${materialsProcessed} materials from reserved to used.`
            : ""
        }`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update task",
      };
    }
  },
});

// get single project
export const getProjectTool = tool({
  description:
    "Get complete details of a project by name or ID, including tasks, materials, and client info",
  inputSchema: z.object({
    projectId: z.string().optional().describe("Project UUID (if known)"),
    projectName: z
      .string()
      .optional()
      .describe("Project name (partial match allowed)"),
    showEditForm: z.boolean().optional().describe("Show edit form immediately"),
  }),
  execute: async ({ projectId, projectName, showEditForm }) => {
    try {
      if (!projectId && !projectName) {
        return {
          success: false,
          error: "Please provide either projectId or projectName",
        };
      }

      let query = supabase
        .from("projects")
        .select(
          `
          *,
          clients:client_id(id, name, email, phone, company),
          tasks:tasks(id, name, status, estimated_hours, actual_hours, due_date, sequence_order),
          project_materials:project_materials(
            id,
            quantity,
            quantity_used,
            materials(id, name, unit, unit_cost)
          )
        `
        )
        .order("sequence_order", { foreignTable: "tasks", ascending: true });

      if (projectId) {
        query = query.eq("id", projectId);
      } else if (projectName) {
        query = query.ilike("name", `%${projectName}%`);
      }

      const { data, error } = await query;
      console.log("getProjectTool raw data:", data, "error:", error);

      if (error) {
        return { success: false, error: `Database error: ${error.message}` };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: `No project found matching "${projectId || projectName}"`,
        };
      }

      if (data.length > 1) {
        return {
          success: true,
          multipleMatches: true,
          matches: data.map((p: any) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            client: p.clients?.name || "Unknown",
            deadline: p.deadline,
          })),
          message: `Found ${data.length} projects matching "${projectName}". Please specify the project ID.`,
        };
      }

      const project = data[0];
      const tasks = project.tasks || [];
      const progress = calculateProjectProgress(tasks);

      return {
        success: true,
        showEditForm: showEditForm || false,
        project: {
          id: project.id,
          name: project.name,
          status: project.status,
          deadline: project.deadline,
          client: project.clients,
          budget: project.budget_amount,
          totalAmount: project.total_amount,
          actualCost: project.actual_cost,
          progress,
          tasks: tasks.map((t: any) => ({
            id: t.id,
            name: t.name,
            status: t.status,
            estimatedHours: t.estimated_hours,
            actualHours: t.actual_hours,
            dueDate: t.due_date,
            sequenceOrder: t.sequence_order,
          })),
          materials:
            project.project_materials?.map((pm: any) => ({
              id: pm.id,
              name: pm.materials?.name,
              quantity: pm.quantity,
              used: pm.quantity_used,
              unit: pm.materials?.unit,
              unitCost: pm.materials?.unit_cost,
              totalCost: (pm.materials?.unit_cost || 0) * (pm.quantity || 0),
            })) || [],
        },
        message: `✅ Retrieved project "${project.name}" (${progress}% complete)`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error fetching project",
      };
    }
  },
});

/**
 * TOOL: Get Project Progress
 */
export const getProjectProgressTool = tool({
  description:
    "Calculate project progress percentage, task completion status, and next steps. Use this when asked about progress, how much is done, or completion status for a project.",
  inputSchema: z.object({
    project: z.string().describe("Project name or ID"),
  }),
  execute: async ({ project }) => {
    try {
      console.log("📊 GET PROJECT PROGRESS:", project);

      // STEP 1: Find project by name
      const { data: projects, error: projectSearchError } = await supabase
        .from("projects")
        .select("id, name")
        .ilike("name", `%${project}%`)
        .limit(1);

      if (projectSearchError) {
        console.error("❌ Project search error:", projectSearchError);
        return {
          success: false,
          error: `Database error: ${projectSearchError.message}`,
        };
      }

      if (!projects || projects.length === 0) {
        return {
          success: false,
          error: `Project "${project}" not found`,
        };
      }

      const projectId = projects[0].id;
      const projectName = projects[0].name;

      console.log("✅ Found project:", projectName, "ID:", projectId);

      // STEP 2: Fetch tasks separately (avoid complex join)
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select(
          "id, name, status, estimated_hours, actual_hours, sequence_order"
        )
        .eq("project_id", projectId)
        .order("sequence_order", { ascending: true });

      if (tasksError) {
        console.error("❌ Tasks fetch error:", tasksError);
        return {
          success: false,
          error: `Failed to fetch tasks: ${tasksError.message}`,
        };
      }

      console.log("📋 Tasks found:", tasks?.length || 0);

      // STEP 3: Calculate progress
      const totalTasks = tasks?.length || 0;
      const completedTasks =
        tasks?.filter((t) => t.status === "completed").length || 0;
      const inProgressTasks =
        tasks?.filter((t) => t.status === "in_progress").length || 0;
      const pendingTasks =
        tasks?.filter((t) => t.status === "pending").length || 0;

      const progressPercentage =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      console.log("📊 Progress:", progressPercentage, "%");
      console.log("✅ Completed:", completedTasks, "/", totalTasks);

      // STEP 4: Get next steps (next 3 pending/in-progress tasks)
      const nextStepsList =
        tasks
          ?.filter((t) => t.status === "pending" || t.status === "in_progress")
          .slice(0, 3)
          .map((t) => t.name) || [];

      const nextSteps = nextStepsList.join(", ") || "All tasks completed!";

      // STEP 5: Return structured response
      return {
        success: true,
        projectId,
        projectName,
        progress: {
          percentage: progressPercentage,
          completedTasks,
          totalTasks,
          inProgressTasks,
          pendingTasks,
          nextSteps,
        },
        message: `Project "${projectName}" is ${progressPercentage}% complete (${completedTasks}/${totalTasks} tasks)`,
      };
    } catch (error) {
      console.error("❌ GET PROJECT PROGRESS Error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get project progress",
      };
    }
  },
});

/**
 * TOOL: Estimate Project Cost
 */
export const estimateProjectCostTool = tool({
  description:
    "Calculate and estimate the total cost breakdown for a project, including labor costs, material costs, overhead percentage, and final estimate. Use this when asked to estimate, calculate, or break down project costs.",
  inputSchema: z.object({
    projectId: z
      .string()
      .uuid()
      .describe("Project name or ID to estimate costs for"),
    laborHours: z
      .number()
      .positive()
      .optional()
      .describe("Total labor hours (if known)"),
    laborRate: z
      .number()
      .positive()
      .optional()
      .describe("Hourly labor rate (default: 500)"),
    materialCost: z
      .number()
      .optional()
      .describe(
        "Total material cost (default: calculate from project materials)"
      ),
    overheadPercentage: z
      .number()
      .min(0)
      .max(100)
      .default(15)
      .describe("Overhead percentage (default: 15%)"),
  }),
  execute: async ({
    projectId,
    laborHours,
    laborRate = 500,
    materialCost,
    overheadPercentage = 15,
  }) => {
    try {
      let resolvedProjectId = projectId;
      if (
        !projectId.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        )
      ) {
        // Not a UUID, search by name
        const { data: foundProject } = await supabase
          .from("projects")
          .select("id")
          .ilike("name", `%${projectId}%`)
          .single();

        if (!foundProject) {
          return failure(`Project "${projectId}" not found`);
        }
        resolvedProjectId = foundProject.id;
      }
      // Fetch project with tasks and materials
      const { data: project, error } = await supabase
        .from("projects")
        .select(
          `
          id,
          name,
          tasks:tasks(estimated_hours),
          project_materials:project_materials(quantity, materials(unit_cost))
        `
        )
        .eq("id", projectId)
        .single();

      if (error || !project) {
        return failure(`Project not found: ${projectId}`);
      }

      // Calculate labor cost
      const totalLaborHours =
        laborHours ||
        project.tasks?.reduce(
          (sum: number, task: any) => sum + (task.estimated_hours || 0),
          0
        ) ||
        0;
      const laborCost = totalLaborHours * laborRate;

      // Calculate material cost
      const totalMaterialCost =
        materialCost ||
        project.project_materials?.reduce((sum: number, pm: any) => {
          return sum + pm.quantity * (pm.materials?.unit_cost || 0);
        }, 0) ||
        0;

      // Calculate overhead
      const subtotal = laborCost + totalMaterialCost;
      const overhead = subtotal * (overheadPercentage / 100);
      const totalEstimate = subtotal + overhead;

      return success({
        projectId,
        projectName: project.name,
        breakdown: {
          laborHours: totalLaborHours,
          laborRate,
          laborCost,
          materialCost: totalMaterialCost,
          subtotal,
          overheadPercentage,
          overhead,
          totalEstimate,
        },
        message: `💰 Estimated project cost: ₹${totalEstimate.toLocaleString(
          "en-IN"
        )}`,
      });
    } catch (error) {
      return failure(getErrorMessage(error));
    }
  },
});

/**
 * TOOL: Add Project Photo
 */
export const addProjectPhotoTool = tool({
  description: "Add a photo to a project with optional caption and category",
  inputSchema: z.object({
    projectId: z.string().uuid().describe("Project ID"),
    fileUrl: z.string().url().describe("URL of the uploaded photo"),
    caption: z.string().optional().describe("Photo caption"),
    category: z
      .enum(["progress", "completed", "reference", "other"])
      .default("progress")
      .describe("Photo category"),
    thumbnailUrl: z.string().url().optional().describe("Thumbnail URL"),
  }),
  execute: async ({
    projectId,
    fileUrl,
    caption,
    category = "progress",
    thumbnailUrl,
  }) => {
    try {
      // Verify project exists
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("id", projectId)
        .single();

      if (projectError || !project) {
        return failure(`Project not found: ${projectId}`);
      }

      // Insert photo
      const { data, error } = await supabase
        .from("photos")
        .insert({
          project_id: projectId,
          file_url: fileUrl,
          caption: caption || null,
          category,
          thumbnail_url: thumbnailUrl || null,
        })
        .select()
        .single();

      if (error) {
        return failure(`Failed to add photo: ${error.message}`);
      }

      return success({
        photoId: data.id,
        projectId,
        projectName: project.name,
        fileUrl: data.file_url,
        message: `📸 Photo added to project "${project.name}"`,
      });
    } catch (error) {
      return failure(getErrorMessage(error));
    }
  },
});

/**
 * TOOL: Calculate Project Profitability
 */
export const calculateProjectProfitabilityTool = tool({
  description:
    "Calculate financial profitability, profit/loss, revenue, costs, and margin percentage for a project. Use this when asked to 'calculate profit', 'profitability', 'margin', or 'financial performance'.",
  inputSchema: z.object({
    project: z.string().describe("Project name or ID"),
  }),
  execute: async ({ project }) => {
    try {
      // Resolve project by name or ID
      let projectId = project;
      if (
        !project.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        )
      ) {
        const { data: foundProjects } = await supabase
          .from("projects")
          .select("id")
          .ilike("name", `%${project}%`)
          .limit(1);

        if (!foundProjects || foundProjects.length === 0) {
          return failure(`Project "${project}" not found`);
        }
        projectId = foundProjects[0].id;
      }

      const { data: projectData, error } = await supabase
        .from("projects")
        .select(
          `
          id,
          name,
          total_amount,
          actual_cost,
          budget_amount,
          advance_paid,
          invoices_enhanced:invoices_enhanced(total_amount, paid_amount)
        `
        )
        .eq("id", projectId)
        .single();

      if (error || !projectData) {
        return failure(`Project not found: ${project}`);
      }

      const quotedAmount =
        projectData.total_amount || projectData.budget_amount || 0;
      const actualCost = projectData.actual_cost || 0;
      const advancePaid = projectData.advance_paid || 0;

      const totalInvoiced =
        projectData.invoices_enhanced?.reduce(
          (sum: number, inv: any) => sum + (inv.total_amount || 0),
          0
        ) || 0;
      const totalPaid =
        projectData.invoices_enhanced?.reduce(
          (sum: number, inv: any) => sum + (inv.paid_amount || 0),
          0
        ) || 0;

      const profit = quotedAmount - actualCost;
      const profitMargin = quotedAmount > 0 ? (profit / quotedAmount) * 100 : 0;
      const outstandingAmount = totalInvoiced - totalPaid;

      return success({
        projectId,
        projectName: projectData.name,
        profitability: {
          revenue: quotedAmount,
          costs: actualCost,
          profit,
          margin: parseFloat(profitMargin.toFixed(2)),
          advancePaid,
          totalInvoiced,
          totalPaid,
          outstandingAmount,
        },
        status: profit > 0 ? "profitable" : profit < 0 ? "loss" : "breakeven",
        message: `💰 Project ${profit > 0 ? "profit" : "loss"}: ₹${Math.abs(
          profit
        ).toLocaleString("en-IN")} (${profitMargin.toFixed(1)}% margin)`,
      });
    } catch (error) {
      return failure(getErrorMessage(error));
    }
  },
});

export const startTimeEntryTool = tool({
  name: "startTimeEntryTool",
  description: "Start time tracking for a specific task or project",
  inputSchema: z.object({
    taskId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    userId: z.string().uuid().describe("User starting this timer"),
  }),
  async execute(input: {
    userId: string;
    taskId?: string;
    projectId?: string;
  }): Promise<any> {
    const { taskId, projectId, userId } = input;

    if (!taskId && !projectId) {
      throw new Error("Either taskId or projectId must be provided");
    }

    const { data, error } = await supabase
      .from("timeentries")
      .insert({
        task_id: taskId ?? null,
        project_id: projectId ?? null,
        user_id: userId,
        start_time: new Date().toISOString(),
        end_time: null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      success: true,
      timeEntry: data,
      message: `Started time tracking${taskId ? ` for task` : ` for project`}`,
    };
  },
});

/**
 * TOOL: Stop Time Entry
 * Stops an ongoing time tracking entry and calculates duration.
 */
export const stopTimeEntryTool = tool({
  name: "stopTimeEntryTool",
  description: "Stop a time tracking entry",
  inputSchema: z.object({
    timeEntryId: z.string().uuid(),
  }),
  async execute(input: { timeEntryId: string }): Promise<any> {
    const { timeEntryId } = input;

    // Fetch the existing time entry to check if already stopped
    const { data: existingEntry, error: fetchError } = await supabase
      .from("timeentries")
      .select()
      .eq("id", timeEntryId)
      .single();

    if (fetchError || !existingEntry)
      throw new Error(fetchError?.message ?? "Time entry not found");

    if (existingEntry.end_time) throw new Error("Time entry already stopped");

    const endTime = new Date();
    const startTime = new Date(existingEntry.start_time);
    const durationMs = endTime.getTime() - startTime.getTime();

    // Update the time entry with the end timestamp and duration in minutes
    const { data, error } = await supabase
      .from("timeentries")
      .update({
        end_time: endTime.toISOString(),
        duration_minutes: Math.round(durationMs / 60000),
      })
      .eq("id", timeEntryId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      success: true,
      timeEntry: data,
      duration_minutes: data.duration_minutes,
      message: `Stopped time tracking. Duration: ${data.duration_minutes} minutes.`,
    };
  },
});

export const aiTools = {
  //client management tools 6
  createClientTool,
  updateClientTool,
  listClientsTool,
  getClientTool,
  validateClientDataTool,
  generateClientUpdateTool,
  updateClientStateTool,
  //project management tools 6

  createProjectTool,
  listProjectsTool,
  getProjectDetailsTool,
  updateProjectTool,
  addProjectMaterialTool,
  updateTaskProgressTool,
  getProjectTool,
  getProjectProgressTool,
  estimateProjectCostTool,
  addProjectPhotoTool,
  calculateProjectProfitabilityTool,

  //time tracking tool
  startTimeEntryTool,
  stopTimeEntryTool,
};
