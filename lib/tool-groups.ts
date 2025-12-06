// /lib/tool-groups.ts
import { withAnalytics } from "./tool-wrapper";

// Import ALL 59 tools from the main ai-tools file
import {
  // Client Management (5 tools)
  createClientTool,
  listClientsTool,
  getClientTool,
  updateClientTool,
  generateClientUpdateTool,

  // Project Management (5 tools)
  createProjectTool,
  listProjectsTool,
  getProjectTool,
  updateProjectTool,
  showCreateProjectFormTool,

  // Task Management (3 tools)
  createTaskTool,
  listTasksTool,
  updateTaskStatusTool,
  updateTaskTool,

  // Material & Inventory (4 tools)
  addMaterialTool,
  listMaterialsTool,
  updateMaterialStockTool,
  recordMaterialUsageTool,
  updateMaterialTool,

  // Work Logging (2 tools) - COMMENTED OUT: tools don't exist
  // logWorkTool,
  // getWorkLogTool,

  // Quotation Management (7 tools)
  generateQuotationTool,
  listQuotationsTool,
  // getQuotationTool, // COMMENTED OUT: tool doesn't exist
  updateQuotationStatusTool,
  updateQuotationTool,
  convertQuotationToInvoiceTool,
  showQuotationFormTool,
  // getQuotationStatisticsTool, // COMMENTED OUT: tool doesn't exist

  // Invoice Management (4 tools)
  generateInvoiceTool,
  listInvoicesTool,
  // getInvoiceDetailsTool, // COMMENTED OUT: tool doesn't exist
  updateInvoiceStatusTool,

  // Payment Management (3 tools)
  recordPaymentTool,
  // recordRefundTool, // COMMENTED OUT: tool doesn't exist
  // listPaymentsTool, // COMMENTED OUT: tool doesn't exist

  // Financial Reporting & Dashboard (1 tool)
  getFinancialDashboardTool,
  // getProjectFinancialsTool, // COMMENTED OUT: tool doesn't exist
  // getFinancialSummaryTool, // COMMENTED OUT: tool doesn't exist
  // getOverdueInvoicesTool, // COMMENTED OUT: tool doesn't exist

  // Vendor Management (5 tools)
  addVendorTool,
  listVendorsTool,
  recordMaterialPurchaseTool,
  listMaterialPurchasesTool,
  getVendorHistoryTool,
  updateVendorTool,

  // Time Tracking (4 tools)
  startTimeEntryTool,
  stopTimeEntryTool,
  // listTimeEntriesTool, // COMMENTED OUT: tool doesn't exist
  // getProjectTimeReportTool, // COMMENTED OUT: tool doesn't exist

  // AI Planning & Scheduling (1 tool) - COMMENTED OUT: tool doesn't exist
  // generateOptimizedDailySchedule,

  // Business Intelligence (2 tools)
  // getBusinessIntelligenceTool, // COMMENTED OUT: tool doesn't exist
  estimateProjectCostTool,

  // Project Progress & Communication (2 tools)
  getProjectProgressTool,

  // Material Planning (1 tool)
  generateReorderListTool,

  // Project Documentation (1 tool)
  addProjectPhotoTool,

  // Context-Aware System (5 tools) - COMMENTED OUT: tools don't exist
  // clearConstraintTool,
  // generateInvoicePDF,
  // generateQuotationPDF,

  // vendor management tools - COMMENTED OUT: tools don't exist
  // checkVendorAvailability,
  // findVendorForTask,
  // assignVendorToTask,

  // client state management - COMMENTED OUT: tools don't exist
  //updateClientStateTool,

  // advanced project tools - COMMENTED OUT: tools don't exist
  // getProjectDetailsTool,
  // calculateProjectProfitabilityTool,

  // advanced invoice tools - COMMENTED OUT: tools don't exist
  // updateInvoiceTool,
  // getToolUsageReportTool,
  // calculateTaxTool,
  // setupBusinessTaxTool,
  // validateProjectDataTool,
} from "./ai-tools";

// Import company settings tools
import {
  showCompanySettingsFormTool,
  updateCompanySettingsTool,
} from "./ai-tools/finance/company-settings-tools";

// Import schedule tools
import {
  generateDailyScheduleTool,
  invalidateScheduleCacheTool,
  identifyBottlenecksTool,
  optimizeTaskOrderTool,
  getRecommendationsTool,
  analyzeProjectHealthTool,
} from "./ai-tools/scheduling-tools";

// Import context memory tools
import {
  saveContextMemoryTool,
  retrieveContextMemoryTool,
  searchContextMemoryTool,
} from "./ai-tools/context-memory-tools";

// Core Tools - Essential daily operations
export const coreTools = {
  // Client Management (3 tools)
  createClientTool: withAnalytics(createClientTool, "createClientTool"),
  listClientsTool: withAnalytics(listClientsTool, "listClientsTool"),
  getClientTool: withAnalytics(getClientTool, "getClientTool"),

  // Project Management (4 tools)
  createProjectTool: withAnalytics(createProjectTool, "createProjectTool"),
  listProjectsTool: withAnalytics(listProjectsTool, "listProjectsTool"),
  getProjectTool: withAnalytics(getProjectTool, "getProjectTool"),
  showCreateProjectFormTool: withAnalytics(
    showCreateProjectFormTool,
    "showCreateProjectFormTool"
  ),

  // Task Management (3 tools)
  createTaskTool: withAnalytics(createTaskTool, "createTaskTool"),
  updateTaskStatusTool: withAnalytics(
    updateTaskStatusTool,
    "updateTaskStatusTool"
  ),
  listTasksTool: withAnalytics(listTasksTool, "listTasksTool"),
  updateTaskTool: withAnalytics(updateTaskTool, "updateTaskTool"),

  // Scheduling & Planning (2 tools)
  // generateOptimizedDailySchedule: withAnalytics(
  //   generateOptimizedDailySchedule,
  //   "generateOptimizedDailySchedule"
  // ),

  // Financial Operations (3 tools)
  generateInvoiceTool: withAnalytics(
    generateInvoiceTool,
    "generateInvoiceTool"
  ),
  recordPaymentTool: withAnalytics(recordPaymentTool, "recordPaymentTool"),
  getFinancialDashboardTool: withAnalytics(
    getFinancialDashboardTool,
    "getFinancialDashboardTool"
  ),

  // Materials Management (2 tools)
  listMaterialsTool: withAnalytics(listMaterialsTool, "listMaterialsTool"),
  updateMaterialStockTool: withAnalytics(
    updateMaterialStockTool,
    "updateMaterialStockTool"
  ),

  // Business Intelligence (2 tools)
  // getBusinessOverview: withAnalytics(
  //   getBusinessIntelligenceTool,
  //   "getBusinessOverview"
  // ),

  // Work Tracking (1 tool)
  // logWork: withAnalytics(logWorkTool, "logWork"),
};

// Advanced Tools - Specialized operations (41 tools)
export const advancedTools = {
  // Company Settings
  showCompanySettingsFormTool: withAnalytics(
    showCompanySettingsFormTool,
    "showCompanySettingsFormTool"
  ),
  updateCompanySettingsTool: withAnalytics(
    updateCompanySettingsTool,
    "updateCompanySettingsTool"
  ),

  // Client Management (2 tools)
  updateClientTool: withAnalytics(updateClientTool, "updateClientTool"),
  // updateClientState: withAnalytics(updateClientStateTool, "updateClientState"),

  // Project Management (2 tools)
  updateProjectTool: withAnalytics(updateProjectTool, "updateProjectTool"),
  // validateProjectData: withAnalytics(
  //   validateProjectDataTool,
  //   "validateProjectData"
  // ),

  // Materials & Inventory (4 tools)
  addMaterialTool: withAnalytics(addMaterialTool, "addMaterialTool"),
  recordMaterialUsageTool: withAnalytics(
    recordMaterialUsageTool,
    "recordMaterialUsageTool"
  ),
  updateMaterialTool: withAnalytics(updateMaterialTool, "updateMaterialTool"),
  generateReorderListTool: withAnalytics(
    generateReorderListTool,
    "generateReorderListTool"
  ),
  listMaterialPurchasesTool: withAnalytics(
    listMaterialPurchasesTool,
    "listMaterialPurchasesTool"
  ),

  // Work Logging (1 tool)
  // getWorkLog: withAnalytics(getWorkLogTool, "getWorkLog"),

  // Quotation Management (7 tools)
  generateQuotationTool: withAnalytics(
    generateQuotationTool,
    "generateQuotationTool"
  ),
  listQuotationsTool: withAnalytics(listQuotationsTool, "listQuotationsTool"),
  // getQuotation: withAnalytics(getQuotationTool, "getQuotation"),
  updateQuotationStatusTool: withAnalytics(
    updateQuotationStatusTool,
    "updateQuotationStatusTool"
  ),
  updateQuotationTool: withAnalytics(
    updateQuotationTool,
    "updateQuotationTool"
  ),
  convertQuotationToInvoiceTool: withAnalytics(
    convertQuotationToInvoiceTool,
    "convertQuotationToInvoiceTool"
  ),
  // getQuotationStatistics: withAnalytics(
  //   getQuotationStatisticsTool,
  //   "getQuotationStatistics"
  // ),
  showQuotationFormTool: withAnalytics(
    showQuotationFormTool,
    "showQuotationFormTool"
  ),

  // Invoice Management (3 tools)
  listInvoicesTool: withAnalytics(listInvoicesTool, "listInvoicesTool"),
  // getInvoiceDetails: withAnalytics(getInvoiceDetailsTool, "getInvoiceDetails"),
  updateInvoiceStatusTool: withAnalytics(
    updateInvoiceStatusTool,
    "updateInvoiceStatusTool"
  ),

  // Payment Management (2 tools)
  // recordRefund: withAnalytics(recordRefundTool, "recordRefund"),
  // listPayments: withAnalytics(listPaymentsTool, "listPayments"),

  // Financial Reporting (5 tools)
  // getProjectFinancials: withAnalytics(
  //   getProjectFinancialsTool,
  //   "getProjectFinancials"
  // ),
  // getFinancialSummary: withAnalytics(
  //   getFinancialSummaryTool,
  //   "getFinancialSummary"
  // ),
  // getOverdueInvoices: withAnalytics(
  //   getOverdueInvoicesTool,
  //   "getOverdueInvoices"
  // ),
  // calculateTax: withAnalytics(calculateTaxTool, "calculateTax"),
  // calculateProjectProfitability: withAnalytics(
  //   calculateProjectProfitabilityTool,
  //   "calculateProjectProfitability"
  // ),

  // Vendor Management (5 tools)
  addVendorTool: withAnalytics(addVendorTool, "addVendorTool"),
  listVendorsTool: withAnalytics(listVendorsTool, "listVendorsTool"),
  recordMaterialPurchaseTool: withAnalytics(
    recordMaterialPurchaseTool,
    "recordMaterialPurchaseTool"
  ),
  getVendorHistoryTool: withAnalytics(
    getVendorHistoryTool,
    "getVendorHistoryTool"
  ),
  updateVendorTool: withAnalytics(updateVendorTool, "updateVendorTool"),
  // setupBusinessTax: withAnalytics(setupBusinessTaxTool, "setupBusinessTax"),

  // Time Tracking (3 tools)
  startTimeEntryTool: withAnalytics(startTimeEntryTool, "startTimeEntryTool"),
  stopTimeEntryTool: withAnalytics(stopTimeEntryTool, "stopTimeEntryTool"),
  // listTimeEntries: withAnalytics(listTimeEntriesTool, "listTimeEntries"),

  // Project Reporting (2 tools)
  // getProjectTimeReport: withAnalytics(
  //   getProjectTimeReportTool,
  //   "getProjectTimeReport"
  // ),
  getProjectProgressTool: withAnalytics(
    getProjectProgressTool,
    "getProjectProgressTool"
  ),

  // Business Intelligence (2 tools)
  estimateProjectCostTool: withAnalytics(
    estimateProjectCostTool,
    "estimateProjectCostTool"
  ),
  generateClientUpdateTool: withAnalytics(
    generateClientUpdateTool,
    "generateClientUpdateTool"
  ),

  // Project Documentation (1 tool)
  addProjectPhotoTool: withAnalytics(
    addProjectPhotoTool,
    "addProjectPhotoTool"
  ),

  // Schedule & Planning Tools (6 tools)
  generateDailyScheduleTool: withAnalytics(
    generateDailyScheduleTool,
    "generateDailyScheduleTool"
  ),
  invalidateScheduleCacheTool: withAnalytics(
    invalidateScheduleCacheTool,
    "invalidateScheduleCacheTool"
  ),
  identifyBottlenecksTool: withAnalytics(
    identifyBottlenecksTool,
    "identifyBottlenecksTool"
  ),
  optimizeTaskOrderTool: withAnalytics(
    optimizeTaskOrderTool,
    "optimizeTaskOrderTool"
  ),
  getRecommendationsTool: withAnalytics(
    getRecommendationsTool,
    "getRecommendationsTool"
  ),
  analyzeProjectHealthTool: withAnalytics(
    analyzeProjectHealthTool,
    "analyzeProjectHealthTool"
  ),

  // Context Memory Tools (3 tools)
  saveContextMemoryTool: withAnalytics(
    saveContextMemoryTool,
    "saveContextMemoryTool"
  ),
  retrieveContextMemoryTool: withAnalytics(
    retrieveContextMemoryTool,
    "retrieveContextMemoryTool"
  ),
  searchContextMemoryTool: withAnalytics(
    searchContextMemoryTool,
    "searchContextMemoryTool"
  ),

  // Context System (3 tools)

  // clearConstraint: withAnalytics(clearConstraintTool, "clearConstraint"),

  // Analytics & Monitoring (1 tool)
  // getToolUsageReport: withAnalytics(
  //   getToolUsageReportTool,
  //   "getToolUsageReport"
  // ),
};

// Complete set - All 59 tools combined
export const allTools = {
  // Core Tools (18)
  ...coreTools,

  // Advanced Tools (41)
  ...advancedTools,
};

// Tool counts for monitoring and analytics
export const toolCounts = {
  core: Object.keys(coreTools).length,
  advanced: Object.keys(advancedTools).length,
  total: Object.keys(allTools).length,
};

// Tool categories for UI and organization
export const toolCategories = {
  clientManagement: {
    name: "Client Management",
    tools: [
      "createClientTool",
      "listClientsTool",
      "getClientTool",
      "updateClientTool",
      "updateClientStateTool",
    ],
  },
  projectManagement: {
    name: "Project Management",
    tools: [
      "createProjectTool",
      "listProjectsTool",
      "getProjectTool",
      "updateProjectTool",
      "validateProjectDataTool",
    ],
  },
  taskManagement: {
    name: "Task Management",
    tools: [
      "createTaskTool",
      "listTasksTool",
      "updateTaskStatusTool",
      "updateTaskTool",
    ],
  },
  scheduling: {
    name: "Scheduling & Planning",
    tools: [
      "generateDailyPlanTool",
      "generateContextAwarePlanTool",
      "getTeamAvailabilityTool",
    ],
  },
  materials: {
    name: "Materials & Inventory",
    tools: [
      "addMaterialTool",
      "listMaterialsTool",
      "updateMaterialStockTool",
      "recordMaterialUsageTool",
      "generateReorderListTool",
      "updateMaterialTool",
    ],
  },
  financial: {
    name: "Financial Operations",
    tools: [
      "generateInvoiceTool",
      "recordPaymentTool",
      "recordRefundTool",
      "listPaymentsTool",
      "calculateTaxTool",
    ],
  },
  quotations: {
    name: "Quotation Management",
    tools: [
      "generateQuotationTool",
      "listQuotationsTool",
      "getQuotationTool",
      "updateQuotationStatusTool",
      "updateQuotationTool",
      "convertQuotationToInvoiceTool",
      "showQuotationFormTool",
      "getQuotationStatisticsTool",
    ],
  },
  reporting: {
    name: "Reporting & Analytics",
    tools: [
      "getBusinessOverviewTool",
      "getProjectFinancialsTool",
      "getFinancialSummaryTool",
      "getOverdueInvoicesTool",
      "calculateProjectProfitabilityTool",
      "getProjectProgressTool",
      "getProjectTimeReportTool",
      "getToolUsageReportTool",
    ],
  },
  vendors: {
    name: "Vendor Management",
    tools: [
      "addVendorTool",
      "listVendorsTool",
      "recordMaterialPurchaseTool",
      "listMaterialPurchasesTool",
      "getVendorHistoryTool",
      "setupBusinessTaxTool",
      "updateVendorTool",
    ],
  },
  timeTracking: {
    name: "Time Tracking",
    tools: [
      "startTimeEntryTool",
      "stopTimeEntryTool",
      "listTimeEntriesTool",
      "logWorkTool",
      "getWorkLogTool",
    ],
  },
  intelligence: {
    name: "Business Intelligence",
    tools: ["estimateProjectCostTool", "generateClientUpdateTool"],
  },
  context: {
    name: "Context-Aware System",
    tools: [
      "setContextConstraintTool",
      "getActiveConstraintsTool",
      "clearConstraintTool",
      "interpretConstraintTool",
    ],
  },
  documentation: {
    name: "Project Documentation",
    tools: ["addProjectPhotoTool"],
  },
  companySettings: {
    name: "Company Settings",
    tools: ["showCompanySettingsFormTool", "updateCompanySettingsTool"],
  },
};

console.log(
  `🛠️ Tool Groups: ${toolCounts.core} core + ${toolCounts.advanced} advanced = ${toolCounts.total} total tools`
);
console.log(
  `📊 Tool Categories: ${Object.keys(toolCategories).length} categories`
);

// Export types for better TypeScript support
export type CoreToolName = keyof typeof coreTools;
export type AdvancedToolName = keyof typeof advancedTools;
export type AllToolName = keyof typeof allTools;
export type ToolCategory = keyof typeof toolCategories;

// Helper function to get tools by category
export function getToolsByCategory(
  category: ToolCategory
): Record<string, any> {
  const toolNames = toolCategories[category].tools;
  const tools: Record<string, any> = {};

  toolNames.forEach((toolName) => {
    if (allTools[toolName as AllToolName]) {
      tools[toolName] = allTools[toolName as AllToolName];
    }
  });

  return tools;
}

// Helper function to check if a tool exists
export function toolExists(toolName: string): boolean {
  return toolName in allTools;
}

// Helper function to get tool by name
export function getTool(toolName: string) {
  return allTools[toolName as AllToolName];
}
