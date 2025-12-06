import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SectionHeader, GlassCard } from '@/components/ui/GlassCard'
import { Edit2, ArrowLeft } from 'lucide-react'
import TaskEditCard from './TaskEditCard'

interface TaskDetailsCardProps {
    task: any
    onAction?: (action: string, data: any) => void
}

export default function TaskDetailsCard({ task, onAction }: TaskDetailsCardProps) {
    const [isEditing, setIsEditing] = useState(false)

    if (isEditing) {
        return (
            <TaskEditCard
                task={task}
                onAction={onAction}
                onCancel={() => setIsEditing(false)}
            />
        )
    }

    return (
        <GlassCard>
            <div className="flex items-start justify-between">
                <SectionHeader
                    eyebrow={task.project}
                    title={task.name}
                    meta={
                        <Badge
                            variant="secondary"
                            className={cn(
                                "capitalize",
                                task.status === 'completed' ? "bg-emerald-500/20 text-emerald-300" :
                                    task.status === 'in_progress' ? "bg-blue-500/20 text-blue-300" :
                                        task.status === 'blocked' ? "bg-rose-500/20 text-rose-300" :
                                            "bg-white/10 text-white/60"
                            )}
                        >
                            {task.status}
                        </Badge>
                    }
                />
                <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                    title="Edit Task"
                >
                    <Edit2 className="h-4 w-4 text-white/70" />
                </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wider text-white/40 mb-1">Assignment</div>
                    <div className="text-lg font-medium text-white">
                        {task.assignedTo ? `@${task.assignedTo}` : 'Unassigned'}
                    </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wider text-white/40 mb-1">Hours</div>
                    <div className="text-lg font-medium text-white">
                        {task.actualHours || 0} / {task.estimatedHours} hrs
                    </div>
                </div>
            </div>

            {task.dependsOn && (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wider text-white/40 mb-1">Dependencies</div>
                    <div className="text-sm text-white/80">
                        Depends on task ID: <span className="font-mono text-white/60">{task.dependsOn}</span>
                    </div>
                </div>
            )}

            {task.notes && (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wider text-white/40 mb-2">Notes</div>
                    <p className="text-sm text-white/80 whitespace-pre-wrap">{task.notes}</p>
                </div>
            )}

            <div className="mt-6 flex gap-2">
                <button
                    onClick={() => onAction?.('submitMessage', `Update status of task "${task.name}" in project "${task.project}"`)}
                    className="flex-1 rounded-lg bg-white/10 hover:bg-white/20 py-2 text-sm font-medium text-white transition-colors"
                >
                    Update Status
                </button>
                <button
                    onClick={() => onAction?.('submitMessage', `Assign task "${task.name}" in project "${task.project}"`)}
                    className="flex-1 rounded-lg bg-white/10 hover:bg-white/20 py-2 text-sm font-medium text-white transition-colors"
                >
                    Assign
                </button>
            </div>
        </GlassCard>
    )
}
