import { generateText, stepCountIs } from 'ai'
import { google } from '@ai-sdk/google'

import {
  createClientTool,
  listClientsTool,
  getClientTool,
  updateClientTool,
  validateClientDataTool,
  generateClientUpdateTool,
  createProjectTool,
  listProjectsTool,
  getProjectDetailsTool,
  updateProjectTool,
  addProjectMaterialTool,
  updateTaskProgressTool,
  viewInventoryTool,
  addMaterialPurchaseTool,
  viewMaterialUsageReportTool,
  checkReorderAlertsTool,
  createQuotationWithItemsTool,
  addQuotationItemTool,
  generateInvoiceWithItemsTool,
  recordPaymentTool,
  financialReportTool,
  generateQuotationPDFTool,
  generateInvoicePDFTool
} from '@/lib/ai-tools'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 })
    }

    console.log('🚀 Processing request...')

    // ✅ CORRECT for v5.0.88: Use stopWhen instead of maxSteps
    const result = await generateText({
      model: google('gemini-2.5-flash'),
      messages,
      system: `You are SculptorAI, helpful assistant for Dhanush's sculpture studio.

When you use tools, ALWAYS explain the results clearly to the user.

Use these tools:
- getClient: Get ONE client's details
- listClients: List all clients  
- createClient: Create new client
- updateClient: Update client info
- validateClientData: Validate data
- generateClientUpdate: Create messages`,

      tools: {
        //client tools
        getClient: getClientTool,
        listClients: listClientsTool,
        createClient: createClientTool,
        updateClient: updateClientTool,
        validateClientData: validateClientDataTool,
        generateClientUpdate: generateClientUpdateTool,

        //project tools
        createProject: createProjectTool,
        listProjects: listProjectsTool,
        getProjectDetails: getProjectDetailsTool,
        updateProject: updateProjectTool,
        addProjectMaterial: addProjectMaterialTool,
        updateTaskProgress: updateTaskProgressTool,

        //material inventory tools
         viewInventory: viewInventoryTool,
          addMaterialPurchase: addMaterialPurchaseTool,
          viewMaterialUsageReport: viewMaterialUsageReportTool,
          checkReorderAlerts: checkReorderAlertsTool,

        //finance tools
        addQuotationItemTool: addQuotationItemTool,
        createQuotationWithItemsTool: createQuotationWithItemsTool,
        generateInvoice: generateInvoiceWithItemsTool,
        generateQuotationPDF: generateQuotationPDFTool,
        generateInvoicePDF: generateInvoicePDFTool,
        recordPayment: recordPaymentTool,
        financialReport: financialReportTool,
               
      },

      toolChoice: 'auto',
      // ✅ USE stopWhen for v5.0.88
      stopWhen: [stepCountIs(5)],  // Stop after max 5 steps
    })

    const responseText = result.text || '✅ Action completed.'

    console.log('✅ Response:', responseText.substring(0, 150))

    return new Response(responseText, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error) {
    console.error('❌ API error:', error)
    const errorMsg = error instanceof Error ? error.message : String(error)
    return new Response(`❌ Error: ${errorMsg}`, { status: 500 })
  }
}
