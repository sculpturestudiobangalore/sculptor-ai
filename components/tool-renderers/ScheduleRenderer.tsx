import React from 'react'
import { AlertTriangle, CheckCircle, TrendingUp, Activity, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import GlassCard, { SectionHeader } from '@/components/ui/GlassCard'
import DailyScheduleCard from '../cards/DailyScheduleCard'
import GenericSuccessCard from '../cards/GenericSuccessCard'
import { GenericSuccessOutput } from '@/types/tool-types'

interface ScheduleRendererProps {
    toolName: string
    result: any
    onAction?: (action: string, data: any) => void
}

export function ScheduleRenderer({ toolName, result, onAction }: ScheduleRendererProps) {
    if (toolName === 'generateDailyScheduleTool') {
        const o = result as {
            success: boolean;
            date: string;
            cached?: boolean;
            previous_day_pending?: any[];
            schedule: Record<string, any>;
            external_vendor_tasks?: any[];
            material_alerts?: any[];
            capacity_warnings?: string[];
            parallel_opportunities?: any[];
            blocked_tasks?: any;
            confidence_score?: number;
            message?: string;
            error?: string;
        };

        if (!o?.success) {
            return (
                <div className={cn('rounded-[28px] border border-white/12 bg-white/10 p-6 text-white/90 backdrop-blur-[70px] shadow-[0_45px_140px_rgba(17,0,58,0.55)]', 'border-rose-400/30 bg-rose-500/10 text-rose-100')}>
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        <p className="font-semibold">Failed to generate schedule</p>
                    </div>
                    <p className="text-sm text-white/70">{o.error || 'Unknown error'}</p>
                </div>
            );
        }

        return (
            <DailyScheduleCard
                date={o.date}
                previous_day_pending={o.previous_day_pending}
                schedule={o.schedule}
                external_vendor_tasks={o.external_vendor_tasks}
                material_alerts={o.material_alerts}
                capacity_warnings={o.capacity_warnings}
                parallel_opportunities={o.parallel_opportunities}
                blocked_tasks={o.blocked_tasks}
                confidence_score={o.confidence_score}
                cached={o.cached}
            />
        );
    }

    if (toolName === 'invalidateScheduleCacheTool') {
        return <GenericSuccessCard output={result as GenericSuccessOutput} toolName={toolName} />
    }

    if (toolName === 'identifyBottlenecksTool') {
        const o = result as { success: boolean; bottlenecks?: any[]; error?: string }
        if (!o?.success) return null

        return (
            <GlassCard className="border-amber-400/30 bg-amber-500/10">
                <SectionHeader
                    eyebrow="Analysis"
                    title="Identified Bottlenecks"
                    meta={<Badge variant="secondary" className="bg-amber-500/20 text-amber-200">{o.bottlenecks?.length || 0} issues</Badge>}
                />
                <div className="mt-4 space-y-3">
                    {o.bottlenecks?.map((b, i) => (
                        <div key={i} className="rounded-lg border border-amber-400/20 bg-amber-500/5 p-3">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-medium text-amber-100">{b.taskName || 'Unknown Task'}</h4>
                                    <p className="text-sm text-amber-100/70">{b.reason || b.description}</p>
                                    {b.impact && <div className="mt-1 text-xs text-amber-100/50">Impact: {b.impact}</div>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>
        )
    }

    if (toolName === 'optimizeTaskOrderTool') {
        const o = result as { success: boolean; optimizedOrder?: any[]; savings?: string; error?: string }
        if (!o?.success) return null

        return (
            <GlassCard className="border-emerald-400/30 bg-emerald-500/10">
                <SectionHeader
                    eyebrow="Optimization"
                    title="Suggested Task Order"
                    meta={<Badge variant="secondary" className="bg-emerald-500/20 text-emerald-200">{o.savings || 'Efficiency Improved'}</Badge>}
                />
                <div className="mt-4 space-y-2">
                    {o.optimizedOrder?.map((task, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-3">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-medium text-emerald-200">
                                {i + 1}
                            </div>
                            <div>
                                <h4 className="font-medium text-emerald-100">{task.name}</h4>
                                <p className="text-xs text-emerald-100/60">{task.reason || 'Optimized sequence'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>
        )
    }

    if (toolName === 'getRecommendationsTool') {
        const o = result as { success: boolean; recommendations?: any[]; error?: string }
        if (!o?.success) return null

        return (
            <GlassCard className="border-blue-400/30 bg-blue-500/10">
                <SectionHeader
                    eyebrow="AI Insights"
                    title="Recommendations"
                    meta={<Lightbulb className="h-4 w-4 text-blue-200" />}
                />
                <div className="mt-4 space-y-3">
                    {o.recommendations?.map((rec, i) => (
                        <div key={i} className="rounded-lg border border-blue-400/20 bg-blue-500/5 p-3">
                            <h4 className="font-medium text-blue-100">{rec.title || 'Suggestion'}</h4>
                            <p className="text-sm text-blue-100/70 mt-1">{rec.description}</p>
                        </div>
                    ))}
                </div>
            </GlassCard>
        )
    }

    if (toolName === 'analyzeProjectHealthTool') {
        const o = result as { success: boolean; health?: any; error?: string }
        if (!o?.success) return null
        const h = o.health

        return (
            <GlassCard>
                <SectionHeader
                    eyebrow="Project Health"
                    title={h.status || 'Analysis Complete'}
                    meta={<Activity className={cn("h-4 w-4", h.score > 80 ? "text-emerald-400" : h.score > 50 ? "text-amber-400" : "text-rose-400")} />}
                />
                <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                        <div className="text-2xl font-bold text-white">{h.score || 0}%</div>
                        <div className="text-xs text-white/50">Overall Score</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                        <div className="text-2xl font-bold text-white">{h.onTimeTasks || 0}</div>
                        <div className="text-xs text-white/50">On Track</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                        <div className="text-2xl font-bold text-white">{h.delayedTasks || 0}</div>
                        <div className="text-xs text-white/50">Delayed</div>
                    </div>
                </div>
                {h.issues && h.issues.length > 0 && (
                    <div className="mt-6">
                        <h4 className="text-sm font-medium text-white/80 mb-2">Critical Issues</h4>
                        <ul className="space-y-1">
                            {h.issues.map((issue: string, i: number) => (
                                <li key={i} className="text-sm text-rose-300 flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                                    {issue}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </GlassCard>
        )
    }

    return null
}
