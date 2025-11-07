// /lib/tool-groups.ts
import { withAnalytics } from './tool-wrapper'

// Import ALL 59 tools from the main ai-tools file
import {
  // Client Management (5 tools)
  createClientTool,
  listClientsTool,
  getClientTool,
  updateClientTool,
  generateClientUpdateTool,
  
  // Project Management (4 tools)
  createProjectTool,
  listProjectsTool,
  getProjectTool,
  updateProjectTool,
  
  // Task Management (3 tools)
  createTaskTool,
  listTasksTool,
  updateTaskStatusTool,
  
  // Material & Inventory (4 tools)
  addMaterialTool,
  listMaterialsTool,
  updateMaterialStockTool,
  recordMaterialUsageTool,
  
  // Work Logging (2 tools)
  logWorkTool,
  getWorkLogTool,
  
  // Quotation Management (7 tools)
  generateQuotationTool,
  listQuotationsTool,
  getQuotationTool,
  updateQuotationStatusTool,
  updateQuotationTool,
  convertQuotationToInvoiceTool,
  getQuotationStatisticsTool,
  
  // Invoice Management (4 tools)
  generateInvoiceTool,
  listInvoicesTool,
  getInvoiceDetailsTool,
  updateInvoiceStatusTool,
  
  // Payment Management (3 tools)
  recordPaymentTool,
  recordRefundTool,
  listPaymentsTool,
  
  // Financial Reporting (3 tools)
  getProjectFinancialsTool,
  getFinancialSummaryTool,
  getOverdueInvoicesTool,
  
  // Vendor Management (5 tools)
  addVendorTool,
  listVendorsTool,
  recordMaterialPurchaseTool,
  listMaterialPurchasesTool,
  getVendorHistoryTool,
  
  // Time Tracking (4 tools)
  startTimeEntryTool,
  stopTimeEntryTool,
  listTimeEntriesTool,
  getProjectTimeReportTool,
  
  // AI Planning & Scheduling (1 tool)
  generateOptimizedDailySchedule,
  
  // Business Intelligence (2 tools)
  getBusinessIntelligenceTool,
  estimateProjectCostTool,
  
  // Project Progress & Communication (2 tools)
  getProjectProgressTool,

  
  // Material Planning (1 tool)
  generateReorderListTool,
  
  // Project Documentation (1 tool)
  addProjectPhotoTool,
  
  // Context-Aware System (5 tools)
   
  clearConstraintTool,
  
  generateInvoicePDF,
  generateQuotationPDF,

  // vendor management tools
  checkVendorAvailability,
  findVendorForTask,

  // Analytics & Monitoring (1 tool)
  getToolUsageReportTool,

  // Additional tools from ai-tools that weren't in original imports
  calculateTaxTool,
  updateClientStateTool,
  setupBusinessTaxTool,
  calculateProjectProfitabilityTool,
  
  validateProjectDataTool
} from './ai-tools'

// Core Tools - Essential daily operations (18 tools)
export const coreTools = {
  // Client Management (3 tools)
  createClient: withAnalytics(createClientTool, 'createClient'),
  listClients: withAnalytics(listClientsTool, 'listClients'),
  getClient: withAnalytics(getClientTool, 'getClient'),
  
  // Project Management (3 tools)
  createProject: withAnalytics(createProjectTool, 'createProject'),
  listProjects: withAnalytics(listProjectsTool, 'listProjects'),
  getProject: withAnalytics(getProjectTool, 'getProject'),
  
  // Task Management (3 tools)
  createTask: withAnalytics(createTaskTool, 'createTask'),
  updateTaskStatus: withAnalytics(updateTaskStatusTool, 'updateTaskStatus'),
  listTasks: withAnalytics(listTasksTool, 'listTasks'),
  
  // Scheduling & Planning (2 tools)
  generateOptimizedDailySchedule: withAnalytics(generateOptimizedDailySchedule, 'generateOptimizedDailySchedule'),
   
  // Financial Operations (2 tools)
  generateInvoice: withAnalytics(generateInvoiceTool, 'generateInvoice'),
  recordPayment: withAnalytics(recordPaymentTool, 'recordPayment'),
  
  // Materials Management (2 tools)
  listMaterials: withAnalytics(listMaterialsTool, 'listMaterials'),
  updateMaterialStock: withAnalytics(updateMaterialStockTool, 'updateMaterialStock'),
  
  // Business Intelligence (2 tools)
  getBusinessOverview: withAnalytics(getBusinessIntelligenceTool, 'getBusinessOverview'),
  
  
  // Work Tracking (1 tool)
  logWork: withAnalytics(logWorkTool, 'logWork')
}

// Advanced Tools - Specialized operations (41 tools)
export const advancedTools = {
  // Client Management (2 tools)
  updateClient: withAnalytics(updateClientTool, 'updateClient'),
  updateClientState: withAnalytics(updateClientStateTool, 'updateClientState'),
  
  // Project Management (2 tools)
  updateProject: withAnalytics(updateProjectTool, 'updateProject'),
  validateProjectData: withAnalytics(validateProjectDataTool, 'validateProjectData'),
  
  // Materials & Inventory (4 tools)
  addMaterial: withAnalytics(addMaterialTool, 'addMaterial'),
  recordMaterialUsage: withAnalytics(recordMaterialUsageTool, 'recordMaterialUsage'),
  generateReorderList: withAnalytics(generateReorderListTool, 'generateReorderList'),
  listMaterialPurchases: withAnalytics(listMaterialPurchasesTool, 'listMaterialPurchases'),
  
  // Work Logging (1 tool)
  getWorkLog: withAnalytics(getWorkLogTool, 'getWorkLog'),
  
  // Quotation Management (7 tools)
  generateQuotation: withAnalytics(generateQuotationTool, 'generateQuotation'),
  listQuotations: withAnalytics(listQuotationsTool, 'listQuotations'),
  getQuotation: withAnalytics(getQuotationTool, 'getQuotation'),
  updateQuotationStatus: withAnalytics(updateQuotationStatusTool, 'updateQuotationStatus'),
  updateQuotation: withAnalytics(updateQuotationTool, 'updateQuotation'),
  convertQuotationToInvoice: withAnalytics(convertQuotationToInvoiceTool, 'convertQuotationToInvoice'),
  getQuotationStatistics: withAnalytics(getQuotationStatisticsTool, 'getQuotationStatistics'),
  
  // Invoice Management (3 tools)
  listInvoices: withAnalytics(listInvoicesTool, 'listInvoices'),
  getInvoiceDetails: withAnalytics(getInvoiceDetailsTool, 'getInvoiceDetails'),
  updateInvoiceStatus: withAnalytics(updateInvoiceStatusTool, 'updateInvoiceStatus'),
  
  // Payment Management (2 tools)
  recordRefund: withAnalytics(recordRefundTool, 'recordRefund'),
  listPayments: withAnalytics(listPaymentsTool, 'listPayments'),
  
  // Financial Reporting (5 tools)
  getProjectFinancials: withAnalytics(getProjectFinancialsTool, 'getProjectFinancials'),
  getFinancialSummary: withAnalytics(getFinancialSummaryTool, 'getFinancialSummary'),
  getOverdueInvoices: withAnalytics(getOverdueInvoicesTool, 'getOverdueInvoices'),
  calculateTax: withAnalytics(calculateTaxTool, 'calculateTax'),
  calculateProjectProfitability: withAnalytics(calculateProjectProfitabilityTool, 'calculateProjectProfitability'),
  
  // Vendor Management (5 tools)
  addVendor: withAnalytics(addVendorTool, 'addVendor'),
  listVendors: withAnalytics(listVendorsTool, 'listVendors'),
  recordMaterialPurchase: withAnalytics(recordMaterialPurchaseTool, 'recordMaterialPurchase'),
  getVendorHistory: withAnalytics(getVendorHistoryTool, 'getVendorHistory'),
  setupBusinessTax: withAnalytics(setupBusinessTaxTool, 'setupBusinessTax'),
  
  // Time Tracking (3 tools)
  startTimeEntry: withAnalytics(startTimeEntryTool, 'startTimeEntry'),
  stopTimeEntry: withAnalytics(stopTimeEntryTool, 'stopTimeEntry'),
  listTimeEntries: withAnalytics(listTimeEntriesTool, 'listTimeEntries'),
  
  // Project Reporting (2 tools)
  getProjectTimeReport: withAnalytics(getProjectTimeReportTool, 'getProjectTimeReport'),
  getProjectProgress: withAnalytics(getProjectProgressTool, 'getProjectProgress'),
  
  // Business Intelligence (2 tools)
  estimateProjectCost: withAnalytics(estimateProjectCostTool, 'estimateProjectCost'),
  generateClientUpdate: withAnalytics(generateClientUpdateTool, 'generateClientUpdate'),
  
  // Project Documentation (1 tool)
  addProjectPhoto: withAnalytics(addProjectPhotoTool, 'addProjectPhoto'),
  
  // Context System (3 tools)
  
  clearConstraint: withAnalytics(clearConstraintTool, 'clearConstraint'),
  

  // Analytics & Monitoring (1 tool)
  getToolUsageReport: withAnalytics(getToolUsageReportTool, 'getToolUsageReport')
}

// Complete set - All 59 tools combined
export const allTools = {
  // Core Tools (18)
  ...coreTools,
  
  // Advanced Tools (41)
  ...advancedTools
}

// Tool counts for monitoring and analytics
export const toolCounts = {
  core: Object.keys(coreTools).length,
  advanced: Object.keys(advancedTools).length,
  total: Object.keys(allTools).length
}

// Tool categories for UI and organization
export const toolCategories = {
  clientManagement: {
    name: 'Client Management',
    tools: ['createClient', 'listClients', 'getClient', 'updateClient', 'updateClientState']
  },
  projectManagement: {
    name: 'Project Management', 
    tools: ['createProject', 'listProjects', 'getProject', 'updateProject', 'validateProjectData']
  },
  taskManagement: {
    name: 'Task Management',
    tools: ['createTask', 'listTasks', 'updateTaskStatus']
  },
  scheduling: {
    name: 'Scheduling & Planning',
    tools: ['generateDailyPlan', 'generateContextAwarePlan', 'getTeamAvailability']
  },
  materials: {
    name: 'Materials & Inventory',
    tools: ['addMaterial', 'listMaterials', 'updateMaterialStock', 'recordMaterialUsage', 'generateReorderList']
  },
  financial: {
    name: 'Financial Operations',
    tools: ['generateInvoice', 'recordPayment', 'recordRefund', 'listPayments', 'calculateTax']
  },
  quotations: {
    name: 'Quotation Management',
    tools: ['generateQuotation', 'listQuotations', 'getQuotation', 'updateQuotationStatus', 'updateQuotation', 'convertQuotationToInvoice', 'getQuotationStatistics']
  },
  reporting: {
    name: 'Reporting & Analytics',
    tools: ['getBusinessOverview', 'getProjectFinancials', 'getFinancialSummary', 'getOverdueInvoices', 'calculateProjectProfitability', 'getProjectProgress', 'getProjectTimeReport', 'getToolUsageReport']
  },
  vendors: {
    name: 'Vendor Management',
    tools: ['addVendor', 'listVendors', 'recordMaterialPurchase', 'listMaterialPurchases', 'getVendorHistory', 'setupBusinessTax']
  },
  timeTracking: {
    name: 'Time Tracking',
    tools: ['startTimeEntry', 'stopTimeEntry', 'listTimeEntries', 'logWork', 'getWorkLog']
  },
  intelligence: {
    name: 'Business Intelligence',
    tools: ['estimateProjectCost', 'generateClientUpdate']
  },
  context: {
    name: 'Context-Aware System',
    tools: ['setContextConstraint', 'getActiveConstraints', 'clearConstraint', 'interpretConstraint']
  },
  documentation: {
    name: 'Project Documentation',
    tools: ['addProjectPhoto']
  }
}

console.log(`🛠️ Tool Groups: ${toolCounts.core} core + ${toolCounts.advanced} advanced = ${toolCounts.total} total tools`)
console.log(`📊 Tool Categories: ${Object.keys(toolCategories).length} categories`)

// Export types for better TypeScript support
export type CoreToolName = keyof typeof coreTools
export type AdvancedToolName = keyof typeof advancedTools  
export type AllToolName = keyof typeof allTools
export type ToolCategory = keyof typeof toolCategories

// Helper function to get tools by category
export function getToolsByCategory(category: ToolCategory): Record<string, any> {
  const toolNames = toolCategories[category].tools
  const tools: Record<string, any> = {}
  
  toolNames.forEach(toolName => {
    if (allTools[toolName as AllToolName]) {
      tools[toolName] = allTools[toolName as AllToolName]
    }
  })
  
  return tools
}

// Helper function to check if a tool exists
export function toolExists(toolName: string): boolean {
  return toolName in allTools
}

// Helper function to get tool by name
export function getTool(toolName: string) {
  return allTools[toolName as AllToolName]
}