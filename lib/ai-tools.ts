import { tool } from 'ai'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

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
  if (!tasks || tasks.length === 0) return 0
  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  return Math.round((completedTasks / tasks.length) * 100)
}

/**
 * Get next 3 steps to complete for a project
 * @param tasks - Array of task objects
 * @returns Array of next task names
 */
function getNextSteps(tasks: any[]): string[] {
  if (!tasks || tasks.length === 0) return []

  // Filter pending tasks and sort by dependencies
  const pendingTasks = tasks
    .filter((t) => t.status !== 'completed' && t.status !== 'in_progress')
    .sort((a, b) => {
      // Tasks with no dependencies come first
      if (a.depends_on === null && b.depends_on !== null) return -1
      if (a.depends_on !== null && b.depends_on === null) return 1
      return 0
    })
    .slice(0, 3) // Get next 3 tasks

  return pendingTasks.map((t) => t.name || 'Unnamed Task')
}

/**
 * Generate professional client update message based on progress
 * @param progress - Progress percentage (0-100)
 * @param clientName - Name of the client
 * @returns Professional status message
 */
function generateClientMessage(progress: number, clientName: string): string {
  const name = clientName || 'Valued Client'

  if (progress === 0) {
    return `Hi ${name}, we're excited to begin your project! We're currently in the planning and setup phase.`
  } else if (progress < 25) {
    return `Hi ${name}, your project is underway (${progress}% complete). We're in the initial foundation and preparation stage.`
  } else if (progress < 50) {
    return `Hi ${name}, great progress! Your project is ${progress}% complete. We're moving into the detailed work phase.`
  } else if (progress < 75) {
    return `Hi ${name}, we're in the home stretch! Your project is ${progress}% complete. Refinement and detailing underway.`
  } else if (progress < 100) {
    return `Hi ${name}, nearly there! Your project is ${progress}% complete. Final quality checks and touch-ups in progress.`
  } else {
    return `Hi ${name}, congratulations! Your project is 100% complete and ready for delivery!`
  }
}

/**
 * Determine if IGST applies based on client state
 * Business location: Karnataka
 * IGST applies if client is NOT in Karnataka
 * @param clientStateCode - State code (e.g., 'TN', 'MH', 'KA')
 * @returns boolean - true if IGST applies, false if CGST+SGST applies
 */
function determineGSTType(clientStateCode: string | null): {
  type: 'IGST' | 'CGST+SGST'
  rate: number
} {
  if (!clientStateCode || clientStateCode.toUpperCase() === 'KA') {
    // Same state (Karnataka) = CGST (9%) + SGST (9%) = 18% total
    return { type: 'CGST+SGST', rate: 18 }
  } else {
    // Different state = IGST (18%)
    return { type: 'IGST', rate: 18 }
  }
}

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const ClientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  email: z.string().email('Invalid email format').optional().nullable(),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits').optional().nullable(),
  company: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).optional().nullable(),
  state_code: z.string().length(2, 'State code must be 2 characters').optional().nullable(),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST format')
    .optional()
    .nullable(),
})

/**
 * TOOL 1: Create a new client
 * AI will use this when user says: "Add a new client named John"
 */
export const createClientTool = tool({
  description: 'Create a new client in the system',
  inputSchema: z.object({
    name: z.string().describe('Client name'),
    email: z.string().email().optional().describe('Client email'),
    phone: z.string().optional().describe('Client phone number'),
    company: z.string().optional().describe('Client company name'),
    address: z.string().optional().describe('Client address'),
    notes: z.string().optional().describe('Additional notes about the client'),
    state_code: z.string().optional().describe('State code (KA, MH, TN, etc.)'),
    gstin: z.string().optional().describe('GST ID number'),
    priority: z.enum(['low', 'medium', 'high']).optional().describe('Client priority'),
  }),
  execute: async ({ name, email, phone, company, address, notes, state_code, gstin, priority }) => {
    try {
      // ✅ STEP 1: Check for duplicate by EXACT name match (case-insensitive)
      const { data: existingByName, error: searchError } = await supabase
        .from('clients')
        .select('id, name, email, phone')
        .ilike('name', name)  // Case-insensitive exact match
        .limit(1)

      if (searchError) {
        return {
          success: false,
          error: `Database error: ${searchError.message}`,
        }
      }

      // ✅ If exact name match found, reject creation
      if (existingByName && existingByName.length > 0) {
        const existing = existingByName[0]
        return {
          success: false,
          error: `❌ Client "${name}" already exists in the system`,
          existingClient: {
            id: existing.id,
            name: existing.name,
            email: existing.email || 'Not provided',
            phone: existing.phone || 'Not provided',
          },
          suggestion: `To update this client's information, use the updateClient tool with their name or ID`,
        }
      }

      // ✅ STEP 2: Create the new client
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name,
          email: email || null,
          phone: phone || null,
          company: company || null,
          address: address || null,
          notes: notes || null,
          state_code: state_code ? state_code.toUpperCase() : null,
          gstin: gstin || null,
          priority: priority || 'medium',
        })
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: `Failed to create client: ${error.message}`,
        }
      }

      // ✅ STEP 3: Return success with full details
      return {
        success: true,
        client: {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          address: data.address,
          state_code: data.state_code,
          gstin: data.gstin,
          priority: data.priority,
        },
        message: `✅ Successfully created client "${name}"`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating client',
      }
    }
  },
})  

/**
 * TOOL 2: List all clients with optional filtering
 * AI will use this when user says: "Show me all my clients" or "List high priority clients"
 */
export const listClientsTool = tool({
  description:
    'Retrieve a list of all clients in the system. Can filter by priority level or search by name. Perfect for getting an overview of your client base.',
  inputSchema: z.object({
    priority: z.enum(['low', 'medium', 'high']).optional().describe('Filter by priority level'),
    search: z.string().optional().describe('Search by client name or company'),
    limit: z.number().optional().describe('Maximum number of results (default: 50)'),
  }),
  execute: async (input) => {
    try {
      let query = supabase.from('clients').select('*')

      if (input.priority) {
        query = query.eq('priority', input.priority)
      }

      if (input.search) {
        query = query.or(
          `name.ilike.%${input.search}%,company.ilike.%${input.search}%,email.ilike.%${input.search}%`
        )
      }

      const { data, error, count } = await query.limit(input.limit || 50)

      if (error) {
        return { success: false, error: error.message }
      }

      return {
        success: true,
        total: count || 0,
        clients: data?.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          company: c.company,
          priority: c.priority,
          state: c.state_code,
          hasGST: !!c.gstin,
        })) || [],
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list clients',
      }
    }
  },
})

/**
 * TOOL 3: Get detailed information about a specific client
 * AI will use this when user says: "Tell me about John's details"
 */
export const getClientTool = tool({
  description: 'Retrieve complete details for a specific client including contact info, projects, and tax information.',
  inputSchema: z.object({
    clientId: z.string().describe('The unique identifier of the client'),
  }),
  execute: async (input) => {
    try {
      const { data, error } = await supabase.from('clients').select('*').eq('id', input.clientId).single()

      if (error) {
        return { success: false, error: `Client not found: ${error.message}` }
      }

      // Get client's projects count
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact' })
        .eq('client_id', input.clientId)

      const gstInfo = determineGSTType(data.state_code)

      return {
        success: true,
        client: {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          address: data.address,
          notes: data.notes,
          priority: data.priority,
          state_code: data.state_code,
          gstin: data.gstin,
          gstType: gstInfo.type,
          gstRate: gstInfo.rate,
          projectCount: projectCount || 0,
          created_at: data.created_at,
          updated_at: data.updated_at,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get client details',
      }
    }
  },
})

/**
 * TOOL 4: Update client information (including GST/State details)
 * AI will use this when user says: "Update John's email" or "Add GST number for John"
 */
export const updateClientTool = tool({
  description:
    'Update any client information including contact details, address, priority, and tax information. Can identify client by either their unique ID or by their name. Use this for both regular updates and tax compliance updates.',
  inputSchema: z.object({
    clientId: z.string().optional().describe('The unique identifier of the client (if known)'),
    clientName: z.string().optional().describe('The name of the client to find and update (if ID not provided)'),
    clientEmail: z.string().optional().describe('Email address to disambiguate if multiple clients have same name'),
    clientPhone: z.string().optional().describe('Phone number to disambiguate if multiple clients have same name'),
    email: z.string().email().optional().describe('New email address'),
    phone: z.string().optional().describe('New phone number'),
    company: z.string().optional().describe('New company name'),
    address: z.string().optional().describe('New address'),
    notes: z.string().optional().describe('Updated notes'),
    priority: z.enum(['low', 'medium', 'high']).optional().describe('New priority level'),
    state_code: z.string().optional().describe('New state code for GST/IGST calculation'),
    gstin: z.string().optional().describe('GST Identification Number'),
  }),
  execute: async (input) => {
    try {
      let clientId = input.clientId
      let clientName = input.clientName

      // ✅ STEP 1: Find client by ID or Name
      if (!clientId && !clientName) {
        return {
          success: false,
          error: 'Please provide either a client ID or client name',
        }
      }

      if (!clientId && clientName) {
        // Search by name
        let query = supabase
          .from('clients')
          .select('id, name, email, phone')
          .ilike('name', `%${clientName}%`)

        // ✅ If email or phone provided, use them to disambiguate
        if (input.clientEmail) {
          query = query.ilike('email', `%${input.clientEmail}%`)
        }
        if (input.clientPhone) {
          query = query.eq('phone', input.clientPhone)
        }

        const { data: clients, error: searchError } = await query.limit(5)

        if (searchError || !clients || clients.length === 0) {
          return {
            success: false,
            error: `Client "${clientName}" not found in the system`,
          }
        }

        // ✅ Handle multiple matches
        if (clients.length > 1) {
          const matches = clients
            .map(
              (c) =>
                `${c.name} (ID: ${c.id}, Email: ${c.email || 'N/A'}, Phone: ${c.phone || 'N/A'})`
            )
            .join('\n')

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
          }
        }

        clientId = clients[0].id
        clientName = clients[0].name
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
      }

      const cleanUpdates = Object.fromEntries(
        Object.entries(updateFields).filter(([, v]) => v !== undefined)
      )

      if (Object.keys(cleanUpdates).length === 0) {
        return {
          success: false,
          error: 'No fields to update provided',
        }
      }

      // ✅ STEP 3: Validate state code and gstin if provided
      if (input.state_code || input.gstin) {
        const validationData = {
          state_code: input.state_code,
          gstin: input.gstin,
        }
        ClientSchema.pick({ state_code: true, gstin: true }).parse(validationData)
      }

      // ✅ STEP 4: Update the client
      const updateData = {
        ...cleanUpdates,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      const gstInfo = determineGSTType(data.state_code)

      return {
        success: true,
        message: `✅ Client "${data.name}" updated successfully with the following changes: ${Object.keys(cleanUpdates).join(', ')}`,
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
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update client',
      }
    }
  },
})

/**
 * TOOL 5: Validate client data before creating/updating
 * AI will use this when unsure about data validity
 */
export const validateClientDataTool = tool({
  description:
    'Validate client information before saving to the system. Checks for required fields, proper email format, phone format, and valid GST/State code format. Helps prevent bad data entry.',
  inputSchema: z.object({
    name: z.string().optional().describe('Client name to validate'),
    email: z.string().optional().describe('Email address to validate'),
    phone: z.string().optional().describe('Phone number to validate'),
    state_code: z.string().optional().describe('State code to validate'),
    gstin: z.string().optional().describe('GST number to validate'),
  }),
  execute: async (input) => {
    try {
      const issues: string[] = []

      // Check name
      if (input.name !== undefined) {
        if (!input.name || input.name.trim().length === 0) {
          issues.push('Client name is required and cannot be empty')
        } else if (input.name.length < 2) {
          issues.push('Client name must be at least 2 characters')
        }
      }

      // Check email
      if (input.email !== undefined) {
        if (input.email && !z.string().email().safeParse(input.email).success) {
          issues.push(`"${input.email}" is not a valid email format`)
        }
      }

      // Check phone
      if (input.phone !== undefined) {
        if (input.phone && !/^[0-9]{10}$/.test(input.phone)) {
          issues.push(`"${input.phone}" is not a valid 10-digit phone number`)
        }
      }

      // Check state code
      if (input.state_code !== undefined) {
        if (input.state_code && input.state_code.length !== 2) {
          issues.push(`State code "${input.state_code}" must be exactly 2 characters (e.g., "TN", "MH", "KA")`)
        }
      }

      // Check GSTIN
      if (input.gstin !== undefined) {
        if (
          input.gstin &&
          !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(input.gstin)
        ) {
          issues.push(
            `"${input.gstin}" is not a valid GSTIN format. Valid format: 15 alphanumeric characters`
          )
        }
      }

      if (issues.length === 0) {
        return {
          success: true,
          isValid: true,
          message: 'All provided data is valid!',
        }
      } else {
        return {
          success: true,
          isValid: false,
          issues,
          message: `Found ${issues.length} validation issue(s)`,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      }
    }
  },
})

/**
 * TOOL 6: Generate client update message with project progress
 * Internal use - helps create professional client communications
 */
export const generateClientUpdateTool = tool({
  description:
    'Generate a professional status update message for a client based on their current project progress. Automatically calculates completion percentage and next steps.',
  inputSchema: z.object({
    clientId: z.string().describe('The client ID'),
    projectId: z.string().describe('The project ID'),
  }),
  execute: async (input) => {
    try {
      // Get client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', input.clientId)
        .single()

      if (clientError || !client) {
        return { success: false, error: 'Client not found' }
      }

      // Get project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', input.projectId)
        .single()

      if (projectError || !project) {
        return { success: false, error: 'Project not found' }
      }

      // Get project tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', input.projectId)

      if (tasksError) {
        return { success: false, error: 'Could not fetch project tasks' }
      }

      // Calculate progress and get next steps
      const progress = calculateProjectProgress(tasks || [])
      const nextSteps = getNextSteps(tasks || [])
      const message = generateClientMessage(progress, client.name)

      return {
        success: true,
        update: {
          clientName: client.name,
          projectName: project.name,
          progressPercentage: progress,
          message,
          nextSteps: nextSteps.length > 0 ? nextSteps : ['Project setup and planning'],
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate update',
      }
    }
  },
})

// ============================================
// SECTION 2: PROJECT MANAGEMENT TOOLS (6 tools)
// ============================================

import { TASK_TEMPLATES } from './task-templates'

/**
 * HELPER: Calculate project timeline from task templates
 */
function calculateProjectTimeline(projectType: '2D' | '3D' | 'OTHERS') {
  const tasks = TASK_TEMPLATES[projectType]
  const totalMinutes = tasks.reduce((sum, task) => sum + (task.estimated_minutes || 0), 0)
  
  // Estimate working days: total_minutes / (8 hours * 60 minutes * parallelization_factor)
  // parallelization_factor = 0.75 (assumes 25% of tasks run in parallel)
  const estimatedDays = Math.ceil(totalMinutes / (8 * 60 * 0.75))
  const estimatedEndDate = new Date()
  estimatedEndDate.setDate(estimatedEndDate.getDate() + estimatedDays)
  
  return {
    totalMinutes,
    estimatedDays,
    estimatedEndDate: estimatedEndDate.toISOString().split('T')[0],
  }
}

/**
 * TOOL 7: Create Project (with auto-loaded task template)
 */
export const createProjectTool = tool({
  description:
    'Create a new project for a client. Automatically loads task template based on project type (2D, 3D, OTHERS). Tasks can be assigned to team members.',
  inputSchema: z.object({
    name: z.string().describe('Project name'),
    description: z.string().optional().describe('Project description'),
    clientName: z.string().describe('Client name (must exist in system)'),
    type: z.enum(['2D', '3D', 'OTHERS']).describe('Project type: 2D, 3D, or OTHERS'),
    quotedBudget: z.number().optional().describe('Quoted budget in rupees'),
    deadline: z.string().optional().describe('Project deadline (YYYY-MM-DD format)'),
    notes: z.string().optional().describe('Additional project notes'),
  }),
  execute: async (input) => {
    try {
      // ✅ STEP 1: Verify client exists
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, name')
        .ilike('name', input.clientName)
        .limit(1)

      if (!clientData || clientData.length === 0) {
        return {
          success: false,
          error: `Client "${input.clientName}" not found. Please create the client first.`,
        }
      }

      const clientId = clientData[0].id

      // ✅ STEP 2: Get task template and calculate timeline
      const timeline = calculateProjectTimeline(input.type)
      const finalDeadline = input.deadline || timeline.estimatedEndDate

      // ✅ STEP 3: Create project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: input.name,
          description: input.description || null,
          client_id: clientId,
          type: input.type,
          status: 'draft',
          quoted_budget: input.quotedBudget || null,
          deadline: finalDeadline,
          progress_percentage: 0,
          notes: input.notes || undefined, 
        })
        .select()
        .single()

      if (projectError) {
        return {
          success: false,
          error: `Failed to create project: ${projectError.message}`,
        }
      }

      const projectId = projectData.id

      // ✅ STEP 4: Load task template and create tasks
      const taskTemplate = TASK_TEMPLATES[input.type]
      const tasksToInsert = taskTemplate.map((template) => ({
        project_id: projectId,
        name: template.name,
        status: 'pending',
        estimated_minutes: template.estimated_minutes,
        assigned_to: template.assigned_to,
        depends_on: template.depends_on,
        completed_at: null,
      }))

      const { error: tasksError } = await supabase
        .from('tasks')
        .insert(tasksToInsert)

      if (tasksError) {
        return {
          success: false,
          error: `Failed to create tasks: ${tasksError.message}`,
          projectCreated: projectId,
        }
      }

      return {
        success: true,
        project: {
          id: projectId,
          name: input.name,
          client: clientData[0].name,
          type: input.type,
          status: 'draft',
          budget: input.quotedBudget,
          deadline: finalDeadline,
          estimatedDays: timeline.estimatedDays,
          taskCount: taskTemplate.length,
        },
        message: `✅ Created project "${input.name}" with ${taskTemplate.length} tasks. Estimated completion: ${timeline.estimatedDays} days`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create project',
      }
    }
  },
})

/**
 * TOOL 8: List Projects (with filtering)
 */
export const listProjectsTool = tool({
  description:
    'List all projects with optional filtering by status, client, type, or assigned team member',
  inputSchema: z.object({
    status: z.enum(['draft', 'quoted', 'waiting_approval', 'in_progress', 'invoiced', 'completed']).optional().describe('Filter by project status'),
    clientName: z.string().optional().describe('Filter by client name'),
    type: z.enum(['2D', '3D', 'OTHERS']).optional().describe('Filter by project type'),
    assignedTo: z.enum(['dhanush', 'john', 'external']).optional().describe('Filter by assigned team member'),
    limit: z.number().optional().describe('Number of projects to return (default: 50)'),
  }),
  execute: async (input) => {
    try {
      let query = supabase
        .from('projects')
        .select(
          `
          id,
          name,
          client:clients(name),
          type,
          status,
          quoted_budget,
          deadline,
          progress_percentage,
          created_at
        `
        )

      // Apply filters
      if (input.status) {
        query = query.eq('status', input.status)
      }

      if (input.type) {
        query = query.eq('type', input.type)
      }

      if (input.clientName) {
        query = query.ilike('client.name', `%${input.clientName}%`)
      }

      const { data, error } = await query.limit(input.limit || 50).order('created_at', { ascending: false })

      if (error) {
        return {
          success: false,
          error: `Failed to list projects: ${error.message}`,
        }
      }

      if (!data || data.length === 0) {
        return {
          success: true,
          projects: [],
          message: 'No projects found matching the criteria',
        }
      }

      const projects = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        client: p.client?.name,
        type: p.type,
        status: p.status,
        budget: p.quoted_budget,
        deadline: p.deadline,
        progress: `${p.progress_percentage}%`,
      }))

      return {
        success: true,
        projects,
        total: projects.length,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list projects',
      }
    }
  },
})

/**
 * TOOL 9: Get Project Details (with full task breakdown)
 */
export const getProjectDetailsTool = tool({
  description: 'Get complete details of a project including all tasks, progress, and timeline',
  inputSchema: z.object({
    projectName: z.string().describe('Project name to fetch'),
  }),
  execute: async (input) => {
    try {
      // Find project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(
          `
          id,
          name,
          description,
          client:clients(name, email, phone),
          type,
          status,
          quoted_budget,
          deadline,
          progress_percentage,
          created_at
        `
        )
        .ilike('name', input.projectName)
        .limit(1)

      if (projectError || !projectData || projectData.length === 0) {
        return {
          success: false,
          error: `Project "${input.projectName}" not found`,
        }
      }

      const project = projectData[0]
      const projectId = project.id

      // Get all tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('depends_on', { ascending: true })

      if (tasksError) {
        return {
          success: false,
          error: `Failed to fetch tasks: ${tasksError.message}`,
        }
      }

      // Calculate statistics
      const completedTasks = tasks?.filter((t: any) => t.status === 'completed').length || 0
      const totalTasks = tasks?.length || 0
      const completedMinutes = tasks
        ?.filter((t: any) => t.status === 'completed')
        .reduce((sum: number, t: any) => sum + (t.estimated_minutes || 0), 0) || 0
      const totalMinutes =
        tasks?.reduce((sum: number, t: any) => sum + (t.estimated_minutes || 0), 0) || 0

      const tasksList = tasks?.map((t: any) => ({
        name: t.name,
        status: t.status,
        assigned: t.assigned_to,
        estimatedMinutes: t.estimated_minutes,
        estimatedHours: (t.estimated_minutes / 60).toFixed(1),
      })) || []

      return {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          client: project.client?.[0]?.name,
          clientEmail: project.client?.[0]?.email,
          type: project.type,
          status: project.status,
          budget: project.quoted_budget,
          deadline: project.deadline,
          progress: `${project.progress_percentage}%`,
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: totalTasks - completedTasks,
          list: tasksList,
        },
        timeline: {
          totalMinutes,
          totalHours: (totalMinutes / 60).toFixed(1),
          completedMinutes,
          remainingMinutes: totalMinutes - completedMinutes,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get project details',
      }
    }
  },
})

/**
 * TOOL 10: Update Project (status, deadline, budget, etc.)
 */
export const updateProjectTool = tool({
  description:
    'Update project information including status, deadline, budget, and description. Supports status workflow: draft → quoted → waiting_approval → in_progress → invoiced → completed',
  inputSchema: z.object({
    projectName: z.string().describe('Project name to update'),
    status: z
      .enum(['draft', 'quoted', 'waiting_approval', 'in_progress', 'invoiced', 'completed'])
      .optional()
      .describe('New project status'),
    deadline: z.string().optional().describe('New deadline (YYYY-MM-DD)'),
    quotedBudget: z.number().optional().describe('Update quoted budget'),
    description: z.string().optional().describe('Update project description'),
    notes: z.string().optional().describe('Update project notes'),
  }),
  execute: async (input) => {
    try {
      // Find project
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, name, status')
        .ilike('name', input.projectName)
        .limit(1)

      if (!projectData || projectData.length === 0) {
        return {
          success: false,
          error: `Project "${input.projectName}" not found`,
        }
      }

      const projectId = projectData[0].id

      // Build update object
      const updateData: Record<string, any> = {}
      if (input.status) updateData.status = input.status
      if (input.deadline) updateData.deadline = input.deadline
      if (input.quotedBudget) updateData.quoted_budget = input.quotedBudget
      if (input.description) updateData.description = input.description
      if (input.notes) updateData.notes = input.notes

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error: 'No fields to update provided',
        }
      }

      // Update project
      const { data: updated, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: `Failed to update project: ${error.message}`,
        }
      }

      return {
        success: true,
        project: {
          name: updated.name,
          status: updated.status,
          deadline: updated.deadline,
          budget: updated.quoted_budget,
        },
        message: `✅ Updated project "${updated.name}"`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update project',
      }
    }
  },
})

/**
 * TOOL 11: Add Project Material (with (Reserve + Inventory Deduction))
 */
export const addProjectMaterialTool = tool({
  description:
    'Add/reserve material for a project. Automatically deducts from inventory and tracks reserved quantity. Warns if material is low or unavailable.',
  inputSchema: z.object({
    projectName: z.string().describe('Project name'),
    materialName: z.string().describe('Material name from inventory'),
    quantityNeeded: z.number().describe('Quantity to reserve for project'),
    notes: z.string().optional().describe('Additional notes about material usage'),
  }),
  execute: async (input) => {
    try {
      // ✅ STEP 1: Find project
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, name')
        .ilike('name', input.projectName)
        .limit(1)

      if (!projectData || projectData.length === 0) {
        return {
          success: false,
          error: `Project "${input.projectName}" not found`,
        }
      }

      const projectId = projectData[0].id

      // ✅ STEP 2: Find material in inventory
      const { data: materialData } = await supabase
        .from('materials')
        .select('id, name, quantity_available, unit_cost')
        .ilike('name', input.materialName)
        .limit(1)

      if (!materialData || materialData.length === 0) {
        return {
          success: false,
          error: `Material "${input.materialName}" not found in inventory`,
        }
      }

      const material = materialData[0]
      const currentQty = material.quantity_available || 0
      const unitCost = material.unit_cost || 0

      // ✅ STEP 3: Check availability and warn if low
      let warning: string | null = null
      if (currentQty < input.quantityNeeded) {
        warning = `⚠️ WARNING: Only ${currentQty} units available, but ${input.quantityNeeded} requested. Material is UNAVAILABLE - please purchase more stock.`
      } else if (currentQty - input.quantityNeeded < currentQty * 0.2) {
        warning = `⚠️ WARNING: Material stock will be LOW after reservation (${currentQty - input.quantityNeeded} units remaining).`
      }

      // ✅ STEP 4: Check if material already allocated to this project
      const { data: existingAllocation } = await supabase
        .from('project_materials')
        .select('id, quantity_reserved')
        .eq('project_id', projectId)
        .eq('material_id', material.id)
        .limit(1)

      if (existingAllocation && existingAllocation.length > 0) {
        // Material already allocated - update reservation
        const newQty = (existingAllocation[0].quantity_reserved || 0) + input.quantityNeeded
        
        const { error: updateError } = await supabase
          .from('project_materials')
          .update({
            quantity_reserved: newQty,
            reserved_at: new Date().toISOString(),
            notes: input.notes || undefined,
          })
          .eq('id', existingAllocation[0].id)

        if (updateError) {
          return {
            success: false,
            error: `Failed to update material allocation: ${updateError.message}`,
          }
        }
      } else {
        // New allocation - insert record
        const { error: insertError } = await supabase
          .from('project_materials')
          .insert({
            project_id: projectId,
            material_id: material.id,
            quantity_reserved: input.quantityNeeded,
            reserved_at: new Date().toISOString(),
            quantity_used: input.quantity || 0,
            cost_at_time: null,
            used_date: null,
            notes: input.notes || null,
          })

        if (insertError) {
          return {
            success: false,
            error: `Failed to reserve material: ${insertError.message}`,
          }
        }
      }

      // ✅ STEP 5: Reduce inventory (available & increase reserved)
      const newAvailable = currentQty - input.quantityNeeded
      const { data: materialUpdateData, error: reduceError } = await supabase
        .from('materials')
        .update({ 
          quantity_available: newAvailable,
          quantity_reserved: supabase.rpc('increment_reserved', { amount: input.quantityNeeded })
        })
        .eq('id', material.id)
        .select()
        .single()

      if (reduceError) {
        return {
          success: false,
          error: `Failed to update inventory: ${reduceError.message}`,
        }
      }

      return {
        success: true,
        material: {
          name: material.name,
          quantityReserved: input.quantityNeeded,
          inventoryRemaining: newAvailable,
          unitCost: unitCost,
        },
        warning,
        message: `✅ Reserved ${input.quantityNeeded} units of "${material.name}" for project. Available inventory: ${newAvailable} units`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add material',
      }
    }
  },
})

/**
 * TOOL 12: Update Task Progress (with Material Usage Tracking)
 */
export const updateTaskProgressTool = tool({
  description:
    'Update task status and mark complete. Automatically moves reserved materials to "used" and recalculates project progress percentage.',
  inputSchema: z.object({
    projectName: z.string().describe('Project name'),
    taskName: z.string().describe('Task name to update'),
    status: z.enum(['pending', 'in_progress', 'completed', 'blocked', 'approved']).describe('New task status'),
    notes: z.string().optional().describe('Notes about task completion'),
  }),
  execute: async (input) => {
    try {
      // ✅ STEP 1: Find project
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, name')
        .ilike('name', input.projectName)
        .limit(1)

      if (!projectData || projectData.length === 0) {
        return {
          success: false,
          error: `Project "${input.projectName}" not found`,
        }
      }

      const projectId = projectData[0].id

      // ✅ STEP 2: Find task
      const { data: taskData } = await supabase
        .from('tasks')
        .select('id, name, estimated_minutes, status')
        .eq('project_id', projectId)
        .ilike('name', `%${input.taskName}%`)
        .limit(1)

      if (!taskData || taskData.length === 0) {
        return {
          success: false,
          error: `Task "${input.taskName}" not found in this project`,
        }
      }

      const task = taskData[0]

      // ✅ STEP 3: Update task status
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: input.status,
          completed_at: input.status === 'completed' ? new Date().toISOString() : undefined,
          notes: input.notes ?? undefined,
        })
        .eq('id', task.id)

      if (updateError) {
        return {
          success: false,
          error: `Failed to update task: ${updateError.message}`,
        }
      }

      // ✅ STEP 4: If task completed, move reserved materials to used
      let materialsProcessed = 0
      if (input.status === 'completed') {
        // Get all reserved materials for this project
        const { data: reservedMaterials } = await supabase
          .from('project_materials')
          .select('id, material_id, quantity_reserved, materials(name, unit_cost)')
          .eq('project_id', projectId)
          .not('quantity_reserved', 'is', null)

        if (reservedMaterials && reservedMaterials.length > 0) {
          for (const allocation of reservedMaterials) {
            const material = allocation.materials as any
            const quantityReserved = allocation.quantity_reserved || 0
            const unitCost = material?.unit_cost || 0

            // Move from reserved → used
            await supabase
              .from('project_materials')
              .update({
                quantity_reserved: null,
                reserved_at: null,
                quantity_used: quantityReserved,
                cost_at_time: unitCost,
                used_date: new Date().toISOString().split('T')[0],
              })
              .eq('id', allocation.id)

            // Update materials.quantity_reserved
            const { data: materialData } = await supabase
             .from('materials')
              .select('quantity_reserved')
              .eq('id', allocation.material_id)
              .single()

            const currentReserved = materialData?.quantity_reserved || 0

              // Update
            await supabase
              .from('materials')
               .update({
               quantity_reserved: currentReserved - quantityReserved,
             })
             .eq('id', allocation.material_id)

            materialsProcessed++
          }
        }
      }

      // ✅ STEP 5: Recalculate project progress
      const { data: allTasks } = await supabase
        .from('tasks')
        .select('status, estimated_minutes')
        .eq('project_id', projectId)

      const completedMinutes =
        allTasks
          ?.filter((t: any) => t.status === 'completed')
          .reduce((sum: number, t: any) => sum + (t.estimated_minutes || 0), 0) || 0
      const totalMinutes =
        allTasks?.reduce((sum: number, t: any) => sum + (t.estimated_minutes || 0), 0) || 0

      const progressPercentage = totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0

      // Update project progress
      await supabase
        .from('projects')
        .update({ progress_percentage: progressPercentage })
        .eq('id', projectId)

      return {
        success: true,
        task: {
          name: task.name,
          status: input.status,
          estimatedMinutes: task.estimated_minutes,
        },
        projectProgress: `${progressPercentage}%`,
        materialsProcessed,
        message: `✅ Updated task "${task.name}" to ${input.status}. Project progress: ${progressPercentage}%${materialsProcessed > 0 ? `. Moved ${materialsProcessed} materials from reserved to used.` : ''}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update task',
      }
    }
  },
})

// ============================================
// SECTION 3: MATERIAL INVENTORY MANAGEMENT (4 tools)
// ============================================

/**
 * TOOL 13: View Inventory (all materials with status)
 */
export const viewInventoryTool = tool({
  description: 'View all materials in inventory with current stock levels, unit costs, and reorder status',
  inputSchema: z.object({
    showAll: z.boolean().optional().describe('Show all materials (default: true)'),
  }),
  execute: async () => {
    try {
      const { data: materials, error } = await supabase
        .from('materials')
        .select('id, name, unit, quantity_available, quantity_reserved, unit_cost, reorder_level, supplier, updated_at')
        .order('name', { ascending: true })

      if (error) {
        return {
          success: false,
          error: `Failed to fetch inventory: ${error.message}`,
        }
      }

      if (!materials || materials.length === 0) {
        return {
          success: true,
          materials: [],
          message: 'No materials in inventory yet',
        }
      }

      const inventory = materials.map((m: any) => {
        const available = m.quantity_available || 0
        const reserved = m.quantity_reserved || 0
        const reorderLevel = m.reorder_level || 0
        const needsReorder = available < reorderLevel
        const status = needsReorder ? '🔴 REORDER NEEDED' : '✅ OK'

        return {
          name: m.name,
          unit: m.unit,
          available: `${available} ${m.unit}`,
          reserved: `${reserved} ${m.unit}`,
          total: `${available + reserved} ${m.unit}`,
          unitCost: `₹${m.unit_cost}`,
          reorderLevel: `${reorderLevel} ${m.unit}`,
          status,
          supplier: m.supplier || 'N/A',
          lastUpdated: m.updated_at?.split('T')[0],
        }
      })

      const reorderCount = inventory.filter((m: any) => m.status.includes('REORDER')).length

      return {
        success: true,
        materials: inventory,
        total: materials.length,
        needsReorder: reorderCount,
        message: `📊 Inventory: ${materials.length} materials. ${reorderCount} need reordering.`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to view inventory',
      }
    }
  },
})

/**
 * TOOL 14: Add Material Purchase (create/update material + add purchase record)
 */
export const addMaterialPurchaseTool = tool({
  description:
    'Record a material purchase. If material exists, updates stock. If not, asks for material details then creates it and adds purchase.',
  inputSchema: z.object({
    materialName: z.string().describe('Material name (e.g., "Clay", "Brass")'),
    quantityPurchased: z.number().describe('Quantity purchased'),
    unitCost: z.number().describe('Cost per unit (₹)'),
    totalCost: z.number().describe('Total cost (₹)'),
    vendorName: z.string().optional().describe('Vendor/supplier name'),
    invoiceNumber: z.string().optional().describe('Purchase invoice number'),
    purchaseDate: z.string().optional().describe('Purchase date (YYYY-MM-DD, default today)'),
    // For new materials only:
    unit: z.string().optional().describe('Unit of measurement (kg, pcs, liters, etc.) - required for new material'),
    reorderLevel: z.number().optional().describe('Reorder level quantity - required for new material'),
    notes: z.string().optional().describe('Additional notes'),
  }),
  execute: async (input) => {
    try {
      // ✅ STEP 1: Check if material exists
      const { data: existingMaterial } = await supabase
        .from('materials')
        .select('id, name, quantity_available, unit')
        .ilike('name', input.materialName)
        .limit(1)

      let materialId: string

      if (existingMaterial && existingMaterial.length > 0) {
        // Material exists - use it
        materialId = existingMaterial[0].id
      } else {
        // Material doesn't exist - need to create it
        if (!input.unit || !input.reorderLevel) {
          return {
            success: false,
            error: `Material "${input.materialName}" not found. Please provide: unit (e.g., "kg", "pcs"), reorderLevel (e.g., "50"). Retry with all details.`,
            requiresDetails: true,
          }
        }

        // ✅ Create new material
        const { data: newMaterial, error: createError } = await supabase
          .from('materials')
          .insert({
            name: input.materialName,
            unit: input.unit,
            quantity_available: 0, // Will be updated after purchase
            unit_cost: input.unitCost,
            reorder_level: input.reorderLevel,
            supplier: input.vendorName || null,
            notes: input.notes || null,
          })
          .select()
          .single()

        if (createError) {
          return {
            success: false,
            error: `Failed to create material: ${createError.message}`,
          }
        }

        materialId = newMaterial.id
      }

      // ✅ STEP 2: Get vendor ID if provided
      let vendorId = null
      if (input.vendorName) {
        const { data: vendor } = await supabase
          .from('external_vendors')
          .select('id')
          .ilike('name', input.vendorName)
          .limit(1)

        if (vendor && vendor.length > 0) {
          vendorId = vendor[0].id
        }
      }

      // ✅ STEP 3: Create purchase record
      const purchaseDate = input.purchaseDate || new Date().toISOString().split('T')[0]
      const { error: purchaseError } = await supabase
        .from('material_purchases')
        .insert({
          material_id: materialId,
          vendor_id: vendorId,
          quantity: input.quantityPurchased,
          unit_cost: input.unitCost,
          total_cost: input.totalCost,
          invoice_number: input.invoiceNumber || null,
          purchase_date: purchaseDate,
          notes: input.notes || null,
        })

      if (purchaseError) {
        return {
          success: false,
          error: `Failed to record purchase: ${purchaseError.message}`,
        }
      }

      // ✅ STEP 4: Update material quantity_available
      const { data: currentMaterial } = await supabase
        .from('materials')
        .select('quantity_available')
        .eq('id', materialId)
        .single()

      const newQty = (currentMaterial?.quantity_available || 0) + input.quantityPurchased
      const { error: updateError } = await supabase
        .from('materials')
        .update({ quantity_available: newQty, unit_cost: input.unitCost })
        .eq('id', materialId)

      if (updateError) {
        return {
          success: false,
          error: `Failed to update inventory: ${updateError.message}`,
        }
      }

      return {
        success: true,
        purchase: {
          material: input.materialName,
          quantity: input.quantityPurchased,
          unitCost: input.unitCost,
          totalCost: input.totalCost,
          vendor: input.vendorName || 'N/A',
          invoice: input.invoiceNumber || 'N/A',
          date: purchaseDate,
          newInventoryQty: newQty,
        },
        message: `✅ Recorded purchase: ${input.quantityPurchased} units of "${input.materialName}" for ₹${input.totalCost}. New stock: ${newQty}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add purchase',
      }
    }
  },
})

/**
 * TOOL 15: View Material Usage Report
 */
export const viewMaterialUsageReportTool = tool({
  description: 'View material usage history - how much of each material was used in projects and total cost',
  inputSchema: z.object({
    materialName: z.string().optional().describe('Filter by specific material (optional)'),
  }),
  execute: async (input) => {
    try {
      let query = supabase
        .from('project_materials')
        .select(
          `
          id,
          quantity_used,
          cost_at_time,
          used_date,
          material_id,
          materials(name, unit),
          projects(name)
        `
        )
        .not('quantity_used', 'is', null)
        .order('used_date', { ascending: false })

      if (input.materialName) {
        query = query.ilike('materials.name', `%${input.materialName}%`)
      }

      const { data: usageData, error } = await query

      if (error) {
        return {
          success: false,
          error: `Failed to fetch usage report: ${error.message}`,
        }
      }

      if (!usageData || usageData.length === 0) {
        return {
          success: true,
          usage: [],
          message: 'No material usage recorded yet',
        }
      }

      // ✅ Group by material
      const byMaterial: Record<string, any> = {}

      for (const record of usageData) {
        const material = record.materials as any
        const project = record.projects as any
        const materialName = material?.name || 'Unknown'

        if (!byMaterial[materialName]) {
          byMaterial[materialName] = {
            material: materialName,
            unit: material?.unit || 'pcs',
            totalUsed: 0,
            totalCost: 0,
            projects: [],
          }
        }

        const quantityUsed = record.quantity_used || 0
        const costAtTime = record.cost_at_time || 0
        const lineCost = quantityUsed * costAtTime

        byMaterial[materialName].totalUsed += quantityUsed
        byMaterial[materialName].totalCost += lineCost
        byMaterial[materialName].projects.push({
          name: project?.name || 'Unknown',
          quantityUsed,
          costPerUnit: costAtTime,
          lineCost,
          date: record.used_date,
        })
      }

      const report = Object.values(byMaterial).map((m: any) => ({
        material: m.material,
        totalUsed: `${m.totalUsed} ${m.unit}`,
        avgCostPerUnit: `₹${(m.totalCost / m.totalUsed).toFixed(2)}`,
        totalCost: `₹${m.totalCost.toFixed(2)}`,
        projects: m.projects.length,
      }))

      const totalCostAllMaterials = Object.values(byMaterial).reduce((sum: number, m: any) => sum + m.totalCost, 0)

      return {
        success: true,
        usage: report,
        totalRecords: usageData.length,
        totalCost: `₹${totalCostAllMaterials.toFixed(2)}`,
        message: `📊 Material Usage Report: ${Object.keys(byMaterial).length} materials used. Total cost: ₹${totalCostAllMaterials.toFixed(2)}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to view usage report',
      }
    }
  },
})

/**
 * TOOL 16: Check Reorder Alerts
 */
export const checkReorderAlertsTool = tool({
  description: 'Check which materials need reordering (quantity_available < reorder_level)',
  inputSchema: z.object({
    urgent: z.boolean().optional().describe('Show only critically low (true) or all low items (false)'),
  }),
  execute: async (input) => {
    try {
      const { data: materials, error } = await supabase
        .from('materials')
        .select('id, name, unit, quantity_available, quantity_reserved, reorder_level, unit_cost, supplier')
        .order('quantity_available', { ascending: true })

      if (error) {
        return {
          success: false,
          error: `Failed to fetch materials: ${error.message}`,
        }
      }

      if (!materials || materials.length === 0) {
        return {
          success: true,
          alerts: [],
          message: 'No materials in inventory',
        }
      }

      // Filter materials needing reorder
      const needsReorder = materials.filter((m: any) => {
        const available = m.quantity_available || 0
        const reorderLevel = m.reorder_level || 0
        return available < reorderLevel
      })

      if (needsReorder.length === 0) {
        return {
          success: true,
          alerts: [],
          message: '✅ All materials are well stocked!',
        }
      }

      const alerts = needsReorder.map((m: any) => {
        const available = m.quantity_available || 0
        const reserved = m.quantity_reserved || 0
        const reorderLevel = m.reorder_level || 0
        const shortage = reorderLevel - available
        const urgency = available <= reorderLevel * 0.25 ? '🔴 CRITICAL' : '🟡 WARNING'

        return {
          material: m.name,
          unit: m.unit,
          current: `${available} ${m.unit}`,
          reserved: `${reserved} ${m.unit}`,
          reorderLevel: `${reorderLevel} ${m.unit}`,
          shortage: `${shortage} ${m.unit}`,
          estimatedCost: `₹${(shortage * (m.unit_cost || 0)).toFixed(2)}`,
          supplier: m.supplier || 'N/A',
          urgency,
        }
      })

      const criticalCount = alerts.filter((a: any) => a.urgency.includes('CRITICAL')).length
      const warningCount = alerts.filter((a: any) => a.urgency.includes('WARNING')).length

      return {
        success: true,
        alerts,
        critical: criticalCount,
        warning: warningCount,
        message: `⚠️ Reorder Alert: ${criticalCount} CRITICAL + ${warningCount} WARNING items need restocking`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check alerts',
      }
    }
  },
})

// ============================================
// SECTION 4: INVOICE & QUOTATION MANAGEMENT (4 tools)
// ============================================

/**
 * DEFAULT T&C TEMPLATE
 */
const DEFAULT_TERMS_CONDITIONS = `Terms and Conditions:

1. **QUOTATION VALIDITY**: This quotation is valid for 30 days from the date of issue.

2. **EXCLUSION OF TAX**: This quotation is **EXCLUDING GST/TAX**. Applicable taxes will be added to the final invoice.

3. **PAYMENT TERMS**: Payment terms as agreed. Advance payment required to commence work.

4. **DELIVERY**: Delivery timeline as per project requirements and material availability.

5. **CHANGES**: Any changes to the scope of work will be billed separately.

6. **CANCELLATION**: Cancellation after work commencement will be charged at cost + 20% overhead.

7. **LIABILITY**: We are not liable for delays due to force majeure or third-party delays.

8. **ACCEPTANCE**: Acceptance of this quotation implies agreement to all terms and conditions.`;


/**
 * TOOL 17: Add Item to Quotation
 */
export const addQuotationItemTool = tool({
  description: 'Add line item to a quotation (before creating it)',
  inputSchema: z.object({
    quotationNumber: z.string().describe('Quotation number (temporary ID during creation)'),
    itemName: z.string().describe('Item description (e.g., "Brass Sculpture - 10ft")'),
    quantity: z.number().describe('Quantity'),
    unitCost: z.number().describe('Cost per unit'),
  }),
  execute: async (input) => {
    try {
      const itemTotal = input.quantity * input.unitCost

      return {
        success: true,
        item: {
          name: input.itemName,
          quantity: input.quantity,
          unitCost: `₹${input.unitCost}`,
          total: `₹${itemTotal}`,
        },
        message: `✅ Item added to quotation. Subtotal: ₹${itemTotal}`,
        nextStep: 'Add more items or say "Create quotation"',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add item',
      }
    }
  },
})

/**
 * TOOL 17b: Create Quotation (with line items)
 */
export const createQuotationWithItemsTool = tool({
  description: 'Create quotation with line items. Pass all items and they will be saved together.',
  inputSchema: z.object({
    projectName: z.string().describe('Project name'),
    clientName: z.string().describe('Client name'),
    items: z.array(
      z.object({
        name: z.string().describe('Item description'),
        quantity: z.number().describe('Quantity'),
        unitCost: z.number().describe('Unit cost'),
      }),
    ).describe('Array of line items'),
    taxType: z.enum(['none', 'gst', 'igst']).optional().describe('Tax type'),
    customTermsConditions: z.string().optional().describe('Custom T&C'),
    profitMarginPercent: z.number().optional().describe('Profit margin %'),
  }),
  execute: async (input) => {
    try {
      // ✅ STEP 1: Find project and client
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, name')
        .ilike('name', input.projectName)
        .limit(1)
        .single()

      const { data: clientData } = await supabase
        .from('clients')
        .select('id, name, state_code')
        .ilike('name', input.clientName)
        .limit(1)
        .single()

      if (!projectData || !clientData) {
        return { success: false, error: 'Project or client not found' }
      }

      // ✅ STEP 2: Calculate totals from items
      let subtotal = 0
      const itemTotals = input.items.map((item) => {
        const itemTotal = item.quantity * item.unitCost
        subtotal += itemTotal
        return { ...item, total: itemTotal }
      })

      // ✅ STEP 3: Calculate profit
      const profitMargin = input.profitMarginPercent || 20
      const profitAmount = (subtotal * profitMargin) / 100
      const totalAmount = subtotal + profitAmount

      // ✅ STEP 4: Determine tax type
      let taxType = input.taxType || 'none'
      if (!input.taxType && clientData[0].state_code?.toUpperCase() !== 'KA') {
        taxType = 'igst'
      }

      // ✅ STEP 5: Generate quotation number
      const quotationNumber = `QT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

      // ✅ STEP 6: Create quotation
      const { data: quotation, error: quotError } = await supabase
        .from('quotations')
        .insert({
          project_id: projectData[0].id,
          client_id: clientData[0].id,
          quotation_number: quotationNumber,
          subtotal: subtotal,
          profit_margin: profitMargin,
          profit_amount: profitAmount,
          total_amount: totalAmount,
          status: 'draft',
          tax_type: taxType,
          terms_and_conditions: input.customTermsConditions || DEFAULT_TERMS_CONDITIONS,
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single()

      if (quotError) {
        return { success: false, error: `Failed to create quotation: ${quotError.message}` }
      }

      // ✅ STEP 7: Insert line items
      const itemsToInsert = itemTotals.map((item) => ({
        quotation_id: quotation.id,
        name: item.name,
        quantity: item.quantity,
        unit_cost: item.unitCost,
        total: item.total,
      }))

      const { error: itemsError } = await supabase.from('quotation_items').insert(itemsToInsert)

      if (itemsError) {
        return { success: false, error: `Failed to add items: ${itemsError.message}` }
      }

      return {
        success: true,
        quotation: {
          number: quotation.quotation_number,
          itemCount: input.items.length,
          subtotal: `₹${subtotal}`,
          profitMargin: `${profitMargin}%`,
          profitAmount: `₹${profitAmount}`,
          total: `₹${totalAmount}`,
          taxType: taxType,
          validUntil: quotation.valid_until?.split('T')[0],
        },
        items: itemTotals.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitCost: `₹${item.unitCost}`,
          total: `₹${item.total}`,
        })),
        message: `✅ Quotation "${quotation.quotation_number}" created with ${input.items.length} items. Total: ₹${totalAmount}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create quotation',
      }
    }
  },
})

/**
 * TOOL 18: Generate Invoice from Quotation (with line items)
 */
export const generateInvoiceWithItemsTool = tool({
  description:
    'Generate invoice from quotation with line items. Handles GST/IGST. Updates quotation status to "converted".',
  inputSchema: z.object({
    quotationNumber: z.string().describe('Quotation number'),
    addGST: z.boolean().optional().describe('Override to add GST'),
    dueDate: z.string().optional().describe('Invoice due date (YYYY-MM-DD)'),
  }),
  execute: async (input) => {
    try {
      // ✅ STEP 1: Find quotation with items
      const { data: quotationData } = await supabase
        .from('quotations')
        .select(`
          id, project_id, client_id, quotation_number, subtotal, total_amount, 
          tax_type, terms_and_conditions,
          quotation_items(name, quantity, unit_cost, total),
          clients(name, state_code)
        `)
        .eq('quotation_number', input.quotationNumber)
        .limit(1)
        .single()

      if (!quotationData) {
        return { success: false, error: `Quotation "${input.quotationNumber}" not found` }
      }

      // ✅ STEP 2: Determine tax type
      const clientState = quotationData.clients?.[0]?.state_code
      let taxType = input.addGST ? (clientState?.toUpperCase() === 'KA' ? 'gst' : 'igst') : quotationData.tax_type

      // ✅ STEP 3: Calculate tax
      const subtotal = quotationData.subtotal || 0
      let cgstAmount = 0,
        sgstAmount = 0,
        igstAmount = 0,
        totalTax = 0,
        totalAmount = subtotal

      const gstRate = 18

      if (taxType === 'gst') {
        cgstAmount = (subtotal * gstRate) / 2 / 100
        sgstAmount = (subtotal * gstRate) / 2 / 100
        totalTax = cgstAmount + sgstAmount
        totalAmount = subtotal + totalTax
      } else if (taxType === 'igst') {
        igstAmount = (subtotal * gstRate) / 100
        totalTax = igstAmount
        totalAmount = subtotal + totalTax
      }

      // ✅ STEP 4: Generate invoice
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      const invoiceDueDate = input.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      const { data: invoice, error: invError } = await supabase
        .from('invoices_enhanced')
        .insert({
          invoice_number: invoiceNumber,
          project_id: quotationData.project_id,
          client_id: quotationData.client_id,
          quotation_id: quotationData.id,
          subtotal: subtotal,
          tax_type: taxType,
          tax_rate: taxType === 'none' ? 0 : gstRate,
          cgst_rate: taxType === 'gst' ? gstRate / 2 : 0,
          sgst_rate: taxType === 'gst' ? gstRate / 2 : 0,
          igst_rate: taxType === 'igst' ? gstRate : 0,
          cgst_amount: cgstAmount,
          sgst_amount: sgstAmount,
          igst_amount: igstAmount,
          tax_amount: totalTax,
          total_amount: totalAmount,
          paid_amount: 0,
          balance_due: totalAmount,
          is_gst_applicable: taxType !== 'none',
          terms_and_conditions: quotationData.terms_and_conditions,
          status: 'sent',
          issue_date: new Date().toISOString(),
          due_date: invoiceDueDate,
          payment_terms: 'Net 30',
        })
        .select()
        .single()

      if (invError) {
        return { success: false, error: `Failed to create invoice: ${invError.message}` }
      }

      // ✅ STEP 5: Copy line items to invoice
      const invoiceItems = (quotationData.quotation_items || []).map((item: any) => ({
        invoice_id: invoice.id,
        name: item.name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total: item.total,
      }))

      if (invoiceItems.length > 0) {
        const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems)
        if (itemsError) {
          console.error('Warning: Failed to copy items:', itemsError)
        }
      }

      // ✅ STEP 6: Update quotation status
      await supabase.from('quotations').update({ status: 'converted' }).eq('id', quotationData.id)

      return {
        success: true,
        invoice: {
          number: invoice.invoice_number,
          items: (quotationData.quotation_items || []).length,
          subtotal: `₹${subtotal}`,
          taxType: taxType,
          ...(taxType === 'gst' && {
            cgst: `₹${cgstAmount.toFixed(2)} (9%)`,
            sgst: `₹${sgstAmount.toFixed(2)} (9%)`,
          }),
          ...(taxType === 'igst' && { igst: `₹${igstAmount.toFixed(2)} (18%)` }),
          totalAmount: `₹${totalAmount.toFixed(2)}`,
          dueDate: invoiceDueDate.split('T')[0],
        },
        message: `✅ Invoice "${invoice.invoice_number}" generated with ${invoiceItems.length} line items. Total: ₹${totalAmount.toFixed(2)}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate invoice',
      }
    }
  },
})


/**
 * TOOL 19: Generate Quotation PDF
 */
export const generateQuotationPDFTool = tool({
  description: 'Generate professional PDF of a quotation with line items and T&C',
  inputSchema: z.object({
    quotationNumber: z.string().describe('Quotation number'),
  }),
  execute: async (input) => {
    try {
      const { data: quotationData } = await supabase
        .from('quotations')
        .select(`
          id, quotation_number, subtotal, profit_margin, profit_amount, total_amount,
          tax_type, terms_and_conditions, valid_until, created_at,
          quotation_items(name, quantity, unit_cost, total),
          projects(name, description),
          clients(name, email, phone, address)
        `)
        .eq('quotation_number', input.quotationNumber)
        .limit(1)
        .single()

      if (!quotationData) {
        return { success: false, error: `Quotation "${input.quotationNumber}" not found` }
      }

      const quotationItems = (quotationData.quotation_items || []).map((item: any) => ({
        description: item.name,
        amount: item.total,
      }))

      const quotationDataForPDF = {
        quotationNumber: quotationData.quotation_number,
        date: new Date(quotationData.created_at).toLocaleDateString(),
        validUntil: new Date(quotationData.valid_until).toLocaleDateString(),
        client: {
          name: quotationData.clients?.[0]?.name || 'N/A',
          address: quotationData.clients?.[0]?.address || '',
          phone: quotationData.clients?.[0]?.phone || '',
        },
        project: {
          name: quotationData.projects?.[0]?.name || 'N/A',
          type: 'Custom Project',
          deadline: new Date(quotationData.valid_until).toLocaleDateString(),
        },
        items: quotationItems,
        subtotal: quotationData.subtotal || 0,
        tax: 0, // No tax in quotation as per requirement
        total: quotationData.total_amount || 0,
        terms: quotationData.terms_and_conditions,
      }

      // Import and use PDFGenerator
      const { PDFGenerator } = await import('@/lib/pdf-generator')
      const pdfBytes = await PDFGenerator.generateQuotation(quotationDataForPDF)
      const base64Pdf = Buffer.from(pdfBytes).toString('base64')

      return {
        success: true,
        quotation: {
          number: quotationData.quotation_number,
          items: (quotationData.quotation_items || []).length,
          total: `₹${quotationData.total_amount}`,
        },
        pdf: {
          generated: true,
          filename: `Quotation-${quotationData.quotation_number}.pdf`,
          base64: base64Pdf,
        },
        message: `✅ Quotation PDF generated: ${quotationData.quotation_number}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate quotation PDF',
      }
    }
  },
})

/**
 * TOOL 20: Generate Invoice PDF
 */
export const generateInvoicePDFTool = tool({
  description: 'Generate professional PDF of an invoice with line items and payment terms',
  inputSchema: z.object({
    invoiceNumber: z.string().describe('Invoice number'),
  }),
  execute: async (input) => {
    try {
      const { data: invoiceData } = await supabase
        .from('invoices_enhanced')
        .select(`
          id, invoice_number, subtotal, tax_amount, total_amount, paid_amount, 
          balance_due, cgst_amount, sgst_amount, igst_amount, tax_type,
          terms_and_conditions, issue_date, due_date,
          invoice_items(name, quantity, unit_cost, total),
          projects(name),
          clients(name, email, phone, address)
        `)
        .eq('invoice_number', input.invoiceNumber)
        .limit(1)
        .single()

      if (!invoiceData) {
        return { success: false, error: `Invoice "${input.invoiceNumber}" not found` }
      }

      const invoiceItems = (invoiceData.invoice_items || []).map((item: any) => ({
        description: item.name,
        quantity: item.quantity,
        rate: item.unit_cost,
        amount: item.total,
      }))

      // Calculate tax based on type
      let taxAmount = 0
      if (invoiceData.tax_type === 'gst') {
        taxAmount = (invoiceData.cgst_amount || 0) + (invoiceData.sgst_amount || 0)
      } else if (invoiceData.tax_type === 'igst') {
        taxAmount = invoiceData.igst_amount || 0
      }

      const invoiceDataForPDF = {
        invoiceNumber: invoiceData.invoice_number,
        date: new Date(invoiceData.issue_date).toLocaleDateString(),
        dueDate: new Date(invoiceData.due_date).toLocaleDateString(),
        client: {
          name: invoiceData.clients?.[0]?.name || 'N/A',
          address: invoiceData.clients?.[0]?.address || '',
          phone: invoiceData.clients?.[0]?.phone || '',
        },
        items: invoiceItems,
        subtotal: invoiceData.subtotal || 0,
        tax: taxAmount,
        total: invoiceData.total_amount || 0,
        notes: invoiceData.terms_and_conditions,
      }

      // Import and use PDFGenerator
      const { PDFGenerator } = await import('@/lib/pdf-generator')
      const pdfBytes = await PDFGenerator.generateInvoice(invoiceDataForPDF)
      const base64Pdf = Buffer.from(pdfBytes).toString('base64')

      return {
        success: true,
        invoice: {
          number: invoiceData.invoice_number,
          items: (invoiceData.invoice_items || []).length,
          total: `₹${invoiceData.total_amount}`,
          paid: `₹${invoiceData.paid_amount}`,
          balance: `₹${invoiceData.balance_due}`,
        },
        pdf: {
          generated: true,
          filename: `Invoice-${invoiceData.invoice_number}.pdf`,
          base64: base64Pdf,
        },
        message: `✅ Invoice PDF generated: ${invoiceData.invoice_number}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate invoice PDF',
      }
    }
  },
})


/**
 * TOOL 21: Record Payment
 */
export const recordPaymentTool = tool({
  description: 'Record payment against an invoice. Tracks advance, partial, and full payments. Supports cash, bank, online.',
  inputSchema: z.object({
    invoiceNumber: z.string().describe('Invoice number'),
    paymentAmount: z.number().describe('Payment amount (₹)'),
    paymentMethod: z.enum(['cash', 'bank', 'online']).describe('Payment method'),
    paymentDate: z.string().optional().describe('Payment date (YYYY-MM-DD, default today)'),
    notes: z.string().optional().describe('Payment notes (cheque number, reference, etc.)'),
  }),
  execute: async (input) => {
    try {
      // ✅ STEP 1: Find invoice
      const { data: invoiceData } = await supabase
        .from('invoices_enhanced')
        .select('id, total_amount, paid_amount, balance_due, client_id, clients(name)')
        .eq('invoice_number', input.invoiceNumber)
        .limit(1)
        .single()

      if (!invoiceData) {
        return { success: false, error: `Invoice "${input.invoiceNumber}" not found` }
      }

      const currentPaid = invoiceData.paid_amount || 0
      const totalAmount = invoiceData.total_amount || 0
      const newPaidAmount = currentPaid + input.paymentAmount
      const newBalanceDue = totalAmount - newPaidAmount

      // Check if overpaid
      if (newPaidAmount > totalAmount) {
        return {
          success: false,
          error: `Payment exceeds invoice amount. Invoice: ₹${totalAmount}, Attempted payment: ₹${newPaidAmount}`,
        }
      }

      // ✅ STEP 2: Create payment record
      const paymentDate = input.paymentDate || new Date().toISOString().split('T')[0]

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoiceData.id,
          payment_amount: input.paymentAmount,
          payment_method: input.paymentMethod,
          payment_date: paymentDate,
          notes: input.notes || null,
        })
        .select()
        .single()

      if (paymentError) {
        return { success: false, error: `Failed to record payment: ${paymentError.message}` }
      }

      // ✅ STEP 3: Update invoice paid amount and balance
      const newInvoiceStatus = newBalanceDue === 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'sent'

      const { error: updateError } = await supabase
        .from('invoices_enhanced')
        .update({
          paid_amount: newPaidAmount,
          balance_due: newBalanceDue,
          status: newInvoiceStatus,
        })
        .eq('id', invoiceData.id)

      if (updateError) {
        return { success: false, error: `Failed to update invoice: ${updateError.message}` }
      }

      return {
        success: true,
        payment: {
          invoice: input.invoiceNumber,
          client: invoiceData.clients?.[0]?.name,
            paymentAmount: `₹${input.paymentAmount}`,
          paymentMethod: input.paymentMethod,
          date: paymentDate,
          previousPaid: `₹${currentPaid}`,
          totalPaid: `₹${newPaidAmount}`,
          remaining: `₹${newBalanceDue}`,
          invoiceStatus: newInvoiceStatus,
        },
        message: `✅ Payment recorded: ₹${input.paymentAmount} via ${input.paymentMethod}. Remaining balance: ₹${newBalanceDue}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record payment',
      }
    }
  },
})

/**
 * TOOL 22: Financial Reports (Profit/Loss, Revenue, Outstanding, CA Report)
 */
export const financialReportTool = tool({
  description:
    'Generate financial reports. Types: profit_loss (per project), revenue (monthly), outstanding (pending payments), ca_report (GST filings), non_gst_report',
  inputSchema: z.object({
    reportType: z.enum(['profit_loss', 'revenue', 'outstanding', 'ca_report', 'non_gst_report', 'all_invoices']).describe('Type of report'),
    month: z.string().optional().describe('Month (YYYY-MM) for revenue/profit reports'),
  }),
  execute: async (input) => {
    try {
      let result: any = { success: true }

      // ✅ PROFIT/LOSS PER PROJECT
      if (input.reportType === 'profit_loss') {
        const { data: projects } = await supabase
          .from('projects')
          .select(`
            id, name, quoted_budget, progress_percentage,
            project_materials(quantity_used, cost_at_time)
          `)

        const profitLoss = await Promise.all(
          (projects || []).map(async (p: any) => {
            // Get material costs
            const materialCost = p.project_materials?.reduce((sum: number, m: any) => sum + (m.quantity_used * m.cost_at_time), 0) || 0

            // Get invoices for this project
            const { data: invoices } = await supabase
              .from('invoices_enhanced')
              .select('total_amount, paid_amount')
              .eq('project_id', p.id)

            const revenue = invoices?.reduce((sum: number, i: any) => sum + i.total_amount, 0) || 0
            const laborCost = (p.quoted_budget || 0) * 0.3 // Rough estimate
            const totalCost = materialCost + laborCost
            const profit = revenue - totalCost

            return {
              project: p.name,
              revenue: `₹${revenue}`,
              materialCost: `₹${materialCost}`,
              laborCost: `₹${laborCost}`,
              totalCost: `₹${totalCost}`,
              profit: `₹${profit}`,
              profitMargin: `${((profit / revenue) * 100).toFixed(1)}%`,
            }
          }),
        )

        result.report = profitLoss
        result.message = `📊 Profit/Loss Report by Project`
      }

      // ✅ OUTSTANDING PAYMENTS
      else if (input.reportType === 'outstanding') {
        const { data: outstanding } = await supabase
          .from('invoices_enhanced')
          .select(`
            invoice_number, client_id, total_amount, paid_amount, balance_due, due_date,
            clients(name)
          `)
          .gt('balance_due', 0)
          .order('due_date', { ascending: true })

        const report = outstanding?.map((i: any) => ({
          invoice: i.invoice_number,
          client: i.clients?.name,
          amount: `₹${i.total_amount}`,
          paid: `₹${i.paid_amount}`,
          pending: `₹${i.balance_due}`,
          dueDate: i.due_date?.split('T')[0],
        }))

        const totalPending = outstanding?.reduce((sum: number, i: any) => sum + i.balance_due, 0) || 0

        result.report = report
        result.totalPending = `₹${totalPending}`
        result.message = `💰 Outstanding Payments Report: ₹${totalPending} pending`
      }

      // ✅ CA REPORT (GST INVOICES ONLY)
      else if (input.reportType === 'ca_report') {
        const { data: gstInvoices } = await supabase
          .from('invoices_enhanced')
          .select(`
            invoice_number, issue_date, client_id, subtotal, 
            cgst_amount, sgst_amount, igst_amount, tax_amount, total_amount,
            clients(name, gstin)
          `)
          .eq('is_gst_applicable', true)
          .order('issue_date', { ascending: false })

        const report = gstInvoices?.map((i: any) => ({
          invoiceNumber: i.invoice_number,
          date: i.issue_date?.split('T')[0],
          client: i.clients?.name,
          gstin: i.clients?.gstin || 'N/A',
          amount: `₹${i.subtotal}`,
          cgst: i.cgst_amount ? `₹${i.cgst_amount} (9%)` : '—',
          sgst: i.sgst_amount ? `₹${i.sgst_amount} (9%)` : '—',
          igst: i.igst_amount ? `₹${i.igst_amount} (18%)` : '—',
          totalTax: `₹${i.tax_amount}`,
          grandTotal: `₹${i.total_amount}`,
        }))

        const totalGST = gstInvoices?.reduce((sum: number, i: any) => sum + (i.tax_amount || 0), 0) || 0

        result.report = report
        result.caReportData = { totalInvoices: report?.length || 0, totalGST: `₹${totalGST}` }
        result.message = `📋 CA Report (GST Invoices Only): ${report?.length} invoices, Total GST: ₹${totalGST}`
      }

      // ✅ NON-GST REPORT
      else if (input.reportType === 'non_gst_report') {
        const { data: nonGstInvoices } = await supabase
          .from('invoices_enhanced')
          .select(`
            invoice_number, issue_date, client_id, subtotal, total_amount,
            clients(name)
          `)
          .eq('is_gst_applicable', false)
          .order('issue_date', { ascending: false })

        const report = nonGstInvoices?.map((i: any) => ({
          invoiceNumber: i.invoice_number,
          date: i.issue_date?.split('T')[0],
          client: i.clients?.name,
          amount: `₹${i.total_amount}`,
        }))

        result.report = report
        result.message = `📊 Non-GST Invoices Report: ${report?.length} invoices`
      }

      // ✅ ALL INVOICES
      else if (input.reportType === 'all_invoices') {
        const { data: allInvoices } = await supabase
          .from('invoices_enhanced')
          .select(`
            invoice_number, issue_date, status, is_gst_applicable, 
            total_amount, paid_amount, balance_due,
            clients(name)
          `)
          .order('issue_date', { ascending: false })

        const report = allInvoices?.map((i: any) => ({
          invoiceNumber: i.invoice_number,
          date: i.issue_date?.split('T')[0],
          client: i.clients?.name,
          type: i.is_gst_applicable ? 'GST' : 'Non-GST',
          amount: `₹${i.total_amount}`,
          paid: `₹${i.paid_amount}`,
          pending: `₹${i.balance_due}`,
          status: i.status,
        }))

        result.report = report
        result.message = `📊 All Invoices Report: ${report?.length} total`
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
      }
    }
  },
})


// ============================================================================
//              EXPORT ALL  TOOLS FOR VERCEL AI SDK
// ============================================================================

// ============================================================================
// EXPORT ALL CLIENT TOOLS FOR VERCEL AI SDK
// ============================================================================

export const clientManagementTools = {
  createClientTool,
  listClientsTool,
  getClientTool,
  updateClientTool,
  validateClientDataTool,
  generateClientUpdateTool,
}

// ============================================================================
// EXPORT ALL PROJECT MANAGEMENT TOOLS FOR VERCEL AI SDK
// ============================================================================
export const projectManagementTools = {
  createProjectTool,
  listProjectsTool,
  getProjectDetailsTool,
  updateProjectTool,
  addProjectMaterialTool,
  updateTaskProgressTool,
}

// ============================================================================
// EXPORT ALL MATERIAL INVENTORY TOOLS FOR VERCEL AI SDK
// ============================================================================
export const materialInventoryTools = {
  viewInventoryTool,
  addMaterialPurchaseTool,
  viewMaterialUsageReportTool,
  checkReorderAlertsTool,
}

// ============================================================================
// EXPORT ALL INVOICE TOOLS FOR VERCEL AI SDK
// ============================================================================
export const invoiceTools = {
  addQuotationItemTool,
  createQuotationWithItemsTool,
  generateInvoiceWithItemsTool,
  generateQuotationPDFTool,
  generateInvoicePDFTool,
  recordPaymentTool,
  financialReportTool,
}