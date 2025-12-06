import React, { useState } from 'react'
import { Save, X, Calendar, User, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskEditCardProps {
    task: {
        id: string
        name: string
        project: string
        description?: string
        estimatedHours?: number
        assignedTo?: string
        status?: string
        dependsOn?: string
    }
    onAction?: (action: string, data: any) => void
    onCancel?: () => void
}

export default function TaskEditCard({ task, onAction, onCancel }: TaskEditCardProps) {
    const [formData, setFormData] = useState({
        name: task.name,
        description: task.description || '',
        estimatedHours: task.estimatedHours || 0,
        assignedTo: task.assignedTo || '',
        status: task.status || 'pending',
        dependsOn: task.dependsOn || ''
    })

    const [isSaving, setIsSaving] = useState(false)

    const handleSubmit = () => {
        setIsSaving(true)
        // Construct natural language command
        const updates = []
        if (formData.name !== task.name) updates.push(`name to "${formData.name}"`)
        if (formData.description !== task.description) updates.push(`description to "${formData.description}"`)
        if (formData.estimatedHours !== task.estimatedHours) updates.push(`estimated hours to ${formData.estimatedHours}`)
        if (formData.assignedTo !== task.assignedTo) updates.push(`assignee to ${formData.assignedTo}`)
        if (formData.status !== task.status) updates.push(`status to ${formData.status}`)
        if (formData.dependsOn !== task.dependsOn) updates.push(`dependency to ${formData.dependsOn}`)

        if (updates.length === 0) {
            onCancel?.()
            return
        }

        const command = `Update task "${task.name}" in project "${task.project}" with ${updates.join(', ')}`
        console.log('📝 [TaskEditCard] Updating task:', command)
        onAction?.('submitMessage', command)
    }

    const baseInputStyle = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/20"

    return (
        <div className="rounded-[28px] border border-white/12 bg-white/10 p-6 text-white/90 backdrop-blur-[70px] shadow-[0_45px_140px_rgba(17,0,58,0.55)] max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="text-xs uppercase tracking-wider text-white/50 mb-1">Edit Task</div>
                    <h2 className="text-xl font-semibold text-white">{task.project}</h2>
                </div>
                <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X className="h-5 w-5 text-white/70" />
                </button>
            </div>

            <div className="space-y-4">
                {/* Name */}
                <div>
                    <label className="text-xs text-white/60 mb-1.5 block">Task Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className={baseInputStyle}
                        placeholder="Task name"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="text-xs text-white/60 mb-1.5 block">Description / Notes</label>
                    <textarea
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className={cn(baseInputStyle, "min-h-[80px] resize-none")}
                        placeholder="Add details about this task..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Estimated Hours */}
                    <div>
                        <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Est. Hours
                        </label>
                        <input
                            type="number"
                            value={formData.estimatedHours}
                            onChange={e => setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) })}
                            className={baseInputStyle}
                            min="0"
                            step="0.5"
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Status
                        </label>
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className={baseInputStyle}
                        >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="blocked">Blocked</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Assignee */}
                    <div>
                        <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
                            <User className="h-3 w-3" /> Assignee
                        </label>
                        <select
                            value={formData.assignedTo}
                            onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                            className={baseInputStyle}
                        >
                            <option value="">Unassigned</option>
                            <option value="dhanush">Dhanush</option>
                            <option value="john">John</option>
                            <option value="pannu">Pannu</option>
                            <option value="kutti">Kutti</option>
                            <option value="chotu">Chotu</option>
                            <option value="pinto">Pinto</option>
                        </select>
                    </div>

                    {/* Dependency */}
                    <div>
                        <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Depends On (ID)
                        </label>
                        <input
                            type="text"
                            value={formData.dependsOn}
                            onChange={e => setFormData({ ...formData, dependsOn: e.target.value })}
                            className={baseInputStyle}
                            placeholder="Task ID"
                        />
                    </div>
                </div>
            </div>

            <div className="mt-8 flex gap-3">
                <button
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="flex-1 bg-violet-500 hover:bg-violet-600 text-white py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                    onClick={onCancel}
                    disabled={isSaving}
                    className="px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2.5 rounded-xl font-medium transition-all"
                >
                    Cancel
                </button>
            </div>
        </div>
    )
}
