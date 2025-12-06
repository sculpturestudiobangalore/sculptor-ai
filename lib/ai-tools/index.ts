/**
 * AI TOOLS MASTER INDEX
 * Aggregates all tool categories and exports them as a single ToolSet.
 */

// Import individual tools from the category file
import {
  createClientTool,
  updateClientTool,
  listClientsTool,
  getClientTool,
  validateClientDataTool,
  generateClientUpdateTool,
  updateClientStateTool,
  createProjectTool,
  updateProjectTool,
  listProjectsTool,
  getProjectDetailsTool,
  addProjectMaterialTool,
  updateTaskProgressTool,
  getProjectTool,
  getProjectProgressTool,
  estimateProjectCostTool,
  addProjectPhotoTool,
  calculateProjectProfitabilityTool,
  startTimeEntryTool,
  stopTimeEntryTool,
  createProjectFromQuotationTool,
  createPrototypeProjectTool,
  showCreateProjectFormTool,
} from "./client-project-tools";

import {
  listProjectTasksTool,
  updateTaskStatusTool,
  assignTaskTool,
  getTaskDetailsTool,
  createTaskTool,
  updateTasksUpToTool,
  assignTasksToDefaultsTool,
  updateTaskTool,
} from "./task-tools";

import {
  addMaterialTool,
  listMaterialsTool,
  updateMaterialStockTool,
  recordMaterialUsageTool,
  generateReorderListTool,
  recordMaterialPurchaseTool,
  listMaterialPurchasesTool,
  updateMaterialTool,
  addVendorTool,
  listVendorsTool,
  getVendorHistoryTool,
  updateVendorTool,
} from "./material-tools";

import {
  generateQuotationTool,
  addQuotationItemTool,
  updateQuotationStatusTool,
  updateQuotationTool,
  listQuotationsTool,
  showQuotationFormTool,
  showSplitQuotationTool,
  splitQuotationTool,
  showCombineQuotationTool,
  combineQuotationTool,
} from "./finance/quotation-tools";

import {
  generateInvoiceTool,
  convertQuotationToInvoiceTool,
  updateInvoiceStatusTool,
  listInvoicesTool,
  showInvoiceEditFormTool,
  showSplitInvoiceTool,
  splitInvoiceTool,
  showCombineInvoiceTool,
  combineInvoiceTool,
} from "./finance/invoice-tools";

import { generateReportTool, showReportGeneratorTool } from "./reporting-tools";
import { getFinancialDashboardTool } from "./financial-dashboard-tool";

import {
  recordPaymentTool,
  getOutstandingPaymentsTool,
} from "./finance/payment-tools";

import {
  getPaymentHistoryTool,
  generatePaymentReminderTool,
  generateCreditNoteTool,
  generateDebitNoteTool,
} from "./finance/payment-history-and-reminders";

import {
  generatePaymentReceiptTool,
  cancelInvoiceTool,
} from "./finance/misc-tools";

import { universalSearchTool } from "./universal_search_tool";
import { customActionTool } from "./custom-action-tool";

import {
  generateDailyScheduleTool,
  invalidateScheduleCacheTool,
  identifyBottlenecksTool,
  optimizeTaskOrderTool,
  getRecommendationsTool,
  analyzeProjectHealthTool,
} from "@/lib/ai-tools/scheduling-tools";

import {
  saveContextMemoryTool,
  retrieveContextMemoryTool,
  searchContextMemoryTool,
} from "./context-memory-tools";

/**
 * Master tools registry - exactly matches your original style
 */
export const aiTools = {
  //client tools
  createClientTool,
  updateClientTool,
  listClientsTool,
  getClientTool,
  validateClientDataTool,
  generateClientUpdateTool,
  updateClientStateTool,

  //project tools
  createProjectTool,
  updateProjectTool,
  listProjectsTool,
  getProjectDetailsTool,
  addProjectMaterialTool,
  updateTaskProgressTool,
  getProjectTool,
  getProjectProgressTool,
  estimateProjectCostTool,
  addProjectPhotoTool,
  calculateProjectProfitabilityTool,
  createProjectFromQuotationTool,
  createPrototypeProjectTool,
  showCreateProjectFormTool,

  //task tools
  listProjectTasksTool,
  updateTaskStatusTool,
  assignTaskTool,
  createTaskTool,
  getTaskDetailsTool,
  updateTasksUpToTool,
  assignTasksToDefaultsTool,
  updateTaskTool,

  //time tools
  stopTimeEntryTool,
  startTimeEntryTool,

  //context memory tools
  saveContextMemoryTool,
  retrieveContextMemoryTool,
  searchContextMemoryTool,

  //material and inventory tools
  addMaterialTool,
  listMaterialsTool,
  updateMaterialStockTool,
  recordMaterialUsageTool,
  generateReorderListTool,
  recordMaterialPurchaseTool,
  listMaterialPurchasesTool,
  updateMaterialTool,

  //vendor tools
  addVendorTool,
  listVendorsTool,
  getVendorHistoryTool,
  updateVendorTool,

  //finance tools
  generateQuotationTool,
  addQuotationItemTool,
  updateQuotationStatusTool,
  updateQuotationTool,
  generateInvoiceTool,
  convertQuotationToInvoiceTool,
  updateInvoiceStatusTool,
  recordPaymentTool,
  getOutstandingPaymentsTool,
  getPaymentHistoryTool,
  generatePaymentReminderTool,
  generateCreditNoteTool,
  generateDebitNoteTool,
  generatePaymentReceiptTool,
  cancelInvoiceTool,
  listQuotationsTool,
  listInvoicesTool,
  showQuotationFormTool,
  showSplitQuotationTool,
  splitQuotationTool,
  showInvoiceEditFormTool,
  showSplitInvoiceTool,
  splitInvoiceTool,
  showCombineQuotationTool,
  combineQuotationTool,
  showCombineInvoiceTool,
  combineInvoiceTool,

  //reporting tools
  generateReportTool,
  showReportGeneratorTool,

  //universal search tool
  universalSearchTool,

  //custom action tool
  customActionTool,

  //generate daily schedule
  generateDailyScheduleTool,
  invalidateScheduleCacheTool,
  identifyBottlenecksTool,
  optimizeTaskOrderTool,
  getRecommendationsTool,
  analyzeProjectHealthTool,
};

export function getToolNames(): string[] {
  return Object.keys(aiTools);
}

export function getToolCount(): number {
  return Object.keys(aiTools).length;
}

export function hasTool(toolName: string): boolean {
  return toolName in aiTools;
}

// Re-export all tools as named exports for compatibility
export {
  createClientTool,
  updateClientTool,
  listClientsTool,
  getClientTool,
  validateClientDataTool,
  generateClientUpdateTool,
  updateClientStateTool,
  createProjectTool,
  updateProjectTool,
  listProjectsTool,
  getProjectDetailsTool,
  addProjectMaterialTool,
  updateTaskProgressTool,
  getProjectTool,
  getProjectProgressTool,
  estimateProjectCostTool,
  addProjectPhotoTool,
  calculateProjectProfitabilityTool,
  startTimeEntryTool,
  stopTimeEntryTool,
  createProjectFromQuotationTool,
  createPrototypeProjectTool,
  showCreateProjectFormTool,
  listProjectTasksTool,
  updateTaskStatusTool,
  assignTaskTool,
  getTaskDetailsTool,
  createTaskTool,
  updateTasksUpToTool,
  assignTasksToDefaultsTool,
  updateTaskTool,
  addMaterialTool,
  listMaterialsTool,
  updateMaterialStockTool,
  recordMaterialUsageTool,
  generateReorderListTool,
  recordMaterialPurchaseTool,
  listMaterialPurchasesTool,
  addVendorTool,
  listVendorsTool,
  getVendorHistoryTool,
  updateMaterialTool,
  updateVendorTool,
  generateQuotationTool,
  addQuotationItemTool,
  updateQuotationStatusTool,
  updateQuotationTool,
  listQuotationsTool,
  showQuotationFormTool,
  showSplitQuotationTool,
  splitQuotationTool,
  showCombineQuotationTool,
  combineQuotationTool,
  generateInvoiceTool,
  convertQuotationToInvoiceTool,
  updateInvoiceStatusTool,
  listInvoicesTool,
  showInvoiceEditFormTool,
  showSplitInvoiceTool,
  splitInvoiceTool,
  showCombineInvoiceTool,
  combineInvoiceTool,
  generateReportTool,
  showReportGeneratorTool,
  getFinancialDashboardTool,
  recordPaymentTool,
  getOutstandingPaymentsTool,
  getPaymentHistoryTool,
  generatePaymentReminderTool,
  generateCreditNoteTool,
  generateDebitNoteTool,
  generatePaymentReceiptTool,
  cancelInvoiceTool,
  universalSearchTool,
  customActionTool,
  generateDailyScheduleTool,
  invalidateScheduleCacheTool,
  identifyBottlenecksTool,
  optimizeTaskOrderTool,
  getRecommendationsTool,
  analyzeProjectHealthTool,
  saveContextMemoryTool,
  retrieveContextMemoryTool,
  searchContextMemoryTool,
};

// Export aliases for backward compatibility
export { listProjectTasksTool as listTasksTool };

export default aiTools;
