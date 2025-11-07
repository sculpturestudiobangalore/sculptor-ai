// /lib/tool-wrapper.ts
import { ToolAnalytics } from './tool-analytics'

export function withAnalytics(tool: any, toolName: string) {
  if (!tool || !tool.execute) {
    console.error(`Invalid tool provided for analytics: ${toolName}`, tool)
    return tool
  }

  return {
    ...tool,
    execute: async (params: any) => {
      const startTime = Date.now()
      let success = true
      let result: any
      
      try {
        result = await tool.execute(params)
        return result
      } catch (error) {
        success = false
        throw error
      } finally {
        const responseTime = Date.now() - startTime
        // Fire and forget - don't await this
        ToolAnalytics.recordToolUsage(toolName, success, responseTime).catch(console.error)

        
      }
    }
  }
}   
