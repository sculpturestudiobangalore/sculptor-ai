import type { Database } from './database.types'

// Extract base table types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']


// Custom relationship types for joined queries
export type ProjectWithRelations = Tables<'projects'> & {
  clients: Pick<Tables<'clients'>, 'id' | 'name' | 'email' | 'phone' | 'company'>
  tasks: Tables<'tasks'>[]
  project_materials: (Tables<'project_materials'> & {
    materials: Pick<Tables<'materials'>, 'id' | 'name' | 'quantity_available' | 'unit' | 'reorder_level'>
  })[]
}

export type TaskWithRelations = Tables<'tasks'> & {
  projects: Tables<'projects'> & {
    clients: Pick<Tables<'clients'>, 'id' | 'name' | 'email' | 'phone' | 'company'>
  }
}

export type InvoiceWithRelations = Tables<'invoices_enhanced'> & {
  clients: Pick<Tables<'clients'>, 'id' | 'name' | 'email' | 'phone'>
  projects: Pick<Tables<'projects'>, 'id' | 'name'> | null
  invoice_items: Tables<'invoice_items'>[]
}

// Business configuration types
export interface SculptureBusinessConfig {
  team: {
    dhanush: { dailyHours: number; skills: string[] }
    john: { dailyHours: number; skills: string[] }
  }
  defaultRates: {
    labor: number
    tax: number
  }
  materialCategories: string[]
}

export interface ProjectAnalysis {
  projectId: string
  projectName: string
  clientName: string
  deadline?: string
  daysUntilDeadline: number
  paymentProgress: number
  materialStatus: { available: boolean; missing: string[] }
  taskProgress: number
  priorityScore: number
  urgency: 'critical' | 'high' | 'medium' | 'low'
}

export interface DailyTask {
  taskId: string
  name: string
  project: string
  client: string
  estimatedHours: number
  timeSlot: 'morning' | 'afternoon' | 'ongoing'
  priority: string
  assignedTo: 'dhanush' | 'john'
  materialCheck: 'ready' | 'blocked'
}

export interface ScoredTask {
  taskId: string
  taskName: string
  projectId: string
  projectName: string
  clientName: string
  estimatedMinutes: number
  assignedTo: string
  score: number
  deadline?: string
  materialStatus: boolean
  urgency: string
}

export interface Recommendation {
  type: string
  priority: string
  message: string
  action: string
}

// Type guards for error handling
export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  )
}

export function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) return error.message
  return 'An unknown error occurred'
}