// /lib/tool-router.ts
import { ToolAnalytics } from './tool-analytics'
import { coreTools, advancedTools, allTools } from './tool-groups'

// Define the tool type to make TypeScript happy
interface AITool {
  execute: (params: any) => Promise<any>
  description?: string
  inputSchema?: any
}

type ToolCollection = Record<string, AITool>

export class ToolRouter {
  private recentlyUsedTools = new Set<string>()
  private userIntentCache = new Map<string, string[]>()

  async getToolsForMessage(userMessage: string): Promise<ToolCollection> {
    const intent = this.analyzeIntent(userMessage)
    const recentTools = Array.from(this.recentlyUsedTools)
    
    // Start with core tools always
    let tools: ToolCollection = { ...coreTools }
    
    // Add tools based on intent
    const intentTools = this.getToolsForIntent(intent)
    tools = { ...tools, ...intentTools }
    
    // Add recently used advanced tools
    const recentAdvancedTools = this.getRecentAdvancedTools(recentTools)
    tools = { ...tools, ...recentAdvancedTools }
    
    return tools
  }

  private analyzeIntent(userMessage: string): string {
    const message = userMessage.toLowerCase()
    
    if (message.includes('schedule') || message.includes('plan') || message.includes('today') || message.includes('work')) 
      return 'scheduling'
    if (message.includes('client') || message.includes('customer')) 
      return 'clients'
    if (message.includes('invoice') || message.includes('payment') || message.includes('bill')) 
      return 'financial'
    if (message.includes('material') || message.includes('stock') || message.includes('inventory')) 
      return 'inventory'
    if (message.includes('quote') || message.includes('quotation') || message.includes('estimate')) 
      return 'quotations'
    if (message.includes('vendor') || message.includes('supplier')) 
      return 'vendors'
    if (message.includes('time') || message.includes('track') || message.includes('timer')) 
      return 'time'
    if (message.includes('photo') || message.includes('image') || message.includes('picture')) 
      return 'photos'
    if (message.includes('constraint') || message.includes('context') || message.includes('remember')) 
      return 'context'
    
    return 'general'
  }

  private getToolsForIntent(intent: string): ToolCollection {
    const intentMap: Record<string, string[]> = {
      scheduling: ['generateContextAwarePlan', 'setContextConstraint', 'generateDailyPlan'],
      clients: ['createClient', 'listClients', 'getClient', 'generateClientUpdate'],
      financial: ['generateInvoice', 'listInvoices', 'recordPayment', 'getFinancialSummary'],
      quotations: ['generateQuotation', 'listQuotations', 'getQuotation', 'convertQuotationToInvoice'],
      vendors: ['listVendors', 'addVendor', 'recordMaterialPurchase'],
      time: ['startTimeEntry', 'stopTimeEntry', 'listTimeEntries', 'logWork'],
      inventory: ['generateReorderList', 'recordMaterialUsage', 'listMaterials', 'updateMaterialStock'],
      photos: ['addProjectPhoto'],
      context: ['setContextConstraint', 'getActiveConstraints', 'interpretConstraint'],
      general: ['getBusinessOverview', 'getProjectProgress', 'listProjects', 'listTasks']
    }
    
    const toolNames = intentMap[intent] || intentMap.general
    return this.pickTools(toolNames)
  }

  private getRecentAdvancedTools(recentTools: string[]): ToolCollection {
    const tools: ToolCollection = {}
    
    recentTools.forEach(toolName => {
      // Use type assertion to tell TypeScript this is safe
      const advancedTool = (advancedTools as Record<string, AITool>)[toolName]
      if (advancedTool) {
        tools[toolName] = advancedTool
      }
    })
    
    return tools
  }

  private pickTools(toolNames: string[]): ToolCollection {
    const tools: ToolCollection = {}
    
    toolNames.forEach(name => {
      // Use type assertion to handle the string indexing
      const tool = (allTools as Record<string, AITool>)[name]
      if (tool) {
        tools[name] = tool
      }
    })
    
    return tools
  }

  recordToolUsage(toolName: string) {
    this.recentlyUsedTools.add(toolName)
    
    // Keep only last 10 tools
    if (this.recentlyUsedTools.size > 10) {
      const first = this.recentlyUsedTools.values().next().value
      if (first) {
        this.recentlyUsedTools.delete(first)
      }
    }
  }

  // Method to get usage insights
  async getToolInsights(): Promise<{
    totalTools: number
    frequentlyUsed: number
    rarelyUsed: number
    recommendations: string[]
  }> {
    const stats = await ToolAnalytics.getToolUsageStats(30)
    
    const insights = {
      totalTools: stats.length,
      frequentlyUsed: stats.filter(s => s.usage_count > 10).length,
      rarelyUsed: stats.filter(s => s.usage_count <= 2).length,
      recommendations: [] as string[]
    }
    
    if (insights.rarelyUsed > 10) {
      insights.recommendations.push(`Consider removing ${insights.rarelyUsed} rarely used tools`)
    }
    
    // Find specific rarely used tools
    const rarelyUsedTools = stats.filter(s => s.usage_count <= 2)
    if (rarelyUsedTools.length > 0) {
      insights.recommendations.push(`Rarely used: ${rarelyUsedTools.map(t => t.tool_name).join(', ')}`)
    }
    
    return insights
  }

  // Method to get suggested tools for optimization
  async getOptimizationSuggestions(): Promise<{
    coreCandidates: string[]
    demotionCandidates: string[]
    removalCandidates: string[]
  }> {
    const stats = await ToolAnalytics.getToolUsageStats(30)
    
    // Tools used frequently that are currently in advanced (promote to core)
    const coreCandidates = stats
      .filter(stat => stat.usage_count > 15 && !coreTools[stat.tool_name as keyof typeof coreTools])
      .map(stat => stat.tool_name)

    // Tools in core that are rarely used (demote to advanced)
    const demotionCandidates = stats
      .filter(stat => stat.usage_count <= 5 && coreTools[stat.tool_name as keyof typeof coreTools])
      .map(stat => stat.tool_name)

    // Tools never or rarely used (consider removing)
    const removalCandidates = stats
      .filter(stat => stat.usage_count === 0)
      .map(stat => stat.tool_name)

    return {
      coreCandidates,
      demotionCandidates,
      removalCandidates
    }
  }
}

// Create a singleton instance
export const toolRouter = new ToolRouter()