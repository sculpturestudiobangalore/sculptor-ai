import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { TrendingUp, CalendarDays, Wallet, AlertTriangle } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { ListProjectsOutput, ProjectSummary } from '@/types/tool-types'
import { formatINR } from "@/lib/ai-tools/finance/finance-helpers"

const statusStyles: Record<string, string> = {
    active: 'bg-emerald-500/25 text-emerald-100',
    planning: 'bg-sky-500/25 text-sky-100',
    completed: 'bg-white/15 text-white',
    paused: 'bg-amber-500/25 text-amber-100',
}

const rupee = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
})

const formatCurrency = (value: unknown): string => {
    if (typeof value === 'number') return rupee.format(value)
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return rupee.format(parsed)
    if (value === null || value === undefined || value === '') return '—'
    return String(value)
}

const SectionHeader = ({
    eyebrow,
    title,
    meta,
}: {
    eyebrow: string
    title: string
    meta?: React.ReactNode
}) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/45">{eyebrow}</p>
            <h3 className="text-xl font-semibold text-white sm:text-2xl">{title}</h3>
        </div>
        {meta && <div className="text-sm text-white/70">{meta}</div>}
    </div>
)

export default function ProjectsCard({
    output,
    onAction
}: {
    output?: ListProjectsOutput
    onAction?: (action: string, data: string) => void
}) {

    const projects: ProjectSummary[] = output?.projects ?? []

    if (!output?.success) {
        return (
            <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                <SectionHeader eyebrow="Project intelligence" title="Unable to list projects" />
                <p className="mt-3 text-sm text-rose-100/80">{output?.error ?? 'Please try again.'}</p>
            </GlassCard>
        )
    }

    if (projects.length === 0) {
        return (
            <GlassCard>
                <SectionHeader eyebrow="Project intelligence" title="No active projects" />
                <p className="mt-3 text-sm text-white/70">Bring in a new commission to populate this view.</p>
            </GlassCard>
        )
    }

    return (
        <GlassCard>
            <SectionHeader
                eyebrow="Project intelligence"
                title="Studio production pipeline"
                meta={
                    <div className="flex items-center gap-2 text-xs text-white/60">
                        <TrendingUp className="h-4 w-4 text-violet-200" />
                        Budget under management {String(formatCurrency(projects.reduce<number>((sum, project) => sum + Number(project.budget ?? 0), 0)))}
                    </div>
                }
            />

            <div className="mt-6 space-y-5">
                {projects.map((project) => {
                    const spent = Number(project.spent ?? 0)
                    const budget = Number(project.budget ?? 0)
                    const budgetUtilization = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0
                    const taskProgress = project.progress ?? 0

                    return (
                        <div
                            key={project.id}
                            className="rounded-2xl border border-white/12 bg-white/7 p-5 text-white/85 shadow-[0_36px_110px_rgba(15,0,60,0.4)]"
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex-1">
                                    <button
                                        onClick={() => onAction?.('viewProject', project.id)}
                                        className="text-left group"
                                    >
                                        <h4 className="text-lg font-semibold text-white group-hover:text-violet-300 transition-colors flex items-center gap-2">
                                            {project.name}
                                            {onAction && <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity">→</span>}
                                        </h4>
                                    </button>
                                    {/* Client Name */}
                                    {project.client && project.client !== 'N/A' && (
                                        <p className="mt-1 text-sm text-white/60">
                                            Client: <span className="text-white/90 font-medium">{project.client}</span>
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Badge className={cn('rounded-full px-3 py-1 text-xs capitalize', statusStyles[(project.status ?? '').toLowerCase()] ?? 'bg-white/15 text-white')}>
                                        {project.status || 'status unknown'}
                                    </Badge>
                                    <button
                                        onClick={() => onAction?.('submitMessage', `Edit project ${project.name}`)}
                                        className="rounded-lg px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all"
                                    >
                                        Edit
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                                <div className="flex items-center gap-2 text-sm text-white/70">
                                    <CalendarDays className="h-4 w-4 text-white/50" />
                                    Deadline {project.deadline || 'TBD'}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-white/70">
                                    <Wallet className="h-4 w-4 text-white/50" />
                                    {String(formatCurrency(spent))} spent of {String(formatCurrency(budget))}
                                </div>
                                {project.priority && (
                                    <div className="flex items-center gap-2 text-sm text-white/70">
                                        <AlertTriangle className="h-4 w-4 text-white/50" />
                                        Priority {project.priority}
                                    </div>
                                )}
                            </div>

                            {/* Project Progress Section */}
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                {/* Task Progress */}
                                <div>
                                    <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                                        <span>Project Progress</span>
                                        <span className="font-medium text-white">{taskProgress}%</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-white/10">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                            style={{ width: `${taskProgress}%` }}
                                        />
                                    </div>
                                    {project.lastCompletedTask && (
                                        <p className="mt-2 text-xs text-white/50">
                                            Last completed: <span className="text-white/80">{project.lastCompletedTask}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Budget Utilization */}
                                <div>
                                    <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                                        <span>Budget Utilisation</span>
                                        <span className="font-medium text-white">{budgetUtilization}%</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-white/10">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] via-[#a855f7] to-[#ec4899]"
                                            style={{ width: `${budgetUtilization}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </GlassCard >
    )
}
