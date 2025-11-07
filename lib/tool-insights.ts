// In `/lib/tool-insights.ts`
import { ToolAnalytics } from './tool-analytics'

export async function getToolInsights() {
  const stats = await ToolAnalytics.getToolUsageStats(30)
  
  const insights = {
    totalTools: stats.length,
    frequentlyUsed: stats.filter(s => s.usage_count > 10).length,
    rarelyUsed: stats.filter(s => s.usage_count <= 2).length,
    slowTools: stats.filter(s => s.average_response_time > 5000), // >5 seconds
    errorProneTools: stats.filter(s => s.error_rate > 10), // >10% error rate
    
    recommendations: [] as string[]
  }
  
  if (insights.rarelyUsed > 10) {
    insights.recommendations.push(`Consider removing ${insights.rarelyUsed} rarely used tools`)
  }
  
  if (insights.slowTools.length > 0) {
    insights.recommendations.push(`Optimize ${insights.slowTools.length} slow tools`)
  }
  
  return insights
}