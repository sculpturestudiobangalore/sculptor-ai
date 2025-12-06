import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { GlassCard, SectionHeader } from '@/components/ui/GlassCard'
import GenericSuccessCard from '@/components/cards/GenericSuccessCard'
import TaskDetailsCard from '@/components/cards/TaskDetailsCard'
import BulkTaskUpdateCard from '@/components/cards/BulkTaskUpdateCard'
import { GenericSuccessOutput } from '@/types/tool-types'

interface TaskRendererProps {
    toolName: string
    result: any
    onAction?: (action: string, data: any) => void
}

export function TaskRenderer({ toolName, result, onAction }: TaskRendererProps) {
    // Bulk Task Update - Use custom card
    if (toolName === 'updateTasksUpToTool') {
        return <BulkTaskUpdateCard result={result} />
    }

    // Generic Success Cases
    if ([
        'createTaskTool',
        'updateTaskStatusTool',
        'assignTaskTool',
        'assignTasksToDefaultsTool'
    ].includes(toolName)) {
        return <GenericSuccessCard output={result as GenericSuccessOutput} toolName={toolName} />
    }

    if (toolName === 'updateTaskTool') {
        const o = result as { success: boolean; task?: any; message?: string; error?: string }
        if (o.success && o.task) {
            // If we have the full task object, show details
            // But updateTaskTool might return a partial object or just updates.
            // Let's check the tool definition. It returns { id, name, project, updates }.
            // This is NOT enough for TaskDetailsCard which expects full details.
            // So we should probably just show GenericSuccessCard for updateTaskTool too,
            // OR fetch the full details.
            // For now, let's use GenericSuccessCard for updateTaskTool as well.
            return <GenericSuccessCard output={result as GenericSuccessOutput} toolName={toolName} />
        }
        return <GenericSuccessCard output={result as GenericSuccessOutput} toolName={toolName} />
    }

    if (toolName === 'listProjectTasksTool') {
        const o = result as {
            success: boolean
            project?: { name: string; status: string }
            tasks?: any[]
            summary?: { total: number; completed: number; inProgress: number; pending: number; progress: number }
            error?: string
        }

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
                    <p className="mt-3 text-sm text-white/70">
                        No tasks found for project {o.project?.name}.
                    </p>
                </GlassCard>
            )
        }

        return (
            <GlassCard>
                <SectionHeader
                    eyebrow="Project Tasks"
                    title={o.project?.name || 'Tasks'}
                    meta={
                        <Badge variant="secondary" className="bg-white/10 text-white">
                            {o.summary?.progress}% Complete
                        </Badge>
                    }
                />

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-white/60 mb-6">
                    <div className="rounded-lg bg-white/5 p-2">
                        <div className="font-bold text-white text-lg">{o.summary?.completed}</div>
                        <div>Completed</div>
                    </div>
                    <div className="rounded-lg bg-white/5 p-2">
                        <div className="font-bold text-white text-lg">{o.summary?.inProgress}</div>
                        <div>In Progress</div>
                    </div>
                    <div className="rounded-lg bg-white/5 p-2">
                        <div className="font-bold text-white text-lg">{o.summary?.pending}</div>
                        <div>Pending</div>
                    </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-auto">
                    {o.tasks.map((task) => (
                        <div key={task.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-white">{task.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-[10px] px-1.5 py-0 h-5 border-0",
                                                task.status === 'completed' ? "bg-emerald-500/20 text-emerald-300" :
                                                    task.status === 'in_progress' ? "bg-blue-500/20 text-blue-300" :
                                                        task.status === 'blocked' ? "bg-rose-500/20 text-rose-300" :
                                                            "bg-white/10 text-white/60"
                                            )}
                                        >
                                            {task.status}
                                        </Badge>
                                        <span className="text-xs text-white/50">
                                            {task.assigned_to ? `@${task.assigned_to}` : 'Unassigned'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onAction?.('submitMessage', `Show details for task "${task.name}" in project "${o.project?.name}"`)}
                                        className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors text-white/80"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => onAction?.('submitMessage', `Update status of task "${task.name}" in project "${o.project?.name}"`)}
                                        className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors text-white/80"
                                    >
                                        Status
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>
        )
    }

    if (toolName === 'getTaskDetailsTool') {
        const o = result as { success: boolean; task?: any; error?: string }

        if (!o?.success || !o.task) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Task Details" title="Unable to fetch task" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }

        return <TaskDetailsCard task={o.task} onAction={onAction} />
    }

    return null
}
