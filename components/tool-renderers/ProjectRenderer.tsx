import React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'
import GlassCard, { SectionHeader } from '@/components/ui/GlassCard'
import ProjectFormCard from '@/components/cards/ProjectFormCard'
import ProjectDetailsCard from '@/components/cards/ProjectDetailsCard'
import GenericSuccessCard from '@/components/cards/GenericSuccessCard'
import ProjectsCard from '@/components/cards/ProjectsCard'
import FallbackCard from '@/components/cards/FallbackCard'
import { GenericSuccessOutput, ListProjectsOutput } from '@/types/tool-types'

interface ProjectRendererProps {
    toolName: string
    result: any
    onAction?: (action: string, data: any) => void
}

export function ProjectRenderer({ toolName, result, onAction }: ProjectRendererProps) {
    // Generic Success Cases
    if ([
        'addProjectMaterialTool',
        'addProjectPhotoTool',
        'updateTaskProgressTool',
        'assignTaskTool',
        'createProjectTool',
        'createPrototypeProjectTool'
    ].includes(toolName)) {
        return <GenericSuccessCard output={result as GenericSuccessOutput} toolName={toolName} />
    }

    if (toolName === 'listProjectsTool') {
        return <ProjectsCard output={result as ListProjectsOutput} onAction={onAction} />
    }

    // Task List
    if (toolName === 'listProjectTasksTool') {
        const o = result as { success: boolean; tasks?: any[]; error?: string }
        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Tasks" title="Unable to fetch tasks" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }
        if (!o.tasks || o.tasks.length === 0) {
            return (
                <GlassCard>
                    <SectionHeader eyebrow="Tasks" title="No tasks found" />
                    <p className="mt-3 text-sm text-white/70">Add tasks to get started with project management.</p>
                </GlassCard>
            )
        }
        return (
            <GlassCard>
                <SectionHeader
                    eyebrow="Project Tasks"
                    title="Task Overview"
                    meta={<Badge variant="secondary">{o.tasks.length} tasks</Badge>}
                />
                <div className="mt-4 space-y-3">
                    {o.tasks.map((task) => (
                        <div key={task.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-white">{task.name}</h4>
                                    <p className="text-xs text-white/60">{task.description}</p>
                                </div>
                                <Badge className={cn(
                                    'text-xs capitalize',
                                    task.status === 'completed' ? 'bg-emerald-500/25 text-emerald-100' :
                                        task.status === 'in_progress' ? 'bg-blue-500/25 text-blue-100' :
                                            'bg-amber-500/25 text-amber-100'
                                )}>
                                    {task.status?.replace('_', ' ') || 'pending'}
                                </Badge>
                            </div>
                            {task.assignee && (
                                <div className="mt-2 text-xs text-white/70">
                                    Assigned to: {task.assignee}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </GlassCard>
        )
    }

    // Time Tracking
    if (toolName === 'startTimeEntryTool' || toolName === 'stopTimeEntryTool') {
        const o = result as { success: boolean; timeEntry?: any; message?: string; error?: string }
        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Time Tracking" title="Operation failed" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }
        return (
            <GlassCard className="border-emerald-400/30 bg-emerald-500/10">
                <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-emerald-200" />
                    <div>
                        <h3 className="text-lg font-semibold text-white">
                            {toolName === 'startTimeEntryTool' ? 'Time Tracking Started' : 'Time Tracking Stopped'}
                        </h3>
                        <p className="text-sm text-emerald-100/80">{o.message}</p>
                    </div>
                </div>
                {o.timeEntry && (
                    <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-white/60">Duration:</span>
                            <span className="font-medium text-white">{o.timeEntry.duration || '—'}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-white/60">Task:</span>
                            <span className="font-medium text-white">{o.timeEntry.taskName || '—'}</span>
                        </div>
                    </div>
                )}
            </GlassCard>
        )
    }

    // Project Progress
    if (toolName === 'getProjectProgressTool') {
        const o = result as { success: boolean; progress?: any; error?: string }
        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Progress" title="Unable to fetch progress" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }

        const p = o.progress
        if (!p) return null

        return (
            <GlassCard>
                <SectionHeader
                    eyebrow="Project Progress"
                    title={`${p.completion_percentage}% Complete`}
                    meta={<Badge variant="secondary">{p.status}</Badge>}
                />

                <div className="mt-4 space-y-4">
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                            className="h-full bg-emerald-400 transition-all duration-500"
                            style={{ width: `${p.completion_percentage}%` }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="text-xs text-white/60">Tasks Completed</div>
                            <div className="text-lg font-semibold text-white">
                                {p.completed_tasks} / {p.total_tasks}
                            </div>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="text-xs text-white/60">Days Remaining</div>
                            <div className="text-lg font-semibold text-white">
                                {p.days_remaining}
                            </div>
                        </div>
                    </div>
                </div>
            </GlassCard>
        )
    }

    // Only show form if explicitly requested or if it's an update/create tool
    if (toolName === 'showCreateProjectFormTool') {
        const r = result as {
            success: boolean
            showForm: boolean
            prefillClientName?: string
            clients: Array<{ id: string, name: string, email?: string, phone?: string, company?: string }>
            quotations: Array<{ id: string, quotation_number: string, client_id: string, client_name?: string, total_amount: number, status?: string }>
            message?: string
            error?: string
        }

        if (!r.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Error" title="Failed to load project form" />
                    <p className="mt-3 text-sm text-rose-100/80">{r.error || "Unknown error occurred"}</p>
                </GlassCard>
            )
        }

        if (r.success && r.showForm) {
            return (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <ProjectFormCard
                        clients={r.clients}
                        quotations={r.quotations}
                        prefillClientName={r.prefillClientName}
                        isEdit={false}
                        onSubmit={(data) => {
                            // Build natural language command for project creation
                            const quotationPart = data.quotationId
                                ? ` linked to quotation ID ${data.quotationId}`
                                : ''
                            const command = `Create a new project named "${data.name}" for client ID ${data.clientId}${quotationPart}, with project type ${data.projectType}, priority ${data.priority}, deadline ${data.deadline || 'not set'}, budget ₹${data.budget}, status "${data.status}", and description: "${data.description || 'none'}"`

                            console.log('📝 [ProjectRenderer] Creating project:', command)
                            onAction?.('submitMessage', command)
                        }}
                        onCancel={() => {
                            // Optional cancel logic
                        }}
                    />
                </div>
            )
        }
    }

    if (
        toolName === 'createProjectFromQuotationTool' ||
        (result?.showEditForm)
    ) {
        if (result?.success && result.project) {
            const p = result.project
            const clientName = p.clientName || p.client?.name || p.client || 'Unknown Client'
            const isDraft = toolName === 'createProjectFromQuotationTool'

            return (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <ProjectFormCard
                        isEdit={toolName === 'updateProjectTool' || !!result?.showEditForm}
                        project={{
                            id: p.id || 'new',
                            name: p.name,
                            clientName: clientName,
                            clientId: p.client?.id || p.client_id || p.clientId,
                            description: p.description,
                            status: p.status,
                            projectType: p.project_type || p.projectType,
                            budget: p.budget_amount || p.budget,
                            deadline: p.deadline,
                            priority: p.priority,
                        }}
                        existingTasks={p.tasks || []}
                        existingMaterials={p.materials || []}
                        onSubmit={(data) => {
                            if (isDraft) {
                                // Pass quotation ID if available
                                onAction?.('createProject', {
                                    ...data,
                                    quotationId: p.quotationId
                                })
                            } else {
                                onAction?.('saveProject', data)
                            }
                        }}
                        onCancel={() => {
                            if (p.id && p.id !== 'new') {
                                onAction?.('viewProject', p.id)
                            }
                        }}
                    />
                </div>
            )
        }
    }

    // Profitability Analysis
    if (toolName === 'calculateProjectProfitabilityTool') {
        const o = result as { success: boolean; profitability?: any; error?: string }
        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Analysis" title="Unable to calculate profitability" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }

        const p = o.profitability
        if (!p) return null

        return (
            <GlassCard>
                <SectionHeader
                    eyebrow="Financial Analysis"
                    title="Project Profitability"
                    meta={<Badge variant={p.profit_margin > 20 ? "default" : "secondary"}>{p.profit_margin}% Margin</Badge>}
                />

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs uppercase tracking-wider text-white/40 mb-1">Total Revenue</div>
                        <div className="text-xl font-semibold text-white">₹{p.total_revenue?.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs uppercase tracking-wider text-white/40 mb-1">Total Costs</div>
                        <div className="text-xl font-semibold text-white">₹{p.total_cost?.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs uppercase tracking-wider text-white/40 mb-1">Net Profit</div>
                        <div className={cn(
                            "text-xl font-semibold",
                            p.net_profit >= 0 ? "text-emerald-300" : "text-rose-300"
                        )}>
                            ₹{p.net_profit?.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="mt-6 space-y-3">
                    <h4 className="text-sm font-medium text-white/80">Cost Breakdown</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-white/60">Materials</span>
                            <span className="text-white">₹{p.breakdown?.materials?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/60">Labor</span>
                            <span className="text-white">₹{p.breakdown?.labor?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/60">Overhead</span>
                            <span className="text-white">₹{p.breakdown?.overhead?.toLocaleString() || 0}</span>
                        </div>
                    </div>
                </div>
            </GlassCard>
        )
    }

    // Render ProjectDetailsCard for ANY project tool if we are not showing the form
    if (result?.success && result.project) {
        return (
            <ProjectDetailsCard
                project={result.project}
                onAction={(action, payload) => {
                    switch (action) {
                        case 'editProject':
                            // Explicitly request edit mode
                            onAction?.('submitMessage', `Call getProjectTool with projectId='${payload}' and showEditForm=true`)
                            break
                        case 'generateInvoice':
                            onAction?.('submitMessage', `Generate invoice for project ${payload}`)
                            break
                        case 'viewTasks':
                            onAction?.('submitMessage', `Show tasks for project ${payload}`)
                            break
                        case 'viewMaterials':
                            onAction?.('submitMessage', `Show materials for project ${payload}`)
                            break
                        case 'viewClient':
                            onAction?.('submitMessage', `Show client details for ID ${payload}`)
                            break
                        default:
                            onAction?.(action, payload)
                    }
                }}
            />
        )
    }

    return <FallbackCard toolName={toolName} output={result} />
}
