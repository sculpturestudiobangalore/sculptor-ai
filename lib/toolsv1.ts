import { tool } from 'ai'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']


// =============================================================================
// CLIENT TOOLS (4)
// =============================================================================

export const createClient = tool({
  description: 'Create a new client in the system',
  inputSchema: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
  }),
  execute: async ({ name, email, phone, company, address, notes }) => {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        address: address || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create client: ${error.message}`)
    
    const client = data as Tables<'clients'>
    
    return { 
      id: client.id,
      name: client.name,
      email: client.email,
      message: `Client "${name}" created successfully`
    }
  },
})

export const listClients = tool({
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

export const getClient = tool({
  description: 'Get a specific client by ID',
  inputSchema: z.object({
    clientId: z.string(),
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

export const updateClient = tool({
  description: 'Update an existing client',
  inputSchema: z.object({
    clientId: z.string(),
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
  }),
  execute: async ({ clientId, ...updates }) => {
    const updateData: any = {}
    if (updates.name) updateData.name = updates.name
    if (updates.email !== undefined) updateData.email = updates.email
    if (updates.phone !== undefined) updateData.phone = updates.phone
    if (updates.company !== undefined) updateData.company = updates.company
    if (updates.address !== undefined) updateData.address = updates.address
    if (updates.notes !== undefined) updateData.notes = updates.notes

    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update client: ${error.message}`)
    
    const client = data as Tables<'clients'>
    
    return { 
      id: client.id,
      name: client.name,
      message: 'Client updated successfully' 
    }
  },
})

// =============================================================================
// PROJECT TOOLS (5)
// =============================================================================

export const createProject = tool({
  description: 'Create a new project for a client',
  inputSchema: z.object({
    clientId: z.string(),
    name: z.string(),
    description: z.string().optional(),
    budgetAmount: z.number().optional(),
    startDate: z.string().optional(),
    deadline: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  }),
  execute: async ({
    clientId,
    name,
    description,
    budgetAmount,
    startDate,
    deadline,
    priority,
  }) => {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        client_id: clientId,
        name,
        description: description || null,
        budget_amount: budgetAmount || null,
        start_date: startDate || null,
        deadline: deadline || null,
        priority: priority || 'medium',
        status: 'planning',
      })
      .select('*, clients(name)')
      .single()

    if (error) throw new Error(`Failed to create project: ${error.message}`)
    
    return {
      id: data.id,
      name: data.name,
      status: data.status,
      client_name: data.clients?.name || null,
      message: `Project "${name}" created successfully`
    }
  },
})

export const listProjects = tool({
  description: 'List all projects, optionally filtered by status or client',
  inputSchema: z.object({
    status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
    clientId: z.string().optional(),
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

export const getProject = tool({
  description: 'Get a specific project by ID with full details',
  inputSchema: z.object({
    projectId: z.string(),
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

export const updateProjectStatus = tool({
  description: 'Update a project status',
  inputSchema: z.object({
    projectId: z.string(),
    status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
  }),
  execute: async ({ projectId, status }) => {
    const { data, error } = await supabase
      .from('projects')
      .update({ status })
      .eq('id', projectId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update project status: ${error.message}`)
    
    const project = data as Tables<'projects'>
    
    return { 
      id: project.id,
      name: project.name,
      status: project.status,
      message: `Project status updated to "${status}"` 
    }
  },
})

export const updateProject = tool({
  description: 'Update project details',
  inputSchema: z.object({
    projectId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    budgetAmount: z.number().optional(),
    actualCost: z.number().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    deadline: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  }),
  execute: async ({ projectId, ...updates }) => {
    const updateData: any = {}
    if (updates.name) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.budgetAmount !== undefined) updateData.budget_amount = updates.budgetAmount
    if (updates.actualCost !== undefined) updateData.actual_cost = updates.actualCost
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate
    if (updates.deadline !== undefined) updateData.deadline = updates.deadline
    if (updates.priority) updateData.priority = updates.priority

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update project: ${error.message}`)
    
    const project = data as Tables<'projects'>
    
    return { 
      id: project.id,
      name: project.name,
      message: 'Project updated successfully' 
    }
  },
})

// =============================================================================
// TASK TOOLS (3)
// =============================================================================

export const createTask = tool({
  description: 'Create a new task for a project',
  inputSchema: z.object({
    projectId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    estimatedHours: z.number().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    dueDate: z.string().optional(),
    dependsOn: z.string().optional(),
  }),
  execute: async ({
    projectId,
    title,
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
        title,
        description: description || null,
        estimated_hours: estimatedHours || null,
        priority: priority || 'medium',
        due_date: dueDate || null,
        depends_on: dependsOn || null,
        status: 'pending',
      })
      .select('*, projects(name)')
      .single()

    if (error) throw new Error(`Failed to create task: ${error.message}`)
    
    return {
      id: data.id,
      title: data.title,
      status: data.status,
      project_name: data.projects?.name || null,
      message: `Task "${title}" created successfully`
    }
  },
})

export const listTasks = tool({
  description: 'List tasks, optionally filtered by project, status, or date',
  inputSchema: z.object({
    projectId: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'blocked']).optional(),
    dueToday: z.boolean().optional(),
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

export const updateTaskStatus = tool({
  description: 'Update task status (e.g., mark as completed)',
  inputSchema: z.object({
    taskId: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed', 'blocked']),
    actualHours: z.number().optional(),
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
    
    const task = data as Tables<'tasks'>
    
    return { 
      id: task.id,
      title: task.title,
      status: task.status,
      message: `Task status updated to "${status}"` 
    }
  },
})

// =============================================================================
// MATERIAL TOOLS (4)
// =============================================================================

export const addMaterial = tool({
  description: 'Add a new material to inventory',
  inputSchema: z.object({
    name: z.string(),
    category: z.string().optional(),
    unit: z.string(),
    quantityAvailable: z.number(),
    unitCost: z.number().optional(),
    reorderLevel: z.number().optional(),
    supplier: z.string().optional(),
    notes: z.string().optional(),
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
        category: category || null,
        unit,
        quantity_available: quantityAvailable,
        unit_cost: unitCost || null,
        reorder_level: reorderLevel || 0,
        supplier: supplier || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to add material: ${error.message}`)
    
    const material = data as Tables<'materials'>
    
    return {
      id: material.id,
      name: material.name,
      quantity_available: material.quantity_available,
      unit: material.unit,
      message: `Material "${name}" added to inventory`
    }
  },
})

export const listMaterials = tool({
  description: 'List all materials, optionally showing only low stock items',
  inputSchema: z.object({
    lowStock: z.boolean().optional(),
    category: z.string().optional(),
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

export const updateMaterialStock = tool({
  description: 'Update material stock quantity (add or reduce)',
  inputSchema: z.object({
    materialId: z.string(),
    quantityChange: z.number(),
    notes: z.string().optional(),
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

    const updates: any = { quantity_available: newQuantity }
    if (notes) updates.notes = notes

    const { data, error } = await supabase
      .from('materials')
      .update(updates)
      .eq('id', materialId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update stock: ${error.message}`)
    
    const updated = data as Tables<'materials'>
    
    return {
      id: updated.id,
      name: updated.name,
      quantity_available: updated.quantity_available,
      unit: updated.unit,
      message: `${material.name} stock updated: ${material.quantity_available} → ${newQuantity} ${updated.unit}`
    }
  },
})

export const recordMaterialUsage = tool({
  description: 'Record material usage for a project',
  inputSchema: z.object({
    projectId: z.string(),
    materialId: z.string(),
    quantityUsed: z.number(),
    notes: z.string().optional(),
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
        notes: notes || null,
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

    const usageData = usage as Tables<'material_usage'>

    return {
      id: usageData.id,
      material_name: material.name,
      quantity_used: quantityUsed,
      new_stock: newQuantity,
      unit: material.unit,
      message: `Recorded ${quantityUsed} ${material.unit} of ${material.name} used. New stock: ${newQuantity} ${material.unit}`
    }
  },
})

// =============================================================================
// WORK LOG TOOLS (2)
// =============================================================================

export const logWork = tool({
  description: 'Log work hours for a project or task',
  inputSchema: z.object({
    projectId: z.string(),
    taskId: z.string().optional(),
    hoursWorked: z.number(),
    workDescription: z.string().optional(),
    date: z.string().optional(),
  }),
  execute: async ({ projectId, taskId, hoursWorked, workDescription, date }) => {
    const { data, error } = await supabase
      .from('work_log')
      .insert({
        project_id: projectId,
        task_id: taskId || null,
        hours_worked: hoursWorked,
        work_description: workDescription || null,
        date: date || new Date().toISOString().split('T')[0],
      })
      .select('*, projects(name), tasks(title)')
      .single()

    if (error) throw new Error(`Failed to log work: ${error.message}`)
    
    return {
      id: data.id,
      hours_worked: data.hours_worked,
      date: data.date,
      project_name: data.projects?.name || null,
      task_title: data.tasks?.title || null,
      message: `Logged ${hoursWorked} hours of work`
    }
  },
})

export const getWorkLog = tool({
  description: 'Get work log entries, filtered by project, date range, or task',
  inputSchema: z.object({
    projectId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
  execute: async ({ projectId, startDate, endDate }) => {
    let query = supabase
      .from('work_log')
      .select('*, projects(name), tasks(title)')
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

// =============================================================================
// BUSINESS TOOLS (2)
// =============================================================================

export const generateQuotation = tool({
  description: 'Generate a cost quotation for a project',
  inputSchema: z.object({
    projectId: z.string(),
    laborHours: z.number(),
    laborRate: z.number(),
    materialCosts: z
      .array(
        z.object({
          name: z.string(),
          quantity: z.number(),
          unitCost: z.number(),
        })
      )
      .optional(),
    additionalCosts: z.number().optional(),
    profitMargin: z.number().optional(),
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
      clientName: project.clients?.name || null,
      clientCompany: project.clients?.company || null,
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

export const generateDailyPlan = tool({
  description: 'Generate an optimized daily work plan based on active tasks and priorities',
  inputSchema: z.object({
    date: z.string().optional(),
    availableHours: z.number().optional(),
  }),
  execute: async ({ date, availableHours }) => {
    const targetDate = date || new Date().toISOString().split('T')[0]
    const hours = availableHours || 8

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*, projects(name, status)')
      .in('status', ['pending', 'in_progress'])
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) throw new Error(`Failed to fetch tasks: ${error.message}`)

    const priorityScores: { [key: string]: number } = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    }

    const scoredTasks = tasks.map((task) => {
      let score = priorityScores[task.priority] || 1

      if (task.due_date) {
        const daysUntilDue =
          (new Date(task.due_date).getTime() - new Date(targetDate).getTime()) /
          (1000 * 60 * 60 * 24)
        if (daysUntilDue <= 1) score += 5
        else if (daysUntilDue <= 3) score += 3
        else if (daysUntilDue <= 7) score += 1
      }

      if (task.status === 'in_progress') score += 2

      return { ...task, score }
    })

    scoredTasks.sort((a, b) => b.score - a.score)

    let remainingHours = hours
    const plannedTasks = []

    for (const task of scoredTasks) {
      if (remainingHours <= 0) break

      const taskHours = Math.min(task.estimated_hours || 2, remainingHours)
      plannedTasks.push({
        taskId: task.id,
        title: task.title,
        project: task.projects?.name || null,
        priority: task.priority,
        allocatedHours: taskHours,
        dueDate: task.due_date,
      })

      remainingHours -= taskHours
    }

    return {
      date: targetDate,
      totalHours: hours,
      allocatedHours: hours - remainingHours,
      unallocatedHours: remainingHours,
      tasks: plannedTasks,
      taskCount: plannedTasks.length,
    }
  },
})

// =============================================================================
// EXPORT ALL TOOLS
// =============================================================================

export const aiTools = {
  createClient,
  listClients,
  getClient,
  updateClient,
  createProject,
  listProjects,
  getProject,
  updateProject,
  updateProjectStatus,
  createTask,
  listTasks,
  updateTaskStatus,
  addMaterial,
  listMaterials,
  updateMaterialStock,
  recordMaterialUsage,
  logWork,
  getWorkLog,
  generateQuotation,
  generateDailyPlan,
}
