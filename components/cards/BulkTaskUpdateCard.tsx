import React from 'react'
import { GlassCard, SectionHeader } from '@/components/ui/GlassCard'
import { CheckCircle2 } from 'lucide-react'

interface BulkTaskUpdateCardProps {
    result: {
        success: boolean
        tasksUpdated?: number
        updatedTasks?: string[]
        newStatus?: string
        projectProgress?: number
        message?: string
        error?: string
    }
}

const statusColors: Record<string, string> = {
    completed: 'text-emerald-400',
    in_progress: 'text-amber-400',
    pending: 'text-blue-400',
    blocked: 'text-rose-400',
}

const statusLabels: Record<string, string> = {
    completed: 'Completed',
    in_progress: 'In Progress',
    pending: 'Pending',
    blocked: 'Blocked',
}

export default function BulkTaskUpdateCard({ result }: BulkTaskUpdateCardProps) {
    if (!result.success) {
        return (
            <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                <SectionHeader eyebrow="Bulk Task Update" title="Update Failed" />
                <p className="mt-3 text-sm text-rose-100/80">{result.error || 'Unknown error occurred'}</p>
            </GlassCard>
        )
    }

    const statusColor = statusColors[result.newStatus || ''] || 'text-white'
    const statusLabel = statusLabels[result.newStatus || ''] || result.newStatus

    return (
        <GlassCard className="border-emerald-400/30 bg-emerald-500/10">
            <SectionHeader
                eyebrow="Bulk Task Update"
                title={`${result.tasksUpdated} Tasks Updated`}
                meta={
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-white/60">Status:</span>
                        <span className={`font-medium capitalize ${statusColor}`}>
                            {statusLabel}
                        </span>
                    </div>
                }
            />

            <div className="mt-4 space-y-2">
                {result.updatedTasks?.map((taskName, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                    >
                        <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${statusColor}`} />
                        <span className="text-sm text-white">{taskName}</span>
                    </div>
                ))}
            </div>

            {result.projectProgress !== undefined && (
                <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-white/60">Project Progress</span>
                        <span className="font-medium text-white">{result.projectProgress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] via-[#a855f7] to-[#ec4899]"
                            style={{ width: `${result.projectProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {result.message && (
                <p className="mt-3 text-sm text-white/70">{result.message}</p>
            )}
        </GlassCard>
    )
}
