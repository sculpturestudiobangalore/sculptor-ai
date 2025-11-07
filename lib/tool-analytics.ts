// /lib/tool-analytics.ts
import { supabase } from '@/lib/supabase'

export interface ToolUsage {
  tool_name: string
  usage_count: number
  last_used: string
  average_response_time: number
  error_rate: number
}

export class ToolAnalytics {
  static async recordToolUsage(toolName: string, success: boolean, responseTime: number) {
    try {
      const { error } = await supabase
        .from('tool_usage_analytics')
        .insert({
          tool_name: toolName,
          success,
          response_time: responseTime,
          executed_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to record tool usage:', error)
      }
    } catch (error) {
      console.error('Failed to record tool usage:', error)
    }
  }

  static async getToolUsageStats(days: number = 30): Promise<ToolUsage[]> {
    try {
      const { data, error } = await supabase
        .from('tool_usage_analytics')
        .select('*')
        .gte('executed_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

      if (error) {
        console.error('Failed to get tool stats:', error)
        return []
      }

      const toolStats = (data || []).reduce((acc: any, record) => {
        if (!acc[record.tool_name]) {
          acc[record.tool_name] = {
            tool_name: record.tool_name,
            usage_count: 0,
            last_used: record.executed_at,
            total_response_time: 0,
            error_count: 0
          }
        }
        
        acc[record.tool_name].usage_count++
        acc[record.tool_name].total_response_time += record.response_time
        if (!record.success) acc[record.tool_name].error_count++
        if (new Date(record.executed_at) > new Date(acc[record.tool_name].last_used)) {
          acc[record.tool_name].last_used = record.executed_at
        }
        
        return acc
      }, {})

      return Object.values(toolStats).map((stat: any) => ({
        tool_name: stat.tool_name,
        usage_count: stat.usage_count,
        last_used: stat.last_used,
        average_response_time: stat.usage_count > 0 ? stat.total_response_time / stat.usage_count : 0,
        error_rate: stat.usage_count > 0 ? (stat.error_count / stat.usage_count) * 100 : 0
      }))
    } catch (error) {
      console.error('Error in getToolUsageStats:', error)
      return []
    }
  }
}