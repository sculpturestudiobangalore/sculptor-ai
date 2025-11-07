import { tool } from 'ai'
import { record, z } from 'zod'
import { supabase } from '@/lib/supabase'
import { VendorManager } from './vendor-manager'
import { ConstraintScheduler } from './scheduler-engine'
import type { 
  Tables, 
  ProjectWithRelations, 
  TaskWithRelations,
  InvoiceWithRelations,
  SculptureBusinessConfig,
  ProjectAnalysis,
  DailyTask,
  ScoredTask,
  Recommendation
} from '@/types/business.types'


import { getErrorMessage } from '@/types/business.types'  

/**
 * Default business configuration used by the AI scheduler.
 * Provided here as an in-file default so BUSINESS_CONFIG is always defined.
 * Adjust values as needed or replace with an application-level config import.
 */
const BUSINESS_CONFIG: SculptureBusinessConfig = {
  team: {
    dhanush: { 
      dailyHours: 8.5, 
      skills: ['design', 'sculpting', 'molding', 'finishing', 'client_management', 'all'] 
    },
    john: { 
      dailyHours: 8, 
      skills: ['clay_prep', 'armature', 'jute_work', 'grinding', 'basic_finishing'] 
    }
  },
  defaultRates: {
    labor: 500,
    tax: 12
  },
  materialCategories: ['metal', 'clay', 'resin', 'paint', 'tools', 'finishing']
}

 // =============================================================================
 // CLIENT management TOOLS
 // =============================================================================


 // create client tool
export const createClientTool = tool({
  description: 'Create a new client in the system',
  inputSchema: z.object({
    name: z.string().describe('Client name'),
    email: z.string().email().optional().describe('Client email'),
    phone: z.string().optional().describe('Client phone number'),
    company: z.string().optional().describe('Client company name'),
    address: z.string().optional().describe('Client address'),
    notes: z.string().optional().describe('Additional notes about the client'),
  }),
  execute: async ({ name, email, phone, company, address, notes }) => {
    const { data, error } = await supabase
      .from('clients')
      .insert({ name, email, phone, company, address, notes })
      .select()
      .single()

    if (error) throw new Error(`Failed to create client: ${error.message}`)
    
    return { 
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      message: `Client "${name}" created successfully`
    }
  },
})

 // list client tool
export const listClientsTool = tool({
  description: 'List all clients in the system',
  inputSchema: z.object({}),
  execute: async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch clients: ${error.message}`)
    
    return { clients: data, count: data.length }
  },
})

export const getClientTool = tool({
  description: 'Get a specific client by ID',
  inputSchema: z.object({
    clientId: z.string().describe('Client ID (UUID)'),
  }),
  execute: async ({ clientId }) => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (error) throw new Error(`Failed to fetch client: ${error.message}`)
    
    return data
  },
})

// update client tool
export const updateClientTool = tool({
  description: 'Update client information including contact details and tax information',
  inputSchema: z.object({
    clientId: z.string().describe('Client ID (UUID)'),
    name: z.string().optional().describe('Client name'),
    email: z.string().email().optional().describe('Client email'),
    phone: z.string().optional().describe('Client phone number'),
    company: z.string().optional().describe('Client company name'),
    address: z.string().optional().describe('Client address'),
    stateCode: z.string().optional().describe('State code for tax calculations (e.g., TN, MH)'),
    gstin: z.string().optional().describe('Client GSTIN number'),
    notes: z.string().optional().describe('Additional notes'),
  }),
  execute: async ({ clientId, stateCode, ...updates }) => {
    const cleanUpdates: any = { ...updates }
    
    // Handle state code separately if provided
    if (stateCode) {
      cleanUpdates.state_code = stateCode.toUpperCase()
    }
    
    // Add updated_at timestamp
    cleanUpdates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('clients')
      .update(cleanUpdates)
      .eq('id', clientId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update client: ${error.message}`)
    
    return { 
      ...data, 
      message: 'Client updated successfully',
      taxImplications: stateCode ? `Client state set to ${stateCode} - will affect GST/IGST calculations` : undefined
    }
  },
})

// generate client progress update tool
export const generateClientUpdateTool = tool({
  description: 'Generate professional client progress update with photos and next steps',
  inputSchema: z.object({
    projectId: z.string().describe('Project ID'),
    includePhotos: z.boolean().optional().describe('Include photo references')
  }),
  execute: async ({ projectId, includePhotos }) => {
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        clients(*),
        tasks(*),
        photos(*)
      `)
      .eq('id', projectId)
      .single()

    if (error) throw new Error(`Failed to fetch project: ${error.message}`)

    // calculate project progress tool
    const progress = calculateProjectProgress(project.tasks)
    const recentWork = project.tasks
      .filter((t: any) => t.status === 'completed')
      .slice(0, 3)

    return {
      clientName: project.clients?.name || 'Client',
      projectName: project.name,
      progressUpdate: `Project is ${progress}% complete`,
      recentAccomplishments: recentWork.map((t: any) => t.name),
      nextSteps: getNextSteps(project.tasks ?? []),
      photos: includePhotos ? (project.photos?.slice(0, 2) || []) : [],
      estimatedCompletion: project.deadline,
      message: generateClientMessage(progress, project.clients?.name ?? 'Client')
    }
  },
})

function generatePaymentRecommendations(paymentScore: number, overdueCount: number): string[] {
  const recommendations: string[] = []
  
  if (paymentScore < 50) {
    recommendations.push('🚨 High risk client: Require advance payment for new projects')
    recommendations.push('Implement stricter payment terms (50% advance, 50% on delivery)')
  } else if (paymentScore < 70) {
    recommendations.push('⚠️ Moderate risk: Monitor payment behavior closely')
    recommendations.push('Consider partial advance payments')
  }
  
  if (overdueCount > 0) {
    recommendations.push(`Send payment reminders for ${overdueCount} overdue invoices`)
  }
  
  if (paymentScore >= 80) {
    recommendations.push('✅ Good payment history: Can offer standard payment terms')
  }
  
  return recommendations.length > 0 ? recommendations : ['Payment behavior is satisfactory']
}

//Proper tax calculations for different scenarios
export const calculateTaxTool = tool({
  description: 'Calculate GST/IGST taxes for India with automatic state-based tax type detection',
  inputSchema: z.object({
    amount: z.number().describe('Taxable amount'),
    clientId: z.string().optional().describe('Client ID for automatic state detection'),
    clientStateCode: z.string().optional().describe('Client state code (e.g., TN, MH, KA) if no client ID'),
    businessStateCode: z.string().optional().default('TN').describe('Your business state code'),
    taxRate: z.number().optional().default(18).describe('Tax rate percentage'),
    includeInTotal: z.boolean().optional().default(true)
  }),
  execute: async ({ 
    amount, 
    clientId, 
    clientStateCode, 
    businessStateCode = 'TN', 
    taxRate = 18, 
    includeInTotal = true 
  }) => {
    try {
      // 1. Get client state if clientId provided
      let clientState = clientStateCode;
      if (clientId && !clientState) {
        const { data: client } = await supabase
          .from('clients')
          .select('state_code')
          .eq('id', clientId)
          .single();

        clientState = client?.state_code;
      }

      // 2. Determine tax type (GST for same state, IGST for different states)
      const isSameState = clientState && businessStateCode && clientState === businessStateCode;
      const taxType = isSameState ? 'gst' : 'igst';

      // 3. Calculate tax amounts
      const taxAmount = amount * (taxRate / 100);
      const totalAmount = includeInTotal ? amount + taxAmount : amount;

      // 4. Prepare breakdown based on tax type
      let breakdown: any = {};
      if (taxType === 'gst') {
        // GST: Split equally between CGST and SGST
        const halfRate = taxRate / 2;
        const halfAmount = taxAmount / 2;
        
        breakdown = {
          cgst: {
            rate: Number(halfRate.toFixed(2)),
            amount: Number(halfAmount.toFixed(2))
          },
          sgst: {
            rate: Number(halfRate.toFixed(2)),
            amount: Number(halfAmount.toFixed(2))
          },
          total_tax: Number(taxAmount.toFixed(2))
        };
      } else {
        // IGST: Single tax
        breakdown = {
          igst: {
            rate: Number(taxRate.toFixed(2)),
            amount: Number(taxAmount.toFixed(2))
          },
          total_tax: Number(taxAmount.toFixed(2))
        };
      }

      return {
        calculation: {
          subtotal: Number(amount.toFixed(2)),
          tax_type: taxType,
          tax_rate: Number(taxRate.toFixed(2)),
          tax_amount: Number(taxAmount.toFixed(2)),
          total_amount: Number(totalAmount.toFixed(2)),
          business_state: businessStateCode,
          client_state: clientState || 'Not specified',
          is_inter_state: taxType === 'igst'
        },
        breakdown,
        compliance: {
          gst_applicable: true,
          requires_gstin: !!clientState,
          tax_explanation: taxType === 'gst' 
            ? `Intra-state transaction (Within ${businessStateCode}) - CGST + SGST` 
            : `Inter-state transaction (${businessStateCode} to ${clientState || 'Other'}) - IGST`
        }
      };

    } catch (error) {
      throw new Error(`Tax calculation failed: ${getErrorMessage(error)}`);
    }
  }
});

export const updateClientStateTool = tool({
  description: 'Update client state and GSTIN information for tax calculations',
  inputSchema: z.object({
    clientId: z.string().describe('Client ID'),
    stateCode: z.string().min(2).max(2).describe('State code (e.g., TN, MH, KA)'),
    gstin: z.string().optional().describe('Client GSTIN if available')
  }),
  execute: async ({ clientId, stateCode, gstin }) => {
    // Verify client exists
    const { data: client } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', clientId)
      .single();

    if (!client) throw new Error('Client not found');

    const { data, error } = await supabase
      .from('clients')
      .update({
        state_code: stateCode.toUpperCase(),
        gstin: gstin,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId)
      .select('id, name, state_code, gstin')
      .single();

    if (error) throw new Error(`Failed to update client state: ${error.message}`);

    return {
      success: true,
      client: data,
      message: `Updated ${client.name} with state: ${stateCode.toUpperCase()}${gstin ? ` and GSTIN: ${gstin}` : ''}`
    };
  }
});



// =============================================================================
// PROJECT TOOLS
// =============================================================================

//import task templates tool
import { TASK_TEMPLATES } from './task-templates'
export const createProjectTool = tool({
  description: 'Create a new project with client info, deadline, and auto-generate task templates',
  inputSchema: z.object({
    name: z.string(),
    clientId: z.string(),
    projectType: z.enum(['3D', '2D', 'OTHERS']).describe('Project type determines task templates'),
    deadline: z.string().optional(),
    budget_amount: z.number().optional(),
  }),
  execute: async ({ name, clientId, projectType, deadline, budget_amount }) => {
    // Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name,
        client_id: clientId,
        deadline,
        budget_amount: budget_amount,
        status: 'active',
      })
      .select()
      .single()

    if (projectError) throw new Error(`Failed to create project: ${projectError.message}`)

    // Auto-create tasks from template
    const template = TASK_TEMPLATES[projectType]
    const tasksToInsert = template.map(task => ({
      project_id: project.id,
      name: task.name,
      estimated_hours: task.estimated_minutes / 60,
      assigned_to: task.assigned_to,
      status: 'pending',
      depends_on: task.depends_on || null,
          }))

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .insert(tasksToInsert)
      .select()

    if (tasksError) throw new Error(`Failed to create tasks: ${tasksError.message}`)

    return {
      success: true,
      project,
      tasksCreated: tasks.length,
      message: `Created project "${name}" with ${tasks.length} tasks auto-generated for ${projectType} workflow`,
    }
  },
})

// list projects tool
export const listProjectsTool = tool({
  description: 'List all projects, optionally filtered by status or client',
  inputSchema: z.object({
    status: z
      .enum(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
      .optional()
      .describe('Filter by project status'),
    clientId: z.string().optional().describe('Filter by client ID'),
  }),
  execute: async ({ status, clientId }) => {
    let query = supabase
      .from('projects')
      .select('*, clients(name, company)')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (clientId) query = query.eq('client_id', clientId)

    const { data, error } = await query

    if (error) throw new Error(`Failed to fetch projects: ${error.message}`)
    
    return { projects: data, count: data.length }
  },
})

// get project by ID tool
export const getProjectTool = tool({
  description: 'Get a specific project by ID with full details',
  inputSchema: z.object({
    projectId: z.string().describe('Project ID (UUID)'),
  }),
  execute: async ({ projectId }) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*, clients(name, company, email, phone)')
      .eq('id', projectId)
      .single()

    if (error) throw new Error(`Failed to fetch project: ${error.message}`)
    
    return data
  },
})
export const setupBusinessTaxTool = tool({
  description: 'Setup your business state and default tax configuration',
  inputSchema: z.object({
    businessStateCode: z.string().min(2).max(2).describe('Your business state code (e.g., TN, MH, KA)'),
    businessStateName: z.string().describe('Your business state name'),
    defaultTaxRate: z.number().optional().default(12).describe('Default GST/IGST rate')
  }),
  execute: async ({ businessStateCode, businessStateName, defaultTaxRate = 12 }) => {
    // Store business configuration
    const { data, error } = await supabase
      .from('business_config')
      .upsert({
        config_key: 'business_tax',
        config_value: {
          state_code: businessStateCode.toUpperCase(),
          state_name: businessStateName,
          default_tax_rate: defaultTaxRate,
          setup_at: new Date().toISOString()
        }
      }, {
        onConflict: 'config_key'
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to setup business tax: ${error.message}`);

    return {
      success: true,
      business_config: data.config_value,
      message: `Business tax setup completed for ${businessStateName} (${businessStateCode.toUpperCase()}) with ${defaultTaxRate}% tax rate`
    };
  }
});

// ROI and profitability calculations
export const calculateProjectProfitabilityTool = tool({
  description: 'Calculate project profitability including materials, labor, and overhead',
  inputSchema: z.object({
    projectId: z.string()
  }),
  execute: async ({ projectId }) => {
    try {
      const [
        { data: project },
        { data: materialCosts },
        { data: laborCosts },
        { data: invoices }
      ] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('material_usage').select('*, materials(unit_cost)').eq('project_id', projectId),
        supabase.from('work_log').select('hours_worked').eq('project_id', projectId),
        supabase.from('invoices_enhanced').select('total_amount, paid_amount').eq('project_id', projectId)
      ])

      if (!project) throw new Error('Project not found')

      const totalMaterialCost = materialCosts?.reduce((sum, usage) => 
        sum + (usage.quantity_used * (usage.materials?.unit_cost || 0)), 0) || 0
      
      const totalLaborCost = (laborCosts?.reduce((sum, log) => sum + log.hours_worked, 0) || 0) * 500
      const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0
      const totalPaid = invoices?.reduce((sum, inv) => sum + Number(inv.paid_amount), 0) || 0
      const overhead = totalRevenue * 0.15 // 15% overhead
      
      const netProfit = totalRevenue - totalMaterialCost - totalLaborCost - overhead
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

      return {
        project: project.name,
        revenue: {
          total: totalRevenue,
          received: totalPaid,
          outstanding: totalRevenue - totalPaid
        },
        costs: {
          materials: totalMaterialCost,
          labor: totalLaborCost,
          overhead: overhead,
          total: totalMaterialCost + totalLaborCost + overhead
        },
        profitability: {
          netProfit,
          profitMargin: Math.round(profitMargin * 100) / 100,
          roi: ((netProfit / (totalMaterialCost + totalLaborCost)) * 100) || 0
        },
        efficiency: {
          laborEfficiency: totalLaborCost > 0 ? (totalRevenue / totalLaborCost) : 0,
          materialEfficiency: totalMaterialCost > 0 ? (totalRevenue / totalMaterialCost) : 0
        }
      }
    } catch (error) {
      throw new Error(`Failed to calculate profitability: ${getErrorMessage(error)}`)
    }
  }
})

// business health overview tool

export const getBusinessIntelligenceTool = tool({
  description: 'Get comprehensive business overview with health metrics, financial status, project pipeline, and urgent alerts',
  inputSchema: z.object({
    reportType: z.enum(['overview', 'health', 'detailed', 'all']).optional().default('all').describe('Type of report to generate'),
    includeRecommendations: z.boolean().optional().default(true).describe('Include actionable recommendations')
  }),
  execute: async ({ reportType = 'all', includeRecommendations = true }) => {
    try {
      // Single batch query for all required data
      const [
        { data: projects },
        { data: clients },
        { data: overdueInvoices },
        { data: lowStockMaterials },
        { data: urgentTasks },
        { data: todayTasks },
        { data: allInvoices }
      ] = await Promise.all([
        supabase.from('projects').select('*, clients(name)').in('status', ['active', 'in_progress']),
        supabase.from('clients').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('invoices_enhanced').select('*, clients(name)').lt('due_date', new Date().toISOString()).neq('status', 'paid'),
        supabase.from('materials').select('*').lt('quantity_available', 'reorder_level'),
        supabase.from('tasks').select('*, projects(name)').eq('priority', 'urgent').neq('status', 'completed'),
        supabase.from('tasks').select('*, projects(name, deadline)').eq('due_date', new Date().toISOString().split('T')[0]).neq('status', 'completed'),
        supabase.from('invoices_enhanced').select('total_amount, paid_amount, status').in('status', ['sent', 'paid'])
      ])

      // Data with null checks
      const projectsData = projects ?? []
      const clientsData = clients ?? []
      const overdueInvoicesData = overdueInvoices ?? []
      const lowStockData = lowStockMaterials ?? []
      const urgentTasksData = urgentTasks ?? []
      const todayTasksData = todayTasks ?? []
      const invoicesData = allInvoices ?? []

      // Core metrics calculations
      const cashFlow = overdueInvoicesData.reduce((sum, inv) => sum + Number(inv.balance_due), 0)
      const workload = projectsData.length
      const materialAlerts = lowStockData.length
      
      // Financial calculations
      const totalRevenue = invoicesData.reduce((sum, inv) => sum + Number(inv.total_amount), 0)
      const totalPaid = invoicesData.reduce((sum, inv) => sum + Number(inv.paid_amount), 0)
      const collectionRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0

      // Health score calculation
      const healthScore = calculateHealthScore(cashFlow, workload, materialAlerts)

      // Build response based on report type
      const response: any = {
        timestamp: new Date().toISOString(),
        reportType
      }

      // Overview section (always included)
      response.overview = {
        summary: {
          activeProjects: projectsData.length,
          totalClients: clientsData.length,
          overdueInvoices: overdueInvoicesData.length,
          lowStockItems: lowStockData.length,
          todaysTasks: todayTasksData.length,
          urgentTasks: urgentTasksData.length
        },
        financials: {
          overdueAmount: cashFlow,
          totalRevenue: Math.round(totalRevenue),
          collectionRate: Math.round(collectionRate),
          outstandingInvoices: overdueInvoicesData.length
        }
      }

      // Health metrics (included in 'health', 'detailed', 'all')
      if (['health', 'detailed', 'all'].includes(reportType)) {
        response.health = {
          healthScore,
          cashFlow: {
            overdueAmount: cashFlow,
            overdueCount: overdueInvoicesData.length,
            status: cashFlow > 50000 ? 'critical' : cashFlow > 20000 ? 'warning' : 'healthy'
          },
          workload: {
            activeProjects: workload,
            urgentTasks: urgentTasksData.length,
            status: workload > 8 ? 'high' : workload > 4 ? 'moderate' : 'manageable'
          },
          inventory: {
            lowStockItems: materialAlerts,
            status: materialAlerts > 5 ? 'critical' : materialAlerts > 2 ? 'warning' : 'good'
          }
        }
      }

      // Detailed alerts (included in 'detailed', 'all')
      if (['detailed', 'all'].includes(reportType)) {
        response.alerts = {
          urgent: overdueInvoicesData.map(inv => ({
            type: 'overdue_invoice',
            message: `Overdue invoice: ${inv.invoice_number} - ${inv.clients?.name}`,
            amount: inv.balance_due,
            daysOverdue: Math.floor((new Date().getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))
          })),
          warnings: lowStockData.map(mat => ({
            type: 'low_stock',
            message: `Low stock: ${mat.name} (${mat.quantity_available} ${mat.unit} left)`,
            item: mat.name,
            currentStock: mat.quantity_available,
            reorderLevel: mat.reorder_level
          })),
          info: todayTasksData.map(task => ({
            type: 'due_today',
            message: `Due today: ${task.name} - ${task.projects?.name || 'Unknown Project'}`,
            task: task.name,
            project: task.projects?.name
          }))
        }

        // Recent clients
        response.recentClients = clientsData.slice(0, 5).map((client: any) => ({
          id: client.id,
          name: client.name,
          company: client.company,
          createdAt: client.created_at
        }))
      }

      // Recommendations (optional)
      if (includeRecommendations) {
        response.recommendations = generateHealthRecommendations(cashFlow, workload, materialAlerts)
        
        // Add specific recommendations based on data
        if (overdueInvoicesData.length > 0) {
          response.recommendations.push(`Follow up on ${overdueInvoicesData.length} overdue invoices totaling ₹${cashFlow.toLocaleString()}`)
        }
        if (lowStockData.length > 0) {
          response.recommendations.push(`Reorder ${lowStockData.length} low-stock materials`)
        }
        if (urgentTasksData.length > 0) {
          response.recommendations.push(`Address ${urgentTasksData.length} urgent tasks`)
        }
      }

      return response

    } catch (error) {
      throw new Error(`Failed to get business intelligence: ${getErrorMessage(error)}`)
    }
  }
})

// update project tool
 export const updateProjectTool = tool({
  description: 'Update project status, details, and metadata in a single operation',
  inputSchema: z.object({
    projectId: z.string().describe('Project ID (UUID)'),
    
    // Status updates
    status: z
      .enum(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
      .optional()
      .describe('Update project status'),
    
    // Basic project details
    name: z.string().optional().describe('Project name'),
    description: z.string().optional().describe('Project description'),
    
    // Financial details
    budget_amount: z.number().optional().describe('Budget amount'),
    actualCost: z.number().optional().describe('Actual cost incurred'),
    
    // Timeline details
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
    deadline: z.string().optional().describe('Deadline (YYYY-MM-DD)'),
    
    // Project settings
    priority: z
      .enum(['low', 'medium', 'high', 'urgent'])
      .optional()
      .describe('Project priority'),
  }),
  execute: async ({ projectId, ...updates }) => {
    // Build clean updates object
    const cleanUpdates: any = {}
    
    // Status updates
    if (updates.status) cleanUpdates.status = updates.status
    
    // Basic project details
    if (updates.name) cleanUpdates.name = updates.name
    if (updates.description !== undefined) cleanUpdates.description = updates.description
    
    // Financial details
    if (updates.budget_amount !== undefined) cleanUpdates.budget_amount = updates.budget_amount
    if (updates.actualCost !== undefined) cleanUpdates.actual_cost = updates.actualCost
    
    // Timeline details
    if (updates.startDate) cleanUpdates.start_date = updates.startDate
    if (updates.endDate) cleanUpdates.end_date = updates.endDate
    if (updates.deadline) cleanUpdates.deadline = updates.deadline
    
    // Project settings
    if (updates.priority) cleanUpdates.priority = updates.priority

    // Add updated_at timestamp
    cleanUpdates.updated_at = new Date().toISOString()

    // Validate that at least one field is being updated
    if (Object.keys(cleanUpdates).length <= 1) { // Only updated_at
      throw new Error('No valid fields provided for update')
    }

    // Execute the update
    const { data, error } = await supabase
      .from('projects')
      .update(cleanUpdates)
      .eq('id', projectId)
      .select('*, clients(name)')
      .single()

    if (error) throw new Error(`Failed to update project: ${error.message}`)
    
    // Generate appropriate success message
    let message = 'Project updated successfully'
    if (updates.status) {
      message = `Project status updated to "${updates.status}"`
    } else if (updates.name) {
      message = `Project "${updates.name}" updated successfully`
    }

    return { 
      ...data, 
      message,
      updatedFields: Object.keys(cleanUpdates).filter(key => key !== 'updated_at')
    }
  },
})

// project progress report tool
export const getProjectProgressTool = tool({
  description: 'Get detailed progress report for a project including completion percentage and bottlenecks',
  inputSchema: z.object({
    projectId: z.string().describe('Project ID')
  }),
  execute: async ({ projectId }) => {
    const { data: project } = await supabase
      .from('projects')
      .select(`
        *,
        tasks(*),
        work_log(*),
        clients(name)
      `)
      .eq('id', projectId)
      .single()

    const totalTasks = project.tasks.length
    const completedTasks = project.tasks.filter(t => t.status === 'completed').length
    const progress = (completedTasks / totalTasks) * 100
    
    const totalHours = project.work_log.reduce((sum, log) => sum + log.hours_worked, 0)
    const budgetUsed = (totalHours * 500) // ₹500/hour labor rate

    return {
      project: project.name,
      client: project.clients.name,
      progress: `${progress.toFixed(1)}%`,
      completedTasks,
      totalTasks,
      totalHours,
      budgetUsed,
      estimatedCompletion: project.deadline
    }
  }
})

//  cost estimation tool for new projects
export const estimateProjectCostTool = tool({
  description: 'Generate detailed cost estimate for new sculpture projects including materials, labor, and timeline',
  inputSchema: z.object({
    projectType: z.enum(['bronze', 'clay', 'mixed_media', 'installation']).describe('Type of sculpture'),
    dimensions: z.string().describe('Approximate dimensions'),
    complexity: z.enum(['simple', 'medium', 'complex', 'very_complex']).describe('Project complexity'),
    clientBudget: z.number().optional().describe('Client budget if available')
  }),
  execute: async ({ projectType, dimensions, complexity, clientBudget }) => {
    const estimates = {
      bronze: { materialCost: 80000, laborHours: 120 },
      clay: { materialCost: 15000, laborHours: 80 },
      mixed_media: { materialCost: 35000, laborHours: 100 },
      installation: { materialCost: 50000, laborHours: 150 }
    }

    const base = estimates[projectType]
    const complexityMultiplier = { simple: 0.8, medium: 1, complex: 1.3, very_complex: 1.7 }[complexity]
    
    const materialCost = base.materialCost * complexityMultiplier
    const laborCost = (base.laborHours * complexityMultiplier) * 500 // ₹500/hour
    const totalCost = materialCost + laborCost

    return {
      projectType,
      complexity,
      estimates: {
        materialCost: Math.round(materialCost),
        laborCost: Math.round(laborCost),
        totalCost: Math.round(totalCost),
        timeline: `${Math.round(base.laborHours * complexityMultiplier / 8)} working days`
      },
      withinBudget: clientBudget ? totalCost <= clientBudget : null,
      recommendations: getCostSavingTips(projectType, clientBudget, totalCost)
    }
  }
})

// add project photo tool
export const addProjectPhotoTool = tool({
  description: 'Add progress photos to projects with descriptions',
  inputSchema: z.object({
    projectId: z.string().describe('Project ID'),
    imageUrl: z.string().describe('URL of the uploaded image'),
    description: z.string().optional().describe('Photo description'),
    phase: z.enum(['concept', 'work_in_progress', 'completed']).describe('Project phase')
  }),
  execute: async ({ projectId, imageUrl, description, phase }) => {
    const { data, error } = await supabase
      .from('photos')
      .insert({
        project_id: projectId,
        file_url: imageUrl,
        caption: description,
        category: phase,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to add photo: ${error.message}`)

    return {
      success: true,
      photo: data,
      message: `Photo added to project (${phase} phase)`
    }
  }
})

// =============================================================================
// TASK TOOLS
// =============================================================================

export const createTaskTool = tool({
  description: 'Create a new task for a project',
  inputSchema: z.object({
    projectId: z.string().describe('Project ID (UUID)'),
    name: z.string().describe('Task name'),
    description: z.string().optional().describe('Task description'),
    estimatedHours: z.number().optional().describe('Estimated hours to complete'),
    priority: z
      .enum(['low', 'medium', 'high', 'urgent'])
      .optional()
      .describe('Task priority'),
    dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
    dependsOn: z.string().optional().describe('Task ID this task depends on (UUID)'),
  }),
  execute: async ({
    projectId,
    name,
    description,
    estimatedHours,
    priority,
    dueDate,
    dependsOn,
  }) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        name,
        description,
        estimated_hours: estimatedHours,
        priority: priority || 'medium',
        due_date: dueDate,
        depends_on: dependsOn,
        status: 'pending',
      })
      .select('*, projects(name)')
      .single()

    if (error) throw new Error(`Failed to create task: ${error.message}`)
    
    return {
      id: data.id,
      name: data.name,
      project: data.projects,
      status: data.status,
      message: `Task "${name}" created successfully`
    }
  },
})

export const listTasksTool = tool({
  description: 'List tasks, optionally filtered by project, status, or date',
  inputSchema: z.object({
    projectId: z.string().optional().describe('Filter by project ID'),
    status: z
      .enum(['pending', 'in_progress', 'completed', 'blocked'])
      .optional()
      .describe('Filter by task status'),
    dueToday: z.boolean().optional().describe('Show only tasks due today'),
  }),
  execute: async ({ projectId, status, dueToday }) => {
    let query = supabase
      .from('tasks')
      .select('*, projects(name)')
      .order('due_date', { ascending: true, nullsFirst: false })

    if (projectId) query = query.eq('project_id', projectId)
    if (status) query = query.eq('status', status)
    if (dueToday) {
      const today = new Date().toISOString().split('T')[0]
      query = query.eq('due_date', today)
    }

    const { data, error } = await query

    if (error) throw new Error(`Failed to fetch tasks: ${error.message}`)
    
    return { tasks: data, count: data.length }
  },
})

export const updateTaskStatusTool = tool({
  description: 'Update task status (e.g., mark as completed)',
  inputSchema: z.object({
    taskId: z.string().describe('Task ID (UUID)'),
    status: z
      .enum(['pending', 'in_progress', 'completed', 'blocked'])
      .describe('New task status'),
    actualHours: z.number().optional().describe('Actual hours spent (for completed tasks)'),
  }),
  execute: async ({ taskId, status, actualHours }) => {
    const updates: any = { status }
    if (actualHours !== undefined) updates.actual_hours = actualHours
    if (status === 'completed') updates.completed_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update task status: ${error.message}`)
    
    return { ...data, message: `Task status updated to "${status}"` }
  },
})

//export const getTeamAvailabilityTool = tool({
 // description: 'Check team member availability and workload using timestamp-based time entries',
  //inputSchema: z.object({
   // date: z.string().optional().describe('Check availability for specific date (YYYY-MM-DD)'),
  //  teamMember: z.enum(['dhanush', 'john']).optional().describe('Team member to check')
  //}),
  //execute: async ({ date, teamMember }) => {
  //  const targetDate = date || new Date().toISOString().split('T')[0]
    
    ////// Convert target date to start and end timestamps for filtering////

   // const startOfDay = new Date(`${targetDate}T00:00:00.000Z`).toISOString()
   // const endOfDay = new Date(`${targetDate}T23:59:59.999Z`).toISOString()

    // Get time entries for the specific date using timestamp range

    //const { data: timeEntries } = await supabase
     // .from('time_entries')
     // .select('*, projects(name), tasks(name)')
      //.eq('team_member', teamMember)
     // .gte('start_time', startOfDay)
     // .lt('start_time', endOfDay)

    // Get tasks due on the target date////
    
    //const { data: scheduledTasks } = await supabase
   //   .from('tasks')
    //  .select('*, projects(name)')
   //   .eq('assigned_to', teamMember)
    //  .eq('due_date', targetDate)
    //  .neq('status', 'completed')

    // Calculate scheduled hours from time entries///

   // const scheduledHours = timeEntries?.reduce((sum: number, entry: any) => 
    //  sum + (entry.duration_minutes / 60), 0) || 0

    // Get team member capacity from BUSINESS_CONFIG///

   // const teamConfig = BUSINESS_CONFIG.team[teamMember as keyof typeof BUSINESS_CONFIG.team]
   // const dailyHours = teamConfig?.dailyHours || 8
   // const availableHours = Math.max(0, dailyHours - scheduledHours)
   // const utilization = dailyHours > 0 ? (scheduledHours / dailyHours) * 100 : 0

    // Get upcoming tasks (next 7 days)///
    //const futureDate = new Date(targetDate)
  //  futureDate.setDate(futureDate.getDate() + 7)
    
   // const { data: upcomingTasks } = await supabase
    //  .from('tasks')
  //    .select('*, projects(name)')
    //  .eq('assigned_to', teamMember)
   //   .in('status', ['pending', 'in_progress'])
   //   .lte('due_date', futureDate.toISOString().split('T')[0])
   //   .gte('due_date', targetDate)

  //  return {
    //  teamMember,
    //  date: targetDate,
   //   capacity: {
    //    dailyHours,
    //    scheduledHours: Math.round(scheduledHours * 10) / 10,
    //    availableHours: Math.round(availableHours * 10) / 10,
    //    utilization: Math.round(utilization)
  //    },
   //   tasks: {
   //     dueToday: scheduledTasks?.length || 0,
    //    upcoming: upcomingTasks?.length || 0,
   //     urgent: scheduledTasks?.filter((task: any) => task.priority === 'urgent').length || 0
    //  },
    //  timeEntries: timeEntries?.map((entry: any) => ({
    //    project: entry.projects?.name,
     //   task: entry.tasks?.name,
     //   startTime: entry.start_time,
     //   endTime: entry.end_time,
     //   duration: entry.duration_minutes ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m` : 'Active',
     //   description: entry.description
    //  })) || [],
     // summary: {
     //   hasActiveTimer: timeEntries?.some((entry: any) => !entry.end_time) || false,
     //   canTakeMoreWork: availableHours > 2,
     //   workloadStatus: utilization > 80 ? 'high' : utilization > 60 ? 'moderate' : 'light'
     // }
 //   }
 // }
//})

// =============================================================================
// MATERIAL/INVENTORY TOOLS
// =============================================================================

export const addMaterialTool = tool({
  description: 'Add a new material to inventory',
  inputSchema: z.object({
    name: z.string().describe('Material name'),
    category: z.string().optional().describe('Material category (e.g., metal, wood, paint)'),
    unit: z.string().describe('Unit of measurement (kg, pcs, meters, liters, etc.)'),
    quantityAvailable: z.number().describe('Current quantity available'),
    unitCost: z.number().optional().describe('Cost per unit'),
    reorderLevel: z.number().optional().describe('Reorder level - alert when stock falls below this'),
    supplier: z.string().optional().describe('Supplier name'),
    notes: z.string().optional().describe('Additional notes'),
  }),
  execute: async ({
    name,
    category,
    unit,
    quantityAvailable,
    unitCost,
    reorderLevel,
    supplier,
    notes,
  }) => {
    const { data, error } = await supabase
      .from('materials')
      .insert({
        name,
        category,
        unit,
        quantity_available: quantityAvailable,
        unit_cost: unitCost,
        reorder_level: reorderLevel || 0,
        supplier,
        notes,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to add material: ${error.message}`)
    
    return {
      id: data.id,
      name: data.name,
      quantity_available: data.quantity_available,
      unit: data.unit,
      message: `Material "${name}" added to inventory`
    }
  },
})

export const generateReorderListTool = tool({
  description: 'Generate smart reorder list based on project requirements and current stock',
  inputSchema: z.object({}),
  execute: async () => {
    const { data: lowStock, error: lowStockError } = await supabase
      .from('materials')
      .select('*')
      .lt('quantity_available', 'reorder_level')

    if (lowStockError) throw new Error(`Failed to fetch low stock materials: ${lowStockError.message}`)

    const { data: upcomingProjects, error: projectsError } = await supabase
      .from('projects')
      .select('*, project_materials(*, materials(*))')
      .in('status', ['planning', 'active'])
      .gte('start_date', new Date().toISOString())

    if (projectsError) throw new Error(`Failed to fetch upcoming projects: ${projectsError.message}`)

    // Calculate required materials for upcoming projects
    const requiredMaterials: any[] = []
    upcomingProjects?.forEach((project: any) => {
      project.project_materials?.forEach((pm: any) => {
        const existing = requiredMaterials.find(m => m.id === pm.material_id)
        if (existing) {
          existing.required += pm.quantity
        } else {
          requiredMaterials.push({
            id: pm.material_id,
            name: pm.materials?.name,
            currentStock: pm.materials?.quantity_available,
            required: pm.quantity,
            unit: pm.materials?.unit
          })
        }
      })
    })

    return {
      urgentReorder: lowStock || [],
      projectRequirements: requiredMaterials,
      recommendations: generateReorderRecommendations(lowStock || [], requiredMaterials)
    }
  }
})

//function to generate reorder recommendations
function generateReorderRecommendations(lowStock: any[], requiredMaterials: any[]): string[] {
  const recommendations: string[] = []
  
  if (lowStock.length > 0) {
    recommendations.push(`Urgent: Reorder ${lowStock.map(m => m.name).join(', ')}`)
  }
  
  requiredMaterials.forEach(material => {
    if ((material.currentStock || 0) < material.required) {
      recommendations.push(`Project need: ${material.name} - ${material.required - material.currentStock} ${material.unit} more needed`)
    }
  })
  
  if (recommendations.length === 0) {
    recommendations.push('Stock levels are adequate for current projects')
  }
  
  return recommendations
}

//list materials tool
export const listMaterialsTool = tool({
  description: 'List all materials, optionally showing only low stock items',
  inputSchema: z.object({
    lowStock: z.boolean().optional().describe('Show only materials below reorder level'),
    category: z.string().optional().describe('Filter by category'),
  }),
  execute: async ({ lowStock, category }) => {
    let query = supabase
      .from('materials')
      .select('*')
      .order('name', { ascending: true })

    if (category) query = query.eq('category', category)

    const { data, error } = await query

    if (error) throw new Error(`Failed to fetch materials: ${error.message}`)

    let materials = data
    if (lowStock) {
      materials = data.filter(
        (m) => m.quantity_available <= m.reorder_level && m.reorder_level > 0
      )
    }

    const lowStockCount = data.filter(
      (m) => m.quantity_available <= m.reorder_level && m.reorder_level > 0
    ).length

    return {
      materials,
      count: materials.length,
      lowStockCount
    }
  },
})

//update material stock tool
export const updateMaterialStockTool = tool({
  description: 'Update material stock quantity (add or reduce)',
  inputSchema: z.object({
    materialId: z.string().describe('Material ID (UUID)'),
    quantityChange: z.number().describe('Quantity to add (positive) or remove (negative)'),
    notes: z.string().optional().describe('Notes about this stock change'),
  }),
  execute: async ({ materialId, quantityChange, notes }) => {
    const { data: material, error: fetchError } = await supabase
      .from('materials')
      .select('quantity_available, name, unit')
      .eq('id', materialId)
      .single()

    if (fetchError) throw new Error(`Failed to fetch material: ${fetchError.message}`)

    const newQuantity = material.quantity_available + quantityChange

    if (newQuantity < 0) {
      throw new Error(
        `Cannot reduce stock below 0. Current: ${material.quantity_available}, Requested reduction: ${Math.abs(quantityChange)}`
      )
    }

    const { data, error } = await supabase
      .from('materials')
      .update({ quantity_available: newQuantity, notes: notes || undefined })
      .eq('id', materialId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update stock: ${error.message}`)
    
    return {
      ...data,
      message: `${material.name} stock updated: ${material.quantity_available} → ${newQuantity} ${data.unit}`
    }
  },
})

//record
export const recordMaterialUsageTool = tool({
  description: 'Record material usage for a project',
  inputSchema: z.object({
    projectId: z.string().describe('Project ID (UUID)'),
    materialId: z.string().describe('Material ID (UUID)'),
    quantityUsed: z.number().describe('Quantity used'),
    notes: z.string().optional().describe('Notes about usage'),
  }),
  execute: async ({ projectId, materialId, quantityUsed, notes }) => {
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .single()

    if (materialError) throw new Error(`Failed to fetch material: ${materialError.message}`)

    if (material.quantity_available < quantityUsed) {
      throw new Error(
        `Insufficient stock. Available: ${material.quantity_available} ${material.unit}, Requested: ${quantityUsed} ${material.unit}`
      )
    }

    const { data: usage, error: usageError } = await supabase
      .from('material_usage')
      .insert({
        project_id: projectId,
        material_id: materialId,
        quantity_used: quantityUsed,
        cost_at_time: material.unit_cost,
        notes,
      })
      .select()
      .single()

    if (usageError) throw new Error(`Failed to record usage: ${usageError.message}`)

    const newQuantity = material.quantity_available - quantityUsed
    const { error: updateError } = await supabase
      .from('materials')
      .update({ quantity_available: newQuantity })
      .eq('id', materialId)

    if (updateError) throw new Error(`Failed to update stock: ${updateError.message}`)

    return {
      ...usage,
      material_name: material.name,
      new_stock: newQuantity,
      unit: material.unit,
      message: `Recorded ${quantityUsed} ${material.unit} of ${material.name} used. New stock: ${newQuantity} ${material.unit}`
    }
  },
})

// =============================================================================
// WORK LOG TOOLS
// =============================================================================

//log work hours tool
export const logWorkTool = tool({
  description: 'Log work hours for a project or task',
  inputSchema: z.object({
    projectId: z.string().describe('Project ID (UUID)'),
    taskId: z.string().optional().describe('Task ID (UUID) if work is for a specific task'),
    hoursWorked: z.number().describe('Hours worked'),
    workDescription: z.string().optional().describe('Description of work done'),
    date: z.string().optional().describe('Date of work (YYYY-MM-DD), defaults to today'),
  }),
  execute: async ({ projectId, taskId, hoursWorked, workDescription, date }) => {
    const { data, error } = await supabase
      .from('work_log')
      .insert({
        project_id: projectId,
        task_id: taskId,
        hours_worked: hoursWorked,
        work_description: workDescription,
        date: date || new Date().toISOString().split('T')[0],
      })
      .select('*, projects(name), tasks(name)')
      .single()

    if (error) throw new Error(`Failed to log work: ${error.message}`)
    
    return {
      ...data,
      message: `Logged ${hoursWorked} hours of work`
    }
  },
})

//get work log entries tool
export const getWorkLogTool = tool({
  description: 'Get work log entries, filtered by project, date range, or task',
  inputSchema: z.object({
    projectId: z.string().optional().describe('Filter by project ID'),
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
  }),
  execute: async ({ projectId, startDate, endDate }) => {
    let query = supabase
      .from('work_log')
      .select('*, projects(name), tasks(name)')
      .order('date', { ascending: false })

    if (projectId) query = query.eq('project_id', projectId)
    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)

    const { data, error } = await query

    if (error) throw new Error(`Failed to fetch work log: ${error.message}`)

    const totalHours = data.reduce((sum, log) => sum + log.hours_worked, 0)

    return {
      workLogs: data,
      count: data.length,
      totalHours
    }
  },
})


// ==================== QUOTATION MANAGEMENT TOOLS ====================

//generate quotation tool
export const generateQuotationTool = tool({
  description: 'Generate a cost quotation for a project',
  inputSchema: z.object({
    projectId: z.string().describe('Project ID (UUID)'),
    laborHours: z.number().describe('Estimated labor hours'),
    laborRate: z.number().describe('Hourly labor rate'),
    materialCosts: z
      .array(
        z.object({
          name: z.string(),
          quantity: z.number(),
          unitCost: z.number(),
        })
      )
      .optional()
      .describe('Array of material costs'),
    additionalCosts: z.number().optional().describe('Additional costs (transport, overhead, etc.)'),
    profitMargin: z.number().optional().describe('Profit margin percentage (e.g., 20 for 20%)'),
  }),
  execute: async ({
    projectId,
    laborHours,
    laborRate,
    materialCosts,
    additionalCosts,
    profitMargin,
  }) => {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, clients(name, email, company)')
      .eq('id', projectId)
      .single()

    if (projectError) throw new Error(`Failed to fetch project: ${projectError.message}`)

    const laborCost = laborHours * laborRate

    let materialTotal = 0
    if (materialCosts && materialCosts.length > 0) {
      materialTotal = materialCosts.reduce(
        (sum, item) => sum + item.quantity * item.unitCost,
        0
      )
    }

    const subtotal = laborCost + materialTotal + (additionalCosts || 0)
    const profit = profitMargin ? (subtotal * profitMargin) / 100 : 0
    const totalAmount = subtotal + profit

    return {
      projectId,
      projectName: project.name,
      clientName: project.clients?.name,
      clientCompany: project.clients?.company,
      labor: {
        hours: laborHours,
        rate: laborRate,
        total: laborCost,
      },
      materials: materialCosts || [],
      materialTotal,
      additionalCosts: additionalCosts || 0,
      subtotal,
      profitMargin: profitMargin || 0,
      profit,
      totalAmount,
      generatedAt: new Date().toISOString(),
    }
  },
})

//list quotations tool
export const listQuotationsTool = tool({
  description: 'List all quotations with optional filters for status, client, or date range',
  inputSchema: z.object({
    status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'all']).optional().describe('Filter by status'),
    clientId: z.string().optional().describe('Filter by client ID'),
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
    limit: z.number().default(20).describe('Number of results to return'),
  }),
  execute: async ({ status, clientId, startDate, endDate, limit }) => {
    let query = supabase
      .from('quotations')
      .select(`
        *,
        clients(name, email, company),
        projects(name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (clientId) {
      query = query.eq('client_id', clientId)
    }
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data, error } = await query

    if (error) throw new Error(`Failed to list quotations: ${error.message}`)

    return {
      success: true,
      count: data.length,
      quotations: data.map(quote => ({
        id: quote.id,
        quotationNumber: quote.quotation_number,
        client: quote.clients?.name,
        project: quote.projects?.name,
        totalAmount: quote.total_amount,
        status: quote.status,
        validUntil: quote.valid_until,
        createdAt: quote.created_at,
      }))
    }
  },
})

//get quotation details tool
export const getQuotationTool = tool({
  description: 'Get complete details of a specific quotation including line items and client information',
  inputSchema: z.object({
    quotationId: z.string().describe('Quotation ID (UUID)'),
  }),
  execute: async ({ quotationId }) => {
    const { data: quotation, error: quoteError } = await supabase
      .from('quotations')
      .select(`
        *,
        clients(name, email, phone, company, address),
        projects(name, description)
      `)
      .eq('id', quotationId)
      .single()

    if (quoteError) throw new Error(`Failed to fetch quotation: ${quoteError.message}`)

    const { data: items } = await supabase
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', quotationId)

    return {
      success: true,
      quotation: {
        id: quotation.id,
        quotationNumber: quotation.quotation_number,
        client: quotation.clients,
        project: quotation.projects,
        totalAmount: quotation.total_amount,
        status: quotation.status,
        validUntil: quotation.valid_until,
        notes: quotation.notes,
        items: items || [],
        createdAt: quotation.created_at,
      }
    }
  },
})

//update quotation status tool
export const updateQuotationStatusTool = tool({
  description: 'Update quotation status (draft → sent → accepted/rejected)',
  inputSchema: z.object({
    quotationId: z.string().describe('Quotation ID (UUID)'),
    status: z.enum(['draft', 'sent', 'accepted', 'rejected']).describe('New quotation status'),
    notes: z.string().optional().describe('Optional notes about status change'),
  }),
  execute: async ({ quotationId, status, notes }) => {
    const { data, error } = await supabase
      .from('quotations')
      .update({
        status,
        notes: notes || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quotationId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update quotation status: ${error.message}`)

    return {
      success: true,
      message: `Quotation ${data.quotation_number} status updated to ${status}`,
      quotation: data
    }
  },
})

//update quotation details tool
export const updateQuotationTool = tool({
  description: 'Update quotation details including items, amounts, and validity',
  inputSchema: z.object({
    quotationId: z.string().describe('Quotation ID (UUID)'),
    validUntil: z.string().optional().describe('New validity date (YYYY-MM-DD)'),
    notes: z.string().optional().describe('Updated notes'),
    items: z.array(z.object({
      id: z.string().optional().describe('Item ID for existing items, omit for new items'),
      description: z.string().describe('Item description'),
      quantity: z.number().describe('Quantity'),
      unitPrice: z.number().describe('Price per unit'),
    })).optional().describe('Updated quotation items'),
  }),
  execute: async ({ quotationId, validUntil, notes, items }) => {
    // Update quotation basic info
    const updates: any = { updated_at: new Date().toISOString() }
    if (validUntil) updates.valid_until = validUntil
    if (notes !== undefined) updates.notes = notes

    if (Object.keys(updates).length > 1) { // More than just updated_at
      const { error: updateError } = await supabase
        .from('quotations')
        .update(updates)
        .eq('id', quotationId)

      if (updateError) throw new Error(`Failed to update quotation: ${updateError.message}`)
    }

    // Update items if provided
    if (items && items.length > 0) {
      // First, delete existing items
      const { error: deleteError } = await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', quotationId)

      if (deleteError) throw new Error(`Failed to clear existing items: ${deleteError.message}`)

      // Then insert new items
      const quotationItems = items.map(item => ({
        quotation_id: quotationId,
        name: item.description,
        quantity: item.quantity,
        unit_cost: item.unitPrice,
        total: item.quantity * item.unitPrice,
      }))

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(quotationItems)

      if (itemsError) throw new Error(`Failed to add quotation items: ${itemsError.message}`)

      // Recalculate total amount
      const totalAmount = quotationItems.reduce((sum, item) => sum + item.total, 0)
      
      const { error: totalError } = await supabase
        .from('quotations')
        .update({ total_amount: totalAmount })
        .eq('id', quotationId)

      if (totalError) throw new Error(`Failed to update total amount: ${totalError.message}`)
    }

    // Return updated quotation
    const { data: quotation } = await supabase
      .from('quotations')
      .select(`
        *,
        clients(name, email),
        quotation_items(*)
      `)
      .eq('id', quotationId)
      .single()

    return {
      success: true,
      message: `Quotation ${quotation.quotation_number} updated successfully`,
      quotation
    }
  },
})

//convert quotation to invoice tool
export const convertQuotationToInvoiceTool = tool({
  description: 'Convert an accepted quotation to an invoice automatically',
  inputSchema: z.object({
    quotationId: z.string().describe('Quotation ID (UUID)'),
    dueDate: z.string().optional().describe('Invoice due date (YYYY-MM-DD)'),
  }),
  execute: async ({ quotationId, dueDate }) => {
    // Get quotation details
    const { data: quotation, error: quoteError } = await supabase
      .from('quotations')
      .select(`
        *,
        clients(name, email),
        quotation_items(*)
      `)
      .eq('id', quotationId)
      .single()

    if (quoteError) throw new Error(`Failed to fetch quotation: ${quoteError.message}`)

    if (quotation.status !== 'accepted') {
      throw new Error(`Cannot convert quotation to invoice. Status must be 'accepted', but is '${quotation.status}'`)
    }

    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

    // Calculate taxes and totals
    const subtotal = quotation.total_amount
    const taxAmount = subtotal * (12 / 100) // 18% GST
    const totalAmount = subtotal + taxAmount

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices_enhanced')
      .insert({
        invoice_number: invoiceNumber,
        client_id: quotation.client_id,
        project_id: quotation.project_id,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: subtotal,
        tax_rate: 12,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        paid_amount: 0,
        balance_due: totalAmount,
        payment_terms: 'Net 30',
        notes: `Converted from quotation ${quotation.quotation_number}`,
        status: 'sent',
      })
      .select()
      .single()

    if (invoiceError) throw new Error(`Failed to create invoice: ${invoiceError.message}`)

    // Copy quotation items to invoice items
    const invoiceItems = quotation.quotation_items.map((item: any) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_cost,
      total_price: item.total,
    }))

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems)

    if (itemsError) throw new Error(`Failed to add invoice items: ${itemsError.message}`)

    // Update quotation status to indicate it's been converted
    await supabase
      .from('quotations')
      .update({ 
        notes: `Converted to invoice ${invoiceNumber} on ${new Date().toISOString().split('T')[0]}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', quotationId)

    return {
      success: true,
      message: `Quotation ${quotation.quotation_number} converted to invoice ${invoiceNumber}`,
      invoice: {
        number: invoiceNumber,
        client: quotation.clients?.name,
        total: totalAmount,
        dueDate: invoice.due_date,
        status: 'sent'
      }
    }
  },
})

//get quotation statistics tool
export const getQuotationStatisticsTool = tool({
  description: 'Get statistics and analytics for quotations including conversion rates and performance',
  inputSchema: z.object({
    startDate: z.string().optional().describe('Start date for analysis (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date for analysis (YYYY-MM-DD)'),
  }),
  execute: async ({ startDate, endDate }) => {
    let query = supabase.from('quotations').select('*')

    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)

    const { data: quotations, error } = await query

    if (error) throw new Error(`Failed to fetch quotations: ${error.message}`)

    const totalQuotations = quotations.length
    const totalValue = quotations.reduce((sum, q) => sum + Number(q.total_amount), 0)
    
    const statusCounts = {
      draft: quotations.filter(q => q.status === 'draft').length,
      sent: quotations.filter(q => q.status === 'sent').length,
      accepted: quotations.filter(q => q.status === 'accepted').length,
      rejected: quotations.filter(q => q.status === 'rejected').length,
    }

    const conversionRate = totalQuotations > 0 
      ? (statusCounts.accepted / totalQuotations) * 100 
      : 0

    // Get recent accepted quotations
    const recentAccepted = quotations
      .filter(q => q.status === 'accepted')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)

    return {
      success: true,
      statistics: {
        totalQuotations,
        totalValue,
        averageQuotation: totalQuotations > 0 ? totalValue / totalQuotations : 0,
        conversionRate: Math.round(conversionRate * 100) / 100,
        statusBreakdown: statusCounts,
      },
      recentAccepted: recentAccepted.map(q => ({
        quotationNumber: q.quotation_number,
        clientId: q.client_id,
        amount: q.total_amount,
        createdAt: q.created_at,
      })),
      recommendations: generateQuotationRecommendations(statusCounts, conversionRate)
    }
  },
})

// ==================== FINANCIAL TOOLS (21-32) ====================

export const generateInvoiceTool = tool({
  description: 'Generate an invoice for a client with line items and automatic tax calculation',
  inputSchema: z.object({
    clientId: z.string().describe('Client UUID'),
    projectId: z.string().optional().describe('Associated project UUID (optional)'),
    items: z.array(z.object({
      description: z.string().describe('Item description'),
      quantity: z.number().describe('Quantity'),
      unitPrice: z.number().describe('Price per unit'),
    })).describe('Invoice line items'),
    dueDate: z.string().optional().describe('Payment due date (YYYY-MM-DD)'),
    paymentTerms: z.string().optional().describe('Payment terms like "Net 30" or "Due on receipt"'),
    notes: z.string().optional().describe('Additional notes'),
  }),
  execute: async ({ clientId, projectId, items, dueDate, paymentTerms, notes }) => {
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const taxRate = 18.00 // GST India
    const taxAmount = subtotal * (taxRate / 100)
    const totalAmount = subtotal + taxAmount
    
    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices_enhanced')
      .insert({
        invoice_number: invoiceNumber,
        client_id: clientId,
        project_id: projectId,
        due_date: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        balance_due: totalAmount,
        payment_terms: paymentTerms || 'Net 30',
        notes,
        status: 'draft',
      })
      .select('*, clients(name, email)')
      .single()

    if (invoiceError) throw new Error(`Failed to create invoice: ${invoiceError.message}`)

    // Add invoice items
    const invoiceItems = items.map(item => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.quantity * item.unitPrice,
    }))

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems)

    if (itemsError) throw new Error(`Failed to add invoice items: ${itemsError.message}`)

    return {
      success: true,
      invoiceNumber: invoice.invoice_number,
      clientName: invoice.clients?.name,
      subtotal,
      tax: taxAmount,
      total: totalAmount,
      status: 'draft',
      dueDate: invoice.due_date,
      items: invoiceItems,
      message: `Invoice ${invoice.invoice_number} created successfully for ${invoice.clients?.name}`,
    }
  },
})

// Tool 22: List Invoices
export const listInvoicesTool = tool({
  description: 'List all invoices with optional filters for status (draft, sent, paid, overdue, cancelled)',
  inputSchema: z.object({
    status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled', 'all']).optional().describe('Filter by status'),
    clientId: z.string().optional().describe('Filter by client UUID'),
    limit: z.number().default(20).describe('Number of results to return'),
  }),
  execute: async ({ status, clientId, limit }) => {
    let query = supabase
      .from('invoices_enhanced')
      .select(`*,clients(name,email),projects(name)`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query

    if (error) throw new Error(`Failed to list invoices: ${error.message}`)

    return {
      success: true,
      count: data.length,
      invoices: data.map(inv => ({
        id: inv.id,
        number: inv.invoice_number,
        client: inv.clients?.name,
        project: inv.projects?.name,
        total: inv.total_amount,
        paid: inv.paid_amount,
        balance: inv.balance_due,
        status: inv.status,
        dueDate: inv.due_date,
      })),
    }
  },
})

// Tool 23: Get Invoice Details
export const getInvoiceDetailsTool = tool({
  description: 'Get complete details of a specific invoice including line items and payment history',
  inputSchema: z.object({
    invoiceId: z.string().describe('Invoice UUID'),
  }),
  execute: async ({ invoiceId }) => {
    const { data: invoice, error: invError } = await supabase
      .from('invoices_enhanced')
      .select(`*,clients(name,email,phone),projects(name)`)
      .eq('id', invoiceId)
      .single()

    if (invError) throw new Error(`Failed to fetch invoice: ${invError.message}`)

    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false })

    return {
      success: true,
      invoice: {
        number: invoice.invoice_number,
        clientName: invoice.clients?.name,
        projectname: invoice.projects?.name,
        total: invoice.total_amount,
        paid: invoice.paid_amount,
        balance: invoice.balance_due,
        status: invoice.status,
        dueDate: invoice.due_date,
        items,
        payments,
      },
    }
  },
})

// Tool 24: Update Invoice Status
export const updateInvoiceStatusTool = tool({
  description: 'Update invoice status (draft → sent → paid, or cancelled)',
  inputSchema: z.object({
    invoiceId: z.string().describe('Invoice UUID'),
    status: z.enum(['draft', 'sent', 'paid', 'cancelled']).describe('New status'),
    notes: z.string().optional().describe('Optional notes'),
  }),
  execute: async ({ invoiceId, status, notes }) => {
    const { data, error } = await supabase
      .from('invoices_enhanced')
      .update({
        status,
        notes: notes || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update invoice: ${error.message}`)

    return {
      success: true,
      message: `Invoice ${data.invoice_number} marked as ${status}`,
    }
  },
})

// Tool 25: Record Payment
export const recordPaymentTool = tool({
  description: 'Record a payment received against an invoice',
  inputSchema: z.object({
    invoiceId: z.string().describe('Invoice UUID'),
    amount: z.number().describe('Payment amount in rupees'),
    paymentMethod: z.enum(['cash', 'bank_transfer', 'upi', 'check', 'other']).describe('Payment method'),
    referenceNumber: z.string().optional().describe('Payment reference/transaction ID'),
    paymentDate: z.string().optional().describe('Payment date (ISO format)'),
    notes: z.string().optional().describe('Additional notes'),
  }),
  execute: async ({ invoiceId, amount, paymentMethod, referenceNumber, paymentDate, notes }) => {
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        invoice_id: invoiceId,
        amount,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        payment_date: paymentDate || new Date().toISOString(),
        notes,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to record payment: ${error.message}`)

    const { data: invoice } = await supabase
      .from('invoices_enhanced')
      .select('invoice_number, total_amount, paid_amount, balance_due')
      .eq('id', invoiceId)
      .single()

    return {
      success: true,
      message: `Payment of ₹${amount} recorded for ${invoice?.invoice_number}`,
      invoice: {
        number: invoice?.invoice_number,
        total: invoice?.total_amount,
        paid: invoice?.paid_amount,
        balance: invoice?.balance_due,
      },
    }
  },
})

// Tool 26: Record Refund
export const recordRefundTool = tool({
  description: 'Record a refund (negative payment) for an invoice',
  inputSchema: z.object({
    invoiceId: z.string().describe('Invoice UUID'),
    amount: z.number().describe('Refund amount'),
    reason: z.string().describe('Reason for refund'),
    refundDate: z.string().optional().describe('Refund date (ISO format)'),
  }),
  execute: async ({ invoiceId, amount, reason, refundDate }) => {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        invoice_id: invoiceId,
        amount: -Math.abs(amount),
        payment_method: 'other',
        notes: `REFUND: ${reason}`,
        payment_date: refundDate || new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to record refund: ${error.message}`)

    return {
      success: true,
      message: `Refund of ₹${amount} recorded for invoice (Reason: ${reason})`,
    }
  },
})

// Tool 27: List Payments
export const listPaymentsTool = tool({
  description: 'List all payment transactions',
  inputSchema: z.object({
    invoiceId: z.string().optional().describe('Filter by invoice UUID'),
    limit: z.number().default(50).describe('Number of results'),
  }),
  execute: async ({ invoiceId, limit }) => {
    let query = supabase
      .from('payments')
      .select(`*,invoices_enhanced(invoice_number,clients(name))`)
      .order('payment_date', { ascending: false })
      .limit(limit)

    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId)
    }

    const { data, error } = await query

    if (error) throw new Error(`Failed to list payments: ${error.message}`)

    return {
      success: true,
      count: data.length,
      payments: data,
    }
  },
})

// Tool 28: Get Project Financials
export const getProjectFinancialsTool = tool({
  description: 'Get complete financial summary for a project (revenue, costs, profit)',
  inputSchema: z.object({
    projectId: z.string().describe('Project UUID'),
  }),
  execute: async ({ projectId }) => {
    const { data: invoices } = await supabase
      .from('invoices_enhanced')
      .select('total_amount, paid_amount, status')
      .eq('project_id', projectId)

    const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0
    const totalPaid = invoices?.reduce((sum, inv) => sum + Number(inv.paid_amount), 0) || 0
    const outstanding = totalRevenue - totalPaid

    return {
      success: true,
      financials: {
        revenue: {
          billed: totalRevenue,
          paid: totalPaid,
          outstanding,
        },
        invoiceCount: invoices?.length || 0,
      },
    }
  },
})

// Tool 29: Get Financial Summary
export const getFinancialSummaryTool = tool({
  description: 'Get overall business financial summary (all invoices, payments, outstanding)',
  inputSchema: z.object({
    startDate: z.string().optional().describe('Start date filter (ISO format)'),
    endDate: z.string().optional().describe('End date filter (ISO format)'),
  }),
  execute: async ({ startDate, endDate }) => {
    let query = supabase.from('invoices_enhanced').select('*')

    if (startDate) query = query.gte('issue_date', startDate)
    if (endDate) query = query.lte('issue_date', endDate)

    const { data: invoices } = await query

    const totalBilled = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0
    const totalPaid = invoices?.reduce((sum, inv) => sum + Number(inv.paid_amount), 0) || 0
    const totalOutstanding = totalBilled - totalPaid

    const statusCount = {
      draft: invoices?.filter(inv => inv.status === 'draft').length || 0,
      sent: invoices?.filter(inv => inv.status === 'sent').length || 0,
      paid: invoices?.filter(inv => inv.status === 'paid').length || 0,
    }

    return {
      success: true,
      summary: {
        totalBilled,
        totalPaid,
        totalOutstanding,
        invoiceCount: invoices?.length || 0,
        statusBreakdown: statusCount,
      },
    }
  },
})

// Tool 30: Get Overdue Invoices
export const getOverdueInvoicesTool = tool({
  description: 'Get list of overdue invoices that need payment follow-up',
  inputSchema: z.object({
    limit: z.number().default(20).describe('Number of results'),
  }),
  execute: async ({ limit }) => {
    const { data, error } = await supabase
      .from('invoices_enhanced')
      .select(`*,clients(name,email,phone)`)
      .lt('due_date', new Date().toISOString())
      .neq('status', 'paid')
      .neq('status', 'cancelled')
      .order('due_date', { ascending: true })
      .limit(limit)

    if (error) throw new Error(`Failed to fetch overdue invoices: ${error.message}`)

    const overdueAmount = data?.reduce((sum, inv) => sum + Number(inv.balance_due), 0) || 0

    return {
      success: true,
      count: data?.length || 0,
      totalOverdueAmount: overdueAmount,
      invoices: data,
    }
  },
})

// ==================== MATERIALS & VENDORS TOOLS (32-36) ====================

// Tool 32: Add Vendor
export const addVendorTool = tool({
  description: 'Add a new material supplier/vendor to the database',
  inputSchema: z.object({
    name: z.string().describe('Vendor/supplier name'),
    contactPerson: z.string().optional().describe('Contact person name'),
    phone: z.string().optional().describe('Phone number'),
    email: z.string().optional().describe('Email address'),
    address: z.string().optional().describe('Business address'),
    materials: z.array(z.string()).optional().describe('Materials they supply'),
    notes: z.string().optional().describe('Additional notes'),
  }),
  execute: async ({ name, contactPerson, phone, email, address, materials, notes }) => {
    const { data, error } = await supabase
      .from('external_vendors')
      .insert({
        name,
        contact_person: contactPerson,
        phone,
        email,
        address,
        materials_supplied: materials,
        notes,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to add vendor: ${error.message}`)

    return {
      success: true,
      vendor: data,
      message: `Vendor "${name}" added successfully`,
    }
  },
})

// Tool 33: List Vendors
export const listVendorsTool = tool({
  description: 'List all material suppliers/vendors',
  inputSchema: z.object({
    searchTerm: z.string().optional().describe('Search by name'),
    limit: z.number().default(50).describe('Number of results'),
  }),
  execute: async ({ searchTerm, limit }) => {
    let query = supabase
      .from('external_vendors')
      .select('*')
      .order('name', { ascending: true })
      .limit(limit)

    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`)
    }

    const { data, error } = await query

    if (error) throw new Error(`Failed to list vendors: ${error.message}`)

    return {
      success: true,
      count: data.length,
      vendors: data,
    }
  },
})

// Tool 34: Record Material Purchase
export const recordMaterialPurchaseTool = tool({
  description: 'Record a material purchase from a vendor, updates inventory automatically',
  inputSchema: z.object({
    vendorId: z.string().describe('Vendor UUID'),
    materialId: z.string().describe('Material UUID (from materials table)'),
    quantity: z.number().describe('Quantity purchased'),
    unitCost: z.number().describe('Cost per unit'),
    totalCost: z.number().describe('Total purchase cost'),
    invoiceNumber: z.string().optional().describe('Vendor invoice number'),
    purchaseDate: z.string().optional().describe('Purchase date (ISO format)'),
    notes: z.string().optional().describe('Additional notes'),
  }),
  execute: async ({ vendorId, materialId, quantity, unitCost, totalCost, invoiceNumber, purchaseDate, notes }) => {
    // Record purchase
    const { data: purchase, error: purchaseError } = await supabase
      .from('material_purchases')
      .insert({
        vendor_id: vendorId,
        material_id: materialId,
        quantity,
        unit_cost: unitCost,
        total_cost: totalCost,
        invoice_number: invoiceNumber,
        purchase_date: purchaseDate || new Date().toISOString(),
        notes,
      })
      .select('*, external_vendors(name), materials(name)')
      .single()

    if (purchaseError) throw new Error(`Failed to record purchase: ${purchaseError.message}`)

    // Update material stock
    const { error: stockError } = await supabase.rpc('increment_material_stock', {
      material_id: materialId,
      amount: quantity,
    })

    // If RPC doesn't exist, fallback to manual update
    if (stockError) {
      const { data: material } = await supabase
        .from('materials')
        .select('quantity_available, name, unit')
        .eq('id', materialId)
        .single()

      await supabase
        .from('materials')
        .update({ quantity: (material?.quantity_available || 0) + quantity })
        .eq('id', materialId)
    }

    return {
      success: true,
      purchase,
      message: `Purchased ${quantity} units of ${purchase.materials?.name} from ${purchase.external_vendors?.name}`,
    }
  },
})

// Tool 35: List Material Purchases
export const listMaterialPurchasesTool = tool({
  description: 'List all material purchase history with filters',
  inputSchema: z.object({
    vendorId: z.string().optional().describe('Filter by vendor UUID'),
    materialId: z.string().optional().describe('Filter by material UUID'),
    startDate: z.string().optional().describe('Start date filter (ISO format)'),
    endDate: z.string().optional().describe('End date filter (ISO format)'),
    limit: z.number().default(50).describe('Number of results'),
  }),
  execute: async ({ vendorId, materialId, startDate, endDate, limit }) => {
    let query = supabase
      .from('material_purchases')
      .select('*, external_vendors(name), materials(name, unit)')
      .order('purchase_date', { ascending: false })
      .limit(limit)

    if (vendorId) query = query.eq('vendor_id', vendorId)
    if (materialId) query = query.eq('material_id', materialId)
    if (startDate) query = query.gte('purchase_date', startDate)
    if (endDate) query = query.lte('purchase_date', endDate)

    const { data, error } = await query

    if (error) throw new Error(`Failed to list purchases: ${error.message}`)

    const totalSpent = data.reduce((sum, p) => sum + Number(p.total_cost), 0)

    return {
      success: true,
      count: data.length,
      totalSpent,
      purchases: data,
    }
  },
})

// Tool 36: Get Vendor History
export const getVendorHistoryTool = tool({
  description: 'Get complete purchase history and statistics for a specific vendor',
  inputSchema: z.object({
    vendorId: z.string().describe('Vendor UUID'),
  }),
  execute: async ({ vendorId }) => {
    const { data: vendor, error: vendorError } = await supabase
      .from('external_vendors')
      .select('*')
      .eq('id', vendorId)
      .single()

    if (vendorError) throw new Error(`Failed to fetch vendor: ${vendorError.message}`)

    const { data: purchases } = await supabase
      .from('material_purchases')
      .select('*, materials(name, unit)')
      .eq('vendor_id', vendorId)
      .order('purchase_date', { ascending: false })

    const totalSpent = purchases?.reduce((sum, p) => sum + Number(p.total_cost), 0) || 0
    const totalPurchases = purchases?.length || 0

    // Get most purchased materials
    const materialCounts = purchases?.reduce((acc, p) => {
      const materialName = p.materials?.name || 'Unknown'
      acc[materialName] = (acc[materialName] || 0) + Number(p.quantity)
      return acc
    }, {} as Record<string, number>)

    return {
      success: true,
      vendor,
      statistics: {
        totalPurchases,
        totalSpent,
        mostPurchasedMaterials: materialCounts,
      },
      recentPurchases: purchases?.slice(0, 10),
    }
  },
})

// ==================== TIME TRACKING TOOLS (37-40) ====================

// Tool 37: Start Time Entry
export const startTimeEntryTool = tool({
  description: 'Start a time tracking session for a project or task',
  inputSchema: z.object({
    projectId: z.string().describe('Project UUID'),
    taskId: z.string().optional().describe('Task UUID (optional)'),
    description: z.string().optional().describe('What are you working on?'),
  }),
  execute: async ({ projectId, taskId, description }) => {
    // Check if there's already an active timer
    const { data: activeTimer } = await supabase
      .from('time_entries')
      .select('*')
      .is('end_time', null)
      .single()

    if (activeTimer) {
      return {
        success: false,
        error: 'You already have an active timer running. Stop it first.',
        activeTimer,
      }
    }

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        project_id: projectId,
        task_id: taskId,
        start_time: new Date().toISOString(),
        description,
      })
      .select('*, projects(name), tasks(name)')
      .single()

    if (error) throw new Error(`Failed to start timer: ${error.message}`)

    return {
      success: true,
      timeEntry: data,
      message: `Timer started for ${data.projects?.name || 'project'}`,
    }
  },
})

// Tool 38: Stop Time Entry
export const stopTimeEntryTool = tool({
  description: 'Stop the currently active time tracking session',
  inputSchema: z.object({
    notes: z.string().optional().describe('Add completion notes'),
  }),
  execute: async ({ notes }) => {
    // Find active timer
    const { data: activeTimer, error: findError } = await supabase
      .from('time_entries')
      .select('*, projects(name)')
      .is('end_time', null)
      .single()

    if (findError || !activeTimer) {
      return {
        success: false,
        error: 'No active timer found',
      }
    }

    const endTime = new Date()
    const startTime = new Date(activeTimer.start_time)
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60)

    // Update the entry
    const { data, error } = await supabase
      .from('time_entries')
      .update({
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        notes: notes || activeTimer.description,
      })
      .eq('id', activeTimer.id)
      .select()
      .single()

    if (error) throw new Error(`Failed to stop timer: ${error.message}`)

    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60

    return {
      success: true,
      timeEntry: data,
      duration: {
        minutes: durationMinutes,
        formatted: `${hours}h ${minutes}m`,
      },
      message: `Timer stopped. Total time: ${hours}h ${minutes}m on ${activeTimer.projects?.name}`,
    }
  },
})

// Tool 39: List Time Entries
export const listTimeEntriesTool = tool({
  description: 'List time entries with filters for project, date range, or status',
  inputSchema: z.object({
    projectId: z.string().optional().describe('Filter by project UUID'),
    taskId: z.string().optional().describe('Filter by task UUID'),
    startDate: z.string().optional().describe('Start date filter (ISO format)'),
    endDate: z.string().optional().describe('End date filter (ISO format)'),
    activeOnly: z.boolean().optional().describe('Show only active timers'),
    limit: z.number().default(50).describe('Number of results'),
  }),
  execute: async ({ projectId, taskId, startDate, endDate, activeOnly, limit }) => {
    let query = supabase
      .from('time_entries')
      .select('*, projects(name), tasks(name)')
      .order('start_time', { ascending: false })
      .limit(limit)

    if (projectId) query = query.eq('project_id', projectId)
    if (taskId) query = query.eq('task_id', taskId)
    if (startDate) query = query.gte('start_time', startDate)
    if (endDate) query = query.lte('start_time', endDate)
    if (activeOnly) query = query.is('end_time', null)

    const { data, error } = await query

    if (error) throw new Error(`Failed to list time entries: ${error.message}`)

    const totalMinutes = data
      .filter(entry => entry.duration_minutes)
      .reduce((sum, entry) => sum + Number(entry.duration_minutes), 0)

    const totalHours = Math.floor(totalMinutes / 60)
    const remainingMinutes = totalMinutes % 60

    return {
      success: true,
      count: data.length,
      totalTime: {
        minutes: totalMinutes,
        formatted: `${totalHours}h ${remainingMinutes}m`,
      },
      entries: data,
    }
  },
})

// Tool 40: Get Project Time Report
export const getProjectTimeReportTool = tool({
  description: 'Generate a time tracking report for a specific project with statistics',
  inputSchema: z.object({
    projectId: z.string().describe('Project UUID'),
    startDate: z.string().optional().describe('Report start date (ISO format)'),
    endDate: z.string().optional().describe('Report end date (ISO format)'),
  }),
  execute: async ({ projectId, startDate, endDate }) => {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, clients(name)')
      .eq('id', projectId)
      .single()

    if (projectError) throw new Error(`Failed to fetch project: ${projectError.message}`)

    let query = supabase
      .from('time_entries')
      .select('*, tasks(name)')
      .eq('project_id', projectId)
      .not('duration_minutes', 'is', null)

    if (startDate) query = query.gte('start_time', startDate)
    if (endDate) query = query.lte('start_time', endDate)

    const { data: entries } = await query

    const totalMinutes = entries?.reduce((sum, e) => sum + Number(e.duration_minutes), 0) || 0
    const totalHours = (totalMinutes / 60).toFixed(2)

    // Group by task
    const timeByTask = entries?.reduce((acc, entry) => {
      const taskname = entry.tasks?.name || 'No task assigned'
      if (!acc[taskname]) {
        acc[taskname] = { minutes: 0, entries: 0 }
      }
      acc[taskname].minutes += Number(entry.duration_minutes)
      acc[taskname].entries += 1
      return acc
    }, {} as Record<string, { minutes: number; entries: number }>)

    // Calculate labor cost (assuming default rate)
    const laborRate = 500 // ₹500/hour default
    const laborCost = (totalMinutes / 60) * laborRate

    return {
      success: true,
      project: {
        name: project.name,
        client: project.clients?.name,
      },
      summary: {
        totalHours: parseFloat(totalHours),
        totalMinutes,
        entryCount: entries?.length || 0,
        laborCost,
      },
      breakdown: timeByTask,
      dateRange: {
        start: startDate || 'all time',
        end: endDate || 'present',
      },
    }
  },
})


//=========================================================================
//            vendor workers tools (31)               //
//=========================================================================

export const checkVendorAvailability = {
  name: "checkVendorAvailability",
  description: "Check availability and details of vendors",
  parameters: z.object({
    vendor_type: z.enum(['molding', 'casting', 'painting', 'brass', 'all']).optional(),
    vendor_id: z.string().optional()
  }),
  execute: async ({ vendor_type, vendor_id }: any) => {
    try {
      let vendors;
      
      if (vendor_id) {
        const vendor = await VendorManager.getVendor(vendor_id);
        vendors = vendor ? [vendor] : [];
      } else if (vendor_type === 'all' || !vendor_type) {
        vendors = await VendorManager.getAllVendors();
      } else {
        vendors = await VendorManager.getVendorsByType(vendor_type);
      }
      
      return {
        success: true,
        vendors: vendors.map(v => ({
          id: v.id,
          name: v.name,
          type: v.type,
          contact_person: v.contact_person,
          phone: v.phone,
          reliability_score: v.reliability_score,
          is_available: v.is_available,
          materials_supplied: v.materials_supplied,
          notes: v.notes
        })),
        summary: `Found ${vendors.length} vendors${vendor_type ? ` of type ${vendor_type}` : ''}`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  },
};

export const findVendorForTask = {
  name: "findVendorForTask",
  description: "Find the best vendor for a specific task",
  parameters: z.object({
    task_name: z.string(),
    project_id: z.string().optional()
  }),
  execute: async ({ task_name, project_id }: any) => {
    try {
      const vendor = await VendorManager.findVendorForTask(task_name);
      
      if (!vendor) {
        return {
          success: false,
          error: `No suitable vendor found for task: ${task_name}`
        };
      }
      
      return {
        success: true,
        vendor: {
          id: vendor.id,
          name: vendor.name,
          type: vendor.type,
          contact_person: vendor.contact_person,
          phone: vendor.phone,
          reliability_score: vendor.reliability_score,
          notes: vendor.notes
        },
        recommendation: `Use ${vendor.name} for ${task_name} (Reliability: ${vendor.reliability_score}%)`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  },
};
//=========================================================================
//.                      pdf generatiion tools (41-45)                     //
//=========================================================================

import { PDFGenerator } from './pdf-generator';

// invoice generation pdf tool
export const generateInvoicePDF = {
  name: "generateInvoicePDF",
  description: "Generate professional PDF invoice with studio branding",
  parameters: z.object({
    project_id: z.string(),
    client_id: z.string(),
    items: z.array(z.object({
      description: z.string(),
      quantity: z.number(),
      rate: z.number(),
    })),
    notes: z.string().optional(),
  }),
  execute: async ({ project_id, client_id, items, notes }: any) => {
    try {
      // Get project and client data from database
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', project_id)
        .single();

      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', client_id)
        .single();

      if (!project || !client) {
        throw new Error('Project or client not found');
      }

      // Calculate totals
      const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.rate), 0);
      const tax = subtotal * 0.18;
      const total = subtotal + tax;

      // Prepare invoice data
      const invoiceData = {
        invoiceNumber: PDFGenerator.generateInvoiceNumber(),
        date: new Date().toLocaleDateString('en-IN'),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
        client: {
          name: client.name,
          address: client.address || 'Not provided',
          phone: client.phone || 'Not provided',
        },
        items: items.map((item: any) => ({
          ...item,
          amount: item.quantity * item.rate,
        })),
        subtotal,
        tax,
        total,
        notes,
      };

      // Generate PDF
      const pdfBytes = await PDFGenerator.generateInvoice(invoiceData);
      const pdfUrl = await PDFGenerator.savePDF(pdfBytes, `invoice-${invoiceData.invoiceNumber}.pdf`);

      // Save invoice record to database
      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          project_id,
          client_id,
          invoice_number: invoiceData.invoiceNumber,
          amount: total,
          items: invoiceData.items,
          status: 'generated',
          pdf_url: pdfUrl,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        invoice_number: invoiceData.invoiceNumber,
        pdf_url: pdfUrl,
        amount: total,
        download_url: pdfUrl, // For immediate download
        message: `Invoice ${invoiceData.invoiceNumber} generated successfully. Click the download URL to get the PDF.`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// quotation generation pdf tool
export const generateQuotationPDF = {
  name: "generateQuotationPDF",
  description: "Generate professional PDF quotation for sculpture projects",
  parameters: z.object({
    project_id: z.string(),
    client_id: z.string(),
    items: z.array(z.object({
      description: z.string(),
      amount: z.number(),
    })),
    terms: z.string().optional(),
    valid_days: z.number().default(15) // How long quotation is valid
  }),
  execute: async ({ project_id, client_id, items, terms, valid_days }: any) => {
    try {
      // Get project and client data from database
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', project_id)
        .single();

      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', client_id)
        .single();

      if (!project || !client) {
        throw new Error('Project or client not found');
      }

      // Calculate totals
      const subtotal = items.reduce((sum: number, item: any) => sum + item.amount, 0);
      const tax = subtotal * 0.18; // 18% GST
      const total = subtotal + tax;

      // Prepare quotation data
      const quotationData = {
        quotationNumber: PDFGenerator.generateQuotationNumber(),
        date: new Date().toLocaleDateString('en-IN'),
        validUntil: new Date(Date.now() + valid_days * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
        client: {
          name: client.name,
          address: client.address || 'Not provided',
          phone: client.phone || 'Not provided',
        },
        project: {
          name: project.name,
          type: project.type,
          deadline: project.deadline,
        },
        items: items,
        subtotal,
        tax,
        total,
        terms: terms || '50% advance, 50% on completion. Delivery within agreed timeline.',
      };

      // Generate PDF
      const pdfBytes = await PDFGenerator.generateQuotation(quotationData);
      const pdfUrl = await PDFGenerator.savePDF(pdfBytes, `quotation-${quotationData.quotationNumber}.pdf`);

      // Save quotation record to database
      const { data: quotation, error } = await supabase
        .from('quotations')
        .insert({
          project_id,
          client_id,
          quotation_number: quotationData.quotationNumber,
          amount: total,
          items: quotationData.items,
          status: 'sent',
          pdf_url: pdfUrl,
          valid_until: quotationData.validUntil
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        quotation_number: quotationData.quotationNumber,
        pdf_url: pdfUrl,
        download_url: pdfUrl, // For immediate download
        amount: total,
        valid_until: quotationData.validUntil,
        message: `Quotation ${quotationData.quotationNumber} generated successfully. Click the download URL to get the PDF.`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// quick quotation generation pdf tool



// ============================================================================= 
//                              AI TOOL 
// =============================================================================

// ==================== CONTEXT-AWARE SYSTEM TOOLS ====================

export const generateOptimizedDailySchedule = {
  name: "generateOptimizedDailySchedule",
  description: "ULTIMATE AI scheduler that considers dependencies, materials, team availability, and finds parallel work opportunities",
  parameters: z.object({
    date: z.string().describe("Schedule date in YYYY-MM-DD format"),
    include_risk_analysis: z.boolean().default(true)
  }),
  execute: async ({ date, include_risk_analysis }: { date: string; include_risk_analysis: boolean }) => {
    try {
      const scheduler = new ConstraintScheduler();
      const schedule = await scheduler.generateDailySchedule(new Date(date));
      
      return {
        success: true,
        schedule: schedule.tasks,
        parallelOpportunities: schedule.parallelOpportunities,
        riskFactors: schedule.riskFactors,
        confidenceScore: schedule.confidenceScore,
        summary: `Generated schedule for ${schedule.date} with ${schedule.tasks.length} tasks and ${schedule.parallelOpportunities.length} parallel work opportunities. Confidence: ${(schedule.confidenceScore * 100).toFixed(0)}%`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        schedule: [],
        parallelOpportunities: [],
        riskFactors: [],
        confidenceScore: 0
      };
    }
  }
};

export const clearConstraintTool = tool({
  description: 'Remove a specific constraint from AI memory',
  inputSchema: z.object({
    constraintKey: z.string().describe('Constraint key to remove'),
  }),
  execute: async ({ constraintKey }) => {
    const { error } = await supabase
      .from('ai_context_memory')
      .delete()
      .eq('context_key', constraintKey)

    if (error) throw new Error(`Failed to clear constraint: ${error.message}`)

    return {
      success: true,
      message: `✅ Constraint "${constraintKey}" cleared from memory`
    }
  }
})

class SculptureScheduler {
  private async fetchActiveProjects(): Promise<ProjectWithRelations[]> {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        clients(*),
        tasks(*),
        project_materials(*, materials(*))
      `)
      .in('status', ['active', 'in_progress'])
      .order('deadline', { ascending: true })

    if (error) throw new Error(getErrorMessage(error))
    return data || []
  }

  private async fetchPendingTasks(): Promise<TaskWithRelations[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, projects(*, clients(*))')
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true })

    if (error) throw new Error(getErrorMessage(error))
    return data || []
  }

  private async fetchMaterials(): Promise<Tables<'materials'>[]> {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('quantity_available', { ascending: true })

    if (error) throw new Error(getErrorMessage(error))
    return data || []
  }

    private analyzeProject(project: ProjectWithRelations, materials: Tables<'materials'>[]): ProjectAnalysis {
    const today = new Date()
    const deadline = project.deadline ? new Date(project.deadline) : null
    
    const daysUntilDeadline = deadline 
      ? Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : 999

    const paymentProgress = project.budget_amount 
      ? ((project.paid_amount || 0) / project.budget_amount) * 100 
      : 0

    const materialStatus = this.checkMaterialAvailability(project, materials)
    const taskProgress = this.calculateTaskProgress(project.tasks)

    const priorityScore = this.calculatePriorityScore(
      daysUntilDeadline,
      paymentProgress,
      materialStatus.available,
      taskProgress,
      project.priority
    )

    return {
      projectId: project.id,
      projectName: project.name,
      clientName: project.clients?.name || 'Unknown Client',
      deadline: project.deadline || undefined,
      daysUntilDeadline,
      paymentProgress,
      materialStatus,
      taskProgress,
      priorityScore,
      urgency: this.getUrgencyLevel(daysUntilDeadline)
    }
  }

  private checkMaterialAvailability(project: ProjectWithRelations, materials: Tables<'materials'>[]): { available: boolean; missing: string[] } {
    if (!project.project_materials || project.project_materials.length === 0) {
      return { available: true, missing: [] }
    }

    const missing: string[] = []
    
    project.project_materials.forEach(pm => {
      const material = materials.find(m => m.id === pm.material_id)
      if (!material || (material.quantity_available ?? 0) < pm.quantity) {
        missing.push(material?.name || 'Unknown material')
      }
    })

    return {
      available: missing.length === 0,
      missing
    }
  }

  private calculateTaskProgress(tasks: Tables<'tasks'>[]): number {
    if (!tasks || tasks.length === 0) return 0
    
    const completed = tasks.filter(task => task.status === 'completed').length
    return (completed / tasks.length) * 100
  }

  private calculatePriorityScore(
    daysUntilDeadline: number,
    paymentProgress: number,
    materialAvailable: boolean,
    taskProgress: number,
    priority: string | null
  ): number {
    let score = 0

    // Deadline urgency (40 points)
    if (daysUntilDeadline <= 1) score += 40
    else if (daysUntilDeadline <= 3) score += 35
    else if (daysUntilDeadline <= 7) score += 25
    else if (daysUntilDeadline <= 14) score += 15
    else score += 5

    // Payment status (25 points)
    if (paymentProgress >= 100) score += 25
    else if (paymentProgress >= 50) score += 20
    else if (paymentProgress >= 25) score += 10

    // Material availability (20 points)
    if (materialAvailable) score += 20

    // Task progress (10 points)
    if (taskProgress > 75) score += 10
    else if (taskProgress > 50) score += 7
    else if (taskProgress > 25) score += 4

    // Project priority (5 points)
    if (priority === 'urgent') score += 5
    else if (priority === 'high') score += 3

    return score
  }

  private getUrgencyLevel(daysUntilDeadline: number): 'critical' | 'high' | 'medium' | 'low' {
    if (daysUntilDeadline <= 1) return 'critical'
    if (daysUntilDeadline <= 3) return 'high'
    if (daysUntilDeadline <= 7) return 'medium'
    return 'low'
  }

  private canTeamMemberDoTask(taskName: string, teamMember: 'dhanush' | 'john'): boolean {
    const taskLower = taskName.toLowerCase()
    const skills = BUSINESS_CONFIG.team[teamMember].skills
    
    return skills.some(skill => taskLower.includes(skill)) || teamMember === 'dhanush'
  }

  public async generateDailyPlan(params: { 
    date?: string; 
    teamMember?: 'dhanush' | 'john' | 'all';
    focusArea?: 'deadline' | 'payments' | 'materials' | 'all' 
  }) {
    const { date, teamMember = 'all', focusArea = 'all' } = params
    const workDate = date || new Date().toISOString().split('T')[0]
    
    try {
      const [projects, tasks, materials] = await Promise.all([
        this.fetchActiveProjects(),
        this.fetchPendingTasks(),
        this.fetchMaterials()
      ])

      // Analyze all projects
      const projectAnalysis = projects.map(project => this.analyzeProject(project, materials))
      
      // Generate task schedule
      const dailyPlan = this.createTaskSchedule(projectAnalysis, tasks, teamMember, focusArea)
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(projectAnalysis, materials)

      return {
        success: true,
        date: workDate,
        summary: {
          totalTasks: dailyPlan.length,
          totalHours: dailyPlan.reduce((sum, task) => sum + task.estimatedHours, 0),
          teamMember: teamMember === 'all' ? 'Dhanush & John' : teamMember,
          focusArea
        },
        dailyPlan,
        recommendations,
        projectStatus: projectAnalysis.map(p => ({
          project: p.projectName,
          urgency: p.urgency,
          progress: `${p.taskProgress.toFixed(0)}%`,
          status: p.materialStatus.available ? 'Ready' : 'Blocked'
        }))
      }

    } catch (error) {
      throw new Error(`Failed to generate daily plan: ${getErrorMessage(error)}`)
    }
  }

  private createTaskSchedule(
    projectAnalysis: ProjectAnalysis[],
    tasks: TaskWithRelations[],
    teamMember: 'dhanush' | 'john' | 'all',
    focusArea: string
  ): DailyTask[] {
    const availableHours = teamMember === 'all' 
      ? BUSINESS_CONFIG.team.dhanush.dailyHours + BUSINESS_CONFIG.team.john.dailyHours
      : BUSINESS_CONFIG.team[teamMember].dailyHours

    let remainingHours = availableHours
    const schedule: DailyTask[] = []

    // Filter tasks based on focus area and team member capability
    const eligibleTasks = tasks.filter(task => {
      const project = projectAnalysis.find(p => p.projectId === task.project_id)
      if (!project) return false

      // Check focus area
      if (focusArea === 'deadline' && project.daysUntilDeadline > 7) return false
      if (focusArea === 'payments' && project.paymentProgress >= 100) return false
      if (focusArea === 'materials' && !project.materialStatus.available) return false

      // Check team member capability
      if (teamMember !== 'all') {
        return this.canTeamMemberDoTask(task.name, teamMember)
      }

      return true
    })

    // Sort by project priority and task due date
    eligibleTasks.sort((a, b) => {
      const projectA = projectAnalysis.find(p => p.projectId === a.project_id)!
      const projectB = projectAnalysis.find(p => p.projectId === b.project_id)!
      
      if (projectA.priorityScore !== projectB.priorityScore) {
        return projectB.priorityScore - projectA.priorityScore
      }
      
      const dateA = a.due_date ? new Date(a.due_date) : new Date(9999, 11, 31)
      const dateB = b.due_date ? new Date(b.due_date) : new Date(9999, 11, 31)
      return dateA.getTime() - dateB.getTime()
    })

    // Allocate tasks to schedule
    for (const task of eligibleTasks) {
      if (remainingHours <= 0) break

      const taskHours = Math.min((task.estimated_hours || 2), remainingHours)
      const project = projectAnalysis.find(p => p.projectId === task.project_id)!

      // Determine assignment
      let assignedTo: 'dhanush' | 'john' = 'dhanush'
      if (teamMember === 'all') {
        assignedTo = this.canTeamMemberDoTask(task.name, 'john') ? 'john' : 'dhanush'
      } else {
        assignedTo = teamMember
      }

      const dailyTask: DailyTask = {
        taskId: task.id,
        name: task.name,
        project: task.projects?.name || 'Unknown Project',
        client: task.projects?.clients?.name || 'Unknown Client',
        estimatedHours: taskHours,
        timeSlot: this.assignTimeSlot(schedule, taskHours),
        priority: project.urgency,
        assignedTo,
        materialCheck: project.materialStatus.available ? 'ready' : 'blocked'
      }

      schedule.push(dailyTask)
      remainingHours -= taskHours
    }

    return schedule
  }

  private assignTimeSlot(schedule: DailyTask[], taskHours: number): 'morning' | 'afternoon' | 'ongoing' {
    const morningTasks = schedule.filter(t => t.timeSlot === 'morning')
    const afternoonTasks = schedule.filter(t => t.timeSlot === 'afternoon')
    const morningHours = morningTasks.reduce((sum, t) => sum + t.estimatedHours, 0)
    
    if (morningHours + taskHours <= 4) return 'morning'
    if (afternoonTasks.length < 3) return 'afternoon'
    return 'ongoing'
  }

  private generateRecommendations(projectAnalysis: ProjectAnalysis[], materials: Tables<'materials'>[]) {
    const recommendations: Array<{type: string; priority: string; message: string; action: string}> = []

    // Critical deadlines
    const criticalProjects = projectAnalysis.filter(p => p.urgency === 'critical')
    if (criticalProjects.length > 0) {
      recommendations.push({
        type: 'deadline',
        priority: 'critical',
        message: `${criticalProjects.length} projects with critical deadlines`,
        action: `Focus on: ${criticalProjects.map(p => p.projectName).join(', ')}`
      })
    }

    // Material shortages
    const blockedProjects = projectAnalysis.filter(p => !p.materialStatus.available)
    if (blockedProjects.length > 0) {
      recommendations.push({
        type: 'material',
        priority: 'high',
        message: `${blockedProjects.length} projects blocked by material shortages`,
        action: `Order materials for: ${blockedProjects.map(p => p.projectName).join(', ')}`
      })
    }

    // Low stock alerts
    const lowStock = materials.filter(m => (m.quantity_available ?? 0) <= (m.reorder_level ?? 0))
    if (lowStock.length > 0) {
      recommendations.push({
        type: 'inventory',
        priority: 'medium',
        message: `${lowStock.length} materials below reorder level`,
        action: `Restock: ${lowStock.slice(0, 3).map(m => m.name).join(', ')}`
      })
    }

    // Payment follow-ups
    const unpaidProjects = projectAnalysis.filter(p => p.paymentProgress < 50)
    if (unpaidProjects.length > 0) {
      recommendations.push({
        type: 'payment',
        priority: 'medium',
        message: `${unpaidProjects.length} projects with less than 50% payment`,
        action: `Send payment reminders for: ${unpaidProjects.map(p => p.projectName).join(', ')}`
      })
    }

    return recommendations
  }
}

// NEW: ContextAwareScheduler that extends without breaking anything
class ContextAwareScheduler {
  private baseScheduler: SculptureScheduler;

  constructor() {
    this.baseScheduler = new SculptureScheduler();
  }

  private async getActiveConstraints(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('ai_context_memory')
        .select('context_value')
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

      if (error) {
        console.error('Error fetching constraints:', error);
        return [];
      }

      return data?.map(item => item.context_value) || [];
    } catch (error) {
      console.error('Error in getActiveConstraints:', error);
      return [];
    }
  }

  private applyConstraints(tasks: any[], constraints: any[]): any[] {
    if (!constraints || constraints.length === 0) return tasks;

    let filteredTasks = [...tasks];

    constraints.forEach(constraint => {
      if (!constraint) return;

      switch (constraint.type) {
        case 'team_availability':
          if (constraint.value && (constraint.value.includes('sick') || constraint.value.includes('unavailable'))) {
            const teamMember = constraint.key?.includes('john') ? 'john' : 'dhanush';
            filteredTasks = filteredTasks.filter(task => 
              task.assigned_to !== teamMember
            );
          }
          break;

        case 'equipment_status':
          if (constraint.value && (constraint.value.includes('broken') || constraint.value.includes('down'))) {
            const equipment = constraint.key?.toLowerCase() || '';
            filteredTasks = filteredTasks.filter(task => 
              !task.name?.toLowerCase().includes(equipment) &&
              !task.description?.toLowerCase().includes(equipment)
            );
          }
          break;

        case 'client_priority':
          if (constraint.value && constraint.value.includes('urgent')) {
            const clientName = constraint.key?.toLowerCase() || '';
            filteredTasks.forEach(task => {
              if (task.client?.toLowerCase().includes(clientName)) {
                task.priorityScore = (task.priorityScore || 0) + 30;
              }
            });
          }
          break;

        case 'material_delay':
          if (constraint.value && constraint.value.includes('delayed')) {
            const material = constraint.key?.toLowerCase() || '';
            filteredTasks = filteredTasks.filter(task => 
              !task.materialCheck?.includes(material)
            );
          }
          break;
      }
    });

    return filteredTasks;
  }

   }

// Data consistency validation
export const validateProjectDataTool = tool({
  description: 'Validate project data consistency and identify data quality issues',
  inputSchema: z.object({
    projectId: z.string()
  }),
  execute: async ({ projectId }) => {
    const issues: string[] = []; // ✅ Explicitly type the issues array

    // Check for tasks without assigned team members
    const { data: unassignedTasks } = await supabase
      .from('tasks')
      .select('id, name')
      .eq('project_id', projectId)
      .is('assigned_to', null)

    if (unassignedTasks?.length) {
      issues.push(`Found ${unassignedTasks.length} unassigned tasks`)
    }

    // Check for material usage without cost data
    const { data: uncostedMaterials } = await supabase
      .from('material_usage')
      .select('id')
      .eq('project_id', projectId)
      .is('cost_at_time', null)

    if (uncostedMaterials?.length) {
      issues.push(`Found ${uncostedMaterials.length} material usages without cost data`)
    }

    // Check for timeline inconsistencies
    const { data: timelineIssues } = await supabase
      .from('tasks')
      .select('id, name, due_date, depends_on')
      .eq('project_id', projectId)
      .not('depends_on', 'is', null)

    // Validate dependency chains
    for (const task of timelineIssues || []) {
      const { data: dependency } = await supabase
        .from('tasks')
        .select('due_date')
        .eq('id', task.depends_on)
        .single()

      if (dependency && new Date(task.due_date) < new Date(dependency.due_date)) {
        issues.push(`Task "${task.name}" has due date before its dependency`)
      }
    }

    return {
      projectId,
      dataQuality: {
        issueCount: issues.length,
        severity: issues.length > 5 ? 'high' : issues.length > 2 ? 'medium' : 'low',
        issues
      },
      recommendations: issues.length > 0 ? [
        'Review and assign unassigned tasks',
        'Update missing cost data for materials',
        'Fix timeline inconsistencies in task dependencies'
      ] : ['Data quality is good']
    }
  },
})


//=================================HELPER FUNCTIONS=================================//

// Helper function to calculate team member capacity and utilization
function calculateTeamCapacity(teamMember: 'dhanush' | 'john', scheduledHours: number) {
  const config = BUSINESS_CONFIG.team[teamMember];
  const dailyHours = config.dailyHours;
  const availableHours = Math.max(0, dailyHours - scheduledHours);
  const utilization = dailyHours > 0 ? (scheduledHours / dailyHours) * 100 : 0;
  
  return {
    dailyHours,
    scheduledHours,
    availableHours,
    utilization: Math.round(utilization),
    capacityStatus: getCapacityStatus(utilization)
  };
}

// Helper function to determine capacity status
function getCapacityStatus(utilization: number): 'underutilized' | 'optimal' | 'high' | 'overloaded' {
  if (utilization < 50) return 'underutilized';
  if (utilization < 80) return 'optimal';
  if (utilization < 95) return 'high';
  return 'overloaded';
}

// Helper function to format time display
function formatHours(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) return `${wholeHours}h`;
  return `${wholeHours}h ${minutes}m`;
}

// Helper function to get skill-based task recommendations
function getSkillBasedRecommendations(teamMember: 'dhanush' | 'john', pendingTasks: any[]) {
  const skills = BUSINESS_CONFIG.team[teamMember].skills;
  const suitableTasks = pendingTasks.filter(task => 
    skills.some(skill => 
      task.name?.toLowerCase().includes(skill.toLowerCase()) ||
      task.description?.toLowerCase().includes(skill.toLowerCase())
    )
  );
  
  return {
    suitableTasks: suitableTasks.length,
    recommendedTasks: suitableTasks.slice(0, 3).map(task => ({
      name: task.name,
      project: task.projects?.name,
      estimatedHours: task.estimated_hours
    }))
  };
}

// Helper function to calculate weekly workload trend
async function getWeeklyWorkloadTrend(teamMember: 'dhanush' | 'john') {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const { data: weeklyEntries } = await supabase
    .from('time_entries')
    .select('date, duration_minutes')
    .eq('team_member', teamMember)
    .gte('date', oneWeekAgo.toISOString().split('T')[0])
    .not('duration_minutes', 'is', null);
  
  const dailyHours: Record<string, number> = {};
  weeklyEntries?.forEach(entry => {
    const hours = entry.duration_minutes / 60;
    dailyHours[entry.date] = (dailyHours[entry.date] || 0) + hours;
  });
  
  return {
    averageDailyHours: weeklyEntries && weeklyEntries.length > 0 
      ? weeklyEntries.reduce((sum, entry) => sum + (entry.duration_minutes / 60), 0) / 7 
      : 0,
    trend: dailyHours
  };
}

// Project progress calculation helpers
function calculateProjectProgress(tasks: any[]): number {
  if (!tasks || tasks.length === 0) return 0
  
  const completed = tasks.filter((task: any) => task.status === 'completed').length
  return (completed / tasks.length) * 100
}

// Next steps determination helpers
function getNextSteps(tasks: any[]): string[] {
  if (!tasks || tasks.length === 0) return ['Project planning phase']
  
  const pendingTasks = tasks
    .filter((task: any) => task.status !== 'completed')
    .sort((a: any, b: any) => {
      // Sort by priority and due date
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
      const aPriority = priorityOrder[a.priority] || 0
      const bPriority = priorityOrder[b.priority] || 0
      
      if (aPriority !== bPriority) return bPriority - aPriority
      
      const aDate = a.due_date ? new Date(a.due_date) : new Date(9999, 11, 31)
      const bDate = b.due_date ? new Date(b.due_date) : new Date(9999, 11, 31)
      return aDate.getTime() - bDate.getTime()
    })
    .slice(0, 3)
    .map((task: any) => task.name)

  return pendingTasks.length > 0 ? pendingTasks : ['All tasks completed - awaiting client review']
}

// Client message generation helpers
function generateClientMessage(progress: number, clientName: string): string {
  let message = `Dear ${clientName},`

  if (progress < 25) {
    message += `\n\nI'm excited to share that we've begun work on your project! We're currently in the initial stages and making good progress.`
  } else if (progress < 50) {
    message += `\n\nYour project is coming along well! We've reached the ${Math.round(progress)}% completion mark and the vision is starting to take shape.`
  } else if (progress < 75) {
    message += `\n\nGreat news! Your project is now ${Math.round(progress)}% complete. The main structural work is done and we're moving into the detailing phase.`
  } else if (progress < 100) {
    message += `\n\nWe're in the final stages! Your project is ${Math.round(progress)}% complete and we're working on the finishing touches.`
  } else {
    message += `\n\nI'm thrilled to announce that your project is complete! We'll be in touch shortly to arrange delivery/installation.`
  }

  message += `\n\nPlease don't hesitate to reach out if you have any questions. We're committed to bringing your vision to life!\n\nBest regards,\nThe Sculpture Team`

  return message
}

// Cost saving tips helpers
function getCostSavingTips(projectType: string, clientBudget: number | undefined, totalCost: number): string[] {
  const tips: string[] = [];
  
  if (clientBudget && totalCost > clientBudget) {
    const overBudget = totalCost - clientBudget;
    tips.push(`Project exceeds budget by ₹${overBudget.toLocaleString()}. Consider:`);
    
    switch (projectType) {
      case 'bronze':
        tips.push('- Using thinner casting walls');
        tips.push('- Exploring alternative patina techniques');
        tips.push('- Simplifying complex geometries');
        break;
      case 'clay':
        tips.push('- Reusing armature materials');
        tips.push('- Bulk clay purchasing');
        tips.push('- Streamlining the molding process');
        break;
      case 'mixed_media':
        tips.push('- Sourcing local materials');
        tips.push('- Reducing resin usage with fillers');
        tips.push('- Combining material orders');
        break;
      case 'installation':
        tips.push('- Phased installation approach');
        tips.push('- Local fabrication to reduce transport');
        tips.push('- Modular design elements');
        break;
    }
  } else if (clientBudget && totalCost <= clientBudget * 0.8) {
    tips.push('Good cost efficiency. Consider premium finishes to enhance value.');
  }
  
  return tips;
}

// Health score calculation helpers
function calculateHealthScore(cashFlow: number, workload: number, materialAlerts: number): number {
  let score = 100;
  
  // Cash flow impact (40 points max deduction)
  if (cashFlow > 100000) score -= 40;
  else if (cashFlow > 50000) score -= 30;
  else if (cashFlow > 20000) score -= 15;
  else if (cashFlow > 10000) score -= 5;
  
  // Workload impact (30 points max deduction)
  if (workload > 12) score -= 30;
  else if (workload > 8) score -= 20;
  else if (workload > 4) score -= 10;
  
  // Inventory impact (20 points max deduction)
  if (materialAlerts > 10) score -= 20;
  else if (materialAlerts > 5) score -= 15;
  else if (materialAlerts > 2) score -= 8;
  
  // Bonus for good collection rate (if we had that data)
  
  return Math.max(0, Math.min(100, score));
}

// Health recommendations helpers
function generateHealthRecommendations(
  cashFlow: number, 
  workload: number, 
  materialAlerts: number,
  additionalMetrics?: {
    overdueInvoiceCount?: number;
    urgentTasksCount?: number;
    collectionRate?: number;
    activeProjects?: number;
  }
): string[] {
  const recommendations: string[] = [];
  const {
    overdueInvoiceCount = 0,
    urgentTasksCount = 0,
    collectionRate = 0,
    activeProjects = workload
  } = additionalMetrics || {};

  // Cash Flow & Financial Health (40% weight)
  if (cashFlow > 100000) {
    recommendations.push('🚨 CRITICAL: Over ₹1L in overdue payments - Implement immediate payment collection strategy');
    recommendations.push('💡 Consider offering payment plans for large overdue amounts');
  } else if (cashFlow > 50000) {
    recommendations.push('🔴 HIGH RISK: Over ₹50K overdue - Prioritize client follow-ups this week');
    recommendations.push('📞 Schedule payment reminder calls for top 5 overdue invoices');
  } else if (cashFlow > 20000) {
    recommendations.push('🟡 WARNING: ₹20K+ overdue - Send systematic payment reminders');
    recommendations.push('⏰ Follow up on invoices older than 30 days first');
  } else if (cashFlow > 0) {
    recommendations.push('ℹ️ Minor overdue amounts - Standard payment follow-up process');
  }

  if (collectionRate < 60 && collectionRate > 0) {
    recommendations.push('💰 Low collection rate - Review payment terms and client credit policies');
  }

  // Workload & Capacity Management (35% weight)
  if (workload > 12) {
    recommendations.push('🚨 CRITICAL: 12+ active projects - Consider pausing new projects or outsourcing');
    recommendations.push('👥 Evaluate team capacity and consider temporary staffing');
  } else if (workload > 8) {
    recommendations.push('🔴 HIGH: 8-12 projects - Monitor team burnout and project timelines closely');
    recommendations.push('📊 Conduct weekly capacity reviews with team');
  } else if (workload > 4) {
    recommendations.push('🟡 MODERATE: 4-8 projects - Manageable workload, maintain current pace');
    recommendations.push('✅ Good project pipeline health');
  } else if (workload > 0) {
    recommendations.push('🟢 HEALTHY: 1-4 projects - Consider business development opportunities');
  } else {
    recommendations.push('📉 No active projects - Focus on sales and client acquisition');
  }

  if (urgentTasksCount > 10) {
    recommendations.push('⏰ URGENT: 10+ critical tasks - Reallocate resources to address bottlenecks');
  } else if (urgentTasksCount > 5) {
    recommendations.push('⚠️ HIGH: 5-10 urgent tasks - Daily standups to track progress');
  }

  // Inventory & Supply Chain (25% weight)
  if (materialAlerts > 10) {
    recommendations.push('🚨 CRITICAL: 10+ materials low - Emergency procurement needed');
    recommendations.push('📋 Review material usage patterns and adjust reorder levels');
  } else if (materialAlerts > 5) {
    recommendations.push('🔴 HIGH: 5-10 materials low - Batch order to save on shipping');
    recommendations.push('📦 Check with multiple suppliers for better availability');
  } else if (materialAlerts > 2) {
    recommendations.push('🟡 MODERATE: 2-5 materials low - Schedule purchases this week');
    recommendations.push('📝 Update inventory management procedures');
  } else if (materialAlerts > 0) {
    recommendations.push('ℹ️ MINOR: 1-2 materials low - Routine restocking needed');
  }

  // Strategic Recommendations (based on combined factors)
  if (cashFlow > 50000 && workload > 8) {
    recommendations.push('🎯 STRATEGIC: High debt + high workload - Focus on completing paid projects first');
  }

  if (materialAlerts > 5 && cashFlow > 30000) {
    recommendations.push('💸 CASH FLOW: Consider negotiating payment terms with material suppliers');
  }

  if (workload < 3 && cashFlow < 10000) {
    recommendations.push('📈 GROWTH: Healthy position - Ideal time for marketing and new client acquisition');
  }

  // Positive reinforcement for good health
  if (recommendations.length === 0 || 
      (cashFlow < 10000 && workload <= 6 && materialAlerts === 0)) {
    recommendations.push('✅ EXCELLENT: Business operations are healthy and sustainable');
    recommendations.push('🌟 Maintain current processes and focus on growth opportunities');
    recommendations.push('📊 Consider investing in team development or new equipment');
  }

  // Add timestamp and priority context
  if (recommendations.length > 0) {
    recommendations.unshift(`📋 HEALTH CHECK: ${new Date().toLocaleDateString()}`);
    
    // Add priority context
    const criticalCount = recommendations.filter(rec => rec.includes('🚨')).length;
    const highCount = recommendations.filter(rec => rec.includes('🔴')).length;
    
    if (criticalCount > 0) {
      recommendations.unshift('🎯 PRIORITY: Immediate attention required');
    } else if (highCount > 0) {
      recommendations.unshift('🎯 PRIORITY: Address within this week');
    }
  }

  return recommendations.slice(0, 8); // Limit to top 8 most important recommendations
}

// Quotation recommendations helpers
function generateQuotationRecommendations(statusCounts: any, conversionRate: number): string[] {
  const recommendations: string[] = []

  if (statusCounts.sent > 5 && conversionRate < 20) {
    recommendations.push('Low conversion rate: Consider revising your pricing or proposal strategy')
  }

  if (statusCounts.draft > 3) {
    recommendations.push(`You have ${statusCounts.draft} draft quotations - consider finalizing and sending them`)
  }

  if (statusCounts.sent > 0) {
    recommendations.push(`Follow up on ${statusCounts.sent} sent quotations that need client response`)
  }

  if (conversionRate > 50) {
    recommendations.push('Excellent conversion rate! Consider slightly increasing prices')
  }

  return recommendations
}

// Helper function for urgency calculation
function calculateUrgencyScore(daysUntil, paymentPct, priority) {
  let score = 0
  if (daysUntil <= 1) score += 50
  else if (daysUntil <= 3) score += 40
  else if (daysUntil <= 7) score += 30
  else score += 10
  
  if (paymentPct >= 100) score += 30
  else if (paymentPct >= 50) score += 20
  
  if (priority === 'high') score += 20
  
  return score
}

// Helper function for team capability check
function canTeamMemberDoTask(taskName, member, capacity) {
  const taskLower = taskName.toLowerCase()
  
  if (member === 'dhanush') return true // Can do everything
  
  if (member === 'john') {
    const johnTasks = ['clay', 'prep', 'jute', 'grind', 'sandblast', 'finish']
    return johnTasks.some(keyword => taskLower.includes(keyword))
  }
  
  if (member === 'external') {
    const externalTasks = ['paint', 'mould', 'cast', 'lacquer']
    return externalTasks.some(keyword => taskLower.includes(keyword))
  }
  
  return false
}


export const getToolUsageReportTool = tool({
  description: 'Get analytics and usage reports for all AI tools - see which tools are most used, fastest, slowest, and get optimization recommendations',
  inputSchema: z.object({
    reportType: z.enum(['overview', 'performance', 'recommendations', 'all']).optional().default('overview').describe('Type of report to generate'),
    days: z.number().optional().default(30).describe('Number of days to analyze'),
  }),
  execute: async ({ reportType = 'overview', days = 30 }) => {
    const { ToolAnalytics } = await import('@/lib/tool-analytics')
    const { toolCounts } = await import('@/lib/tool-groups')
    
    const stats = await ToolAnalytics.getToolUsageStats(days)
    
    // Sort tools by usage
    const mostUsed = [...stats].sort((a, b) => b.usage_count - a.usage_count).slice(0, 10)
    const leastUsed = [...stats].sort((a, b) => a.usage_count - b.usage_count).slice(0, 10)
    const slowestTools = [...stats].filter(s => s.usage_count > 0).sort((a, b) => b.average_response_time - a.average_response_time).slice(0, 5)
    const errorProneTools = [...stats].filter(s => s.usage_count > 0 && s.error_rate > 5).sort((a, b) => b.error_rate - a.error_rate)

    let report: any = {
      summary: {
        totalToolsTracked: stats.length,
        analysisPeriod: `${days} days`,
        totalToolCalls: stats.reduce((sum, tool) => sum + tool.usage_count, 0),
        coreToolsCount: toolCounts.core,
        advancedToolsCount: toolCounts.advanced
      }
    }

    // Add sections based on report type
    if (reportType === 'overview' || reportType === 'all') {
      report.overview = {
        mostUsedTools: mostUsed.map(tool => ({
          tool: tool.tool_name,
          uses: tool.usage_count,
          averageTime: `${Math.round(tool.average_response_time)}ms`,
          errorRate: `${tool.error_rate.toFixed(1)}%`
        })),
        toolHealth: {
          highUsage: mostUsed.length,
          lowUsage: leastUsed.filter(t => t.usage_count <= 2).length,
          slowTools: slowestTools.length,
          problematicTools: errorProneTools.length
        }
      }
    }

    if (reportType === 'performance' || reportType === 'all') {
      report.performance = {
        slowestTools: slowestTools.map(tool => ({
          tool: tool.tool_name,
          averageTime: `${Math.round(tool.average_response_time)}ms`,
          uses: tool.usage_count
        })),
        errorProneTools: errorProneTools.map(tool => ({
          tool: tool.tool_name,
          errorRate: `${tool.error_rate.toFixed(1)}%`,
          uses: tool.usage_count
        })),
        performanceSummary: {
          averageResponseTime: Math.round(stats.reduce((sum, t) => sum + t.average_response_time, 0) / stats.length),
          totalErrors: stats.reduce((sum, t) => sum + (t.usage_count * t.error_rate / 100), 0)
        }
      }
    }

    if (reportType === 'recommendations' || reportType === 'all') {
      const rarelyUsed = stats.filter(t => t.usage_count <= 2)
      
      report.recommendations = {
        optimizationSuggestions: [
          ...(rarelyUsed.length > 5 ? [`Consider removing or consolidating ${rarelyUsed.length} rarely used tools`] : []),
          ...(slowestTools.length > 0 ? [`Optimize ${slowestTools.length} slow tools for better performance`] : []),
          ...(errorProneTools.length > 0 ? [`Fix ${errorProneTools.length} tools with high error rates`] : []),
          `Core tools (${toolCounts.core}) are working well - keep as is`,
          `Advanced tools (${toolCounts.advanced}) provide specialized functionality`
        ],
        rarelyUsedTools: rarelyUsed.map(t => t.tool_name),
        potentialCoreTools: mostUsed.filter(t => t.usage_count > 20).map(t => t.tool_name)
      }
    }

    return report
  }
})

// =============================================================================
//                              EXPORT ALL TOOLS
// =============================================================================

export const aiTools = {
  // Client Management tool
  createClient: createClientTool,
  listClients: listClientsTool,
  getClient: getClientTool,
  updateClient: updateClientTool,

  // Project Management tool
  createProject: createProjectTool,
  listProjects: listProjectsTool,
  getProject: getProjectTool,
  updateProject: updateProjectTool,
 
  // Task Management tool
  createTask: createTaskTool,
  listTasks: listTasksTool,
  updateTaskStatus: updateTaskStatusTool,
  

  // Material/Inventory Management tool
  addMaterial: addMaterialTool,
  listMaterials: listMaterialsTool,
  updateMaterialStock: updateMaterialStockTool,
  recordMaterialUsage: recordMaterialUsageTool,

  // Work Logging tool
  logWork: logWorkTool,
  getWorkLog: getWorkLogTool,

  // Quotation Management tool
  generateQuotation: generateQuotationTool,
  listQuotations: listQuotationsTool,
  getQuotation: getQuotationTool,
  updateQuotationStatus: updateQuotationStatusTool,
  updateQuotation: updateQuotationTool,
  convertQuotationToInvoice: convertQuotationToInvoiceTool,
  getQuotationStatistics: getQuotationStatisticsTool,

  // Invoice Management tool
  generateInvoice: generateInvoiceTool,
  listInvoices: listInvoicesTool,
  getInvoiceDetails: getInvoiceDetailsTool,
  updateInvoiceStatus: updateInvoiceStatusTool,

  // Payment Management tool
  recordPayment: recordPaymentTool,
  recordRefund: recordRefundTool,
  listPayments: listPaymentsTool,

  // Financial Reporting tool
  getProjectFinancials: getProjectFinancialsTool,
  getFinancialSummary: getFinancialSummaryTool,
  getOverdueInvoices: getOverdueInvoicesTool,

  // Vendor Management tool
  addVendor: addVendorTool,
  listVendors: listVendorsTool,
  recordMaterialPurchase: recordMaterialPurchaseTool,
  listMaterialPurchases: listMaterialPurchasesTool,
  getVendorHistory: getVendorHistoryTool,

  // Time Tracking tool
  startTimeEntry: startTimeEntryTool,
  stopTimeEntry: stopTimeEntryTool,
  listTimeEntries: listTimeEntriesTool,
  getProjectTimeReport: getProjectTimeReportTool,

  // AI Planning & Business Intelligence tool
  getBusinessOverview: getBusinessIntelligenceTool,
  estimateProjectCost: estimateProjectCostTool,
  validateProjectData: validateProjectDataTool,

  // Project Progress & Communication tool
  getProjectProgress: getProjectProgressTool,
  generateClientUpdate: generateClientUpdateTool,
  ProjectProfitabilityTool: calculateProjectProfitabilityTool,

  // Material Management tool
  generateReorderList: generateReorderListTool,

  // Photo Management toool
  addProjectPhoto: addProjectPhotoTool,

  // Context-Aware System Tools
  
  
  clearConstraint: clearConstraintTool,
  
  
  toolUsageReport: getToolUsageReportTool,

  // tax calculation tool
  calculateTax: calculateTaxTool,

  // pdf generation tool
  
  generateQuotationPDF: generateQuotationPDF,
  generateInvoicePDF: generateInvoicePDF,
}
