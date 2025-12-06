'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { FileText, Save, X } from 'lucide-react'

interface Client {
    id: string
    name: string
    email?: string
    phone?: string
    company?: string
}

interface Quotation {
    id: string
    quotation_number: string
    client_id: string
    client_name?: string
    total_amount: number
    status?: string
}

interface Task {
    id?: string
    name: string
    status: string
    estimatedHours?: number | null
    actualHours?: number | null
    sequenceOrder?: number | null
}

interface Material {
    id?: string
    name?: string
    quantity?: number | null
    unit?: string | null
    unitCost?: number | null
}

type ProjectFormCardProps = {
    // Data for dropdowns (for new project mode)
    clients?: Client[]
    quotations?: Quotation[]
    prefillClientName?: string

    // For existing project edit mode
    project?: {
        id?: string
        name: string
        clientName?: string
        clientId?: string
        quotationId?: string
        description?: string | null
        status?: string | null
        projectType?: string | null
        budget?: number | null
        deadline?: string | null
        priority?: string | null
    }

    // Task and Material management
    existingTasks?: Task[]
    existingMaterials?: Material[]

    isEdit?: boolean
    onClientChange?: (clientId: string) => void
    onQuotationChange?: (quotationId: string) => void
    onSubmit: (data: {
        projectId?: string
        clientId: string
        quotationId?: string
        name: string
        description?: string
        status?: string
        projectType?: string
        budget?: number
        deadline?: string
        priority?: string
        tasks?: Task[]
        materials?: Material[]
    }) => void
    onCancel?: () => void
}

export default function ProjectFormCard({
    clients = [],
    quotations = [],
    project,
    isEdit = false,
    existingTasks = [],
    existingMaterials = [],
    onClientChange,
    onQuotationChange,
    onSubmit,
    onCancel,
    prefillClientName,
}: ProjectFormCardProps) {
    // Client and Quotation selection
    const [selectedClientId, setSelectedClientId] = useState(() => {
        if (project?.clientId) return project.clientId
        if (prefillClientName && clients.length > 0) {
            const match = clients.find(c => c.name.toLowerCase().includes(prefillClientName.toLowerCase()))
            return match ? match.id : ''
        }
        return ''
    })
    const [selectedQuotationId, setSelectedQuotationId] = useState(project?.quotationId || '')

    // Use useMemo instead of useEffect to prevent infinite loops
    const filteredQuotations = useMemo(() => {
        if (selectedClientId) {
            return quotations.filter(q => q.client_id === selectedClientId)
        }
        return []
    }, [selectedClientId, quotations])

    // Form fields
    const [name, setName] = useState(project?.name || '')
    const [description, setDescription] = useState(project?.description || '')
    const [status, setStatus] = useState(project?.status || 'draft')
    const [projectType, setProjectType] = useState(project?.projectType || '3D')
    const [budget, setBudget] = useState(project?.budget || 0)
    const [deadline, setDeadline] = useState(project?.deadline || '')
    const [priority, setPriority] = useState(project?.priority || 'medium')

    // Task and Material state management
    const [tasks, setTasks] = useState<Task[]>(existingTasks)
    const [materials, setMaterials] = useState<Material[]>(existingMaterials)

    // Task management functions
    const addTask = () => {
        const newTask: Task = {
            id: `temp-${Date.now()}`,
            name: '',
            status: 'pending',
            sequenceOrder: tasks.length + 1
        }
        setTasks([...tasks, newTask])
    }

    const removeTask = (taskId: string) => {
        setTasks(tasks.filter(t => t.id !== taskId))
    }

    const updateTask = (taskId: string, field: keyof Task, value: any) => {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t))
    }

    // Material management functions
    const addMaterial = () => {
        const newMaterial: Material = {
            id: `temp-${Date.now()}`,
            name: '',
            quantity: 0,
            unit: 'kg'
        }
        setMaterials([...materials, newMaterial])
    }

    const removeMaterial = (materialId: string) => {
        setMaterials(materials.filter(m => m.id !== materialId))
    }

    const updateMaterial = (materialId: string, field: keyof Material, value: any) => {
        setMaterials(materials.map(m => m.id === materialId ? { ...m, [field]: value } : m))
    }

    // Handle client selection
    const handleClientChange = (clientId: string) => {
        setSelectedClientId(clientId)
        setSelectedQuotationId('') // Reset quotation when client changes
        if (onClientChange) {
            onClientChange(clientId)
        }
    }

    // Handle quotation selection
    const handleQuotationChange = (quotationId: string) => {
        setSelectedQuotationId(quotationId)

        // Find the selected quotation and prepopulate form
        const selectedQuotation = quotations.find(q => q.id === quotationId)
        if (selectedQuotation) {
            // Prepopulate budget from quotation total
            setBudget(selectedQuotation.total_amount)

            // Suggest a project name if empty
            if (!name) {
                setName(`Project for ${selectedQuotation.quotation_number}`)
            }
        }

        if (onQuotationChange) {
            onQuotationChange(quotationId)
        }
    }

    const handleSubmit = () => {
        if (!selectedClientId) {
            alert('Please select a client')
            return
        }

        if (!name.trim()) {
            alert('Please enter a project name')
            return
        }

        onSubmit({
            projectId: project?.id,
            clientId: selectedClientId,
            quotationId: selectedQuotationId || undefined,
            name,
            description,
            status,
            projectType,
            budget,
            deadline: deadline || undefined,
            priority,
            tasks: tasks.map(t => ({
                ...t,
                id: t.id?.startsWith('temp-') ? undefined : t.id
            })),
            materials: materials.map(m => ({
                ...m,
                id: m.id?.startsWith('temp-') ? undefined : m.id
            })),
        })
    }

    const selectedClient = clients.find(c => c.id === selectedClientId)

    return (
        <div className="w-full rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-900/20 to-purple-900/20 p-4 shadow-xl backdrop-blur-sm sm:p-6">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-violet-400" />
                        <h3 className="text-lg font-bold text-white">
                            {isEdit ? 'Edit Project Details' : 'Create New Project'}
                        </h3>
                    </div>
                    {(selectedClient || project?.clientName) && (
                        <p className="mt-1 text-sm text-white/70">
                            Client: <span className="font-semibold text-white">{selectedClient?.name || project?.clientName}</span>
                        </p>
                    )}
                </div>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="rounded-lg p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
                {/* Client Selection (only for new projects) */}
                {!isEdit && clients.length > 0 && (
                    <div>
                        <label className="mb-1 block text-sm font-medium text-white">
                            Select Client <span className="text-red-400">*</span>
                        </label>
                        <select
                            value={selectedClientId}
                            onChange={(e) => handleClientChange(e.target.value)}
                            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-violet-400 [&>option]:bg-slate-800"
                        >
                            <option value="">-- Select a client --</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.name} {client.company ? `(${client.company})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Quotation Selection (only if client is selected) */}
                {!isEdit && selectedClientId && (
                    <div>
                        <label className="mb-1 block text-sm font-medium text-white">
                            Link to Quotation (Optional)
                        </label>
                        <select
                            value={selectedQuotationId}
                            onChange={(e) => handleQuotationChange(e.target.value)}
                            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-violet-400 [&>option]:bg-slate-800"
                        >
                            <option value="">-- No quotation --</option>
                            {filteredQuotations.map((q) => (
                                <option key={q.id} value={q.id}>
                                    {q.quotation_number} - ₹{q.total_amount.toLocaleString()} ({q.status})
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-white/50">
                            Selecting a quotation will prepopulate the budget
                        </p>
                    </div>
                )}

                {/* Project Name */}
                <div>
                    <label className="mb-1 block text-sm font-medium text-white">
                        Project Name <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-violet-400"
                        placeholder="Enter project name"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="mb-1 block text-sm font-medium text-white">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-violet-400"
                        placeholder="Project description and notes..."
                        rows={3}
                    />
                </div>

                {/* Grid for other fields */}
                <div className="grid gap-4 sm:grid-cols-2">
                    {/* Project Type */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-white">Project Type</label>
                        <select
                            value={projectType}
                            onChange={(e) => setProjectType(e.target.value)}
                            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-violet-400 [&>option]:bg-slate-800"
                        >
                            <option value="3D">3D Project</option>
                            <option value="2D">2D Project</option>
                            <option value="OTHERS">Others</option>
                        </select>
                        <p className="mt-1 text-xs text-white/50">
                            *Tasks will auto-populate based on type
                        </p>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-white">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-violet-400 [&>option]:bg-slate-800"
                        >
                            <option value="draft">Draft</option>
                            <option value="quoted">Quoted</option>
                            <option value="waiting_approval">Waiting Approval</option>
                            <option value="in_progress">In Progress</option>
                            <option value="invoiced">Invoiced</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-white">Priority</label>
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-violet-400 [&>option]:bg-slate-800"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>

                    {/* Budget */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-white">Budget (₹)</label>
                        <input
                            type="number"
                            value={budget}
                            onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-violet-400"
                        />
                    </div>

                    {/* Deadline */}
                    <div className="sm:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-white">Deadline</label>
                        <input
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-violet-400"
                        />
                    </div>
                </div>
            </div>

            {/* Task Management Section (only in edit mode) */}
            {isEdit && (
                <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between">
                        <label className="text-sm font-medium text-white">Tasks</label>
                        <button
                            type="button"
                            onClick={addTask}
                            className="rounded-lg bg-violet-500/20 px-3 py-1 text-xs text-violet-300 hover:bg-violet-500/30 transition-colors"
                        >
                            + Add Task
                        </button>
                    </div>
                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-3">
                        {tasks.length === 0 ? (
                            <p className="text-center text-sm text-white/50">No tasks yet</p>
                        ) : (
                            tasks.map((task) => (
                                <div key={task.id} className="flex items-center gap-2 rounded border border-white/10 bg-white/5 p-2">
                                    <input
                                        type="text"
                                        value={task.name}
                                        onChange={(e) => updateTask(task.id!, 'name', e.target.value)}
                                        placeholder="Task name"
                                        className="flex-1 rounded bg-white/10 px-2 py-1 text-sm text-white placeholder-white/40 outline-none"
                                    />
                                    <select
                                        value={task.status}
                                        onChange={(e) => updateTask(task.id!, 'status', e.target.value)}
                                        className="rounded bg-white/10 px-2 py-1 text-xs text-white outline-none"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                        <option value="blocked">Blocked</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => removeTask(task.id!)}
                                        className="rounded bg-rose-500/20 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/30 transition-colors"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Material Management Section (only in edit mode) */}
            {isEdit && (
                <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between">
                        <label className="text-sm font-medium text-white">Materials</label>
                        <button
                            type="button"
                            onClick={addMaterial}
                            className="rounded-lg bg-violet-500/20 px-3 py-1 text-xs text-violet-300 hover:bg-violet-500/30 transition-colors"
                        >
                            + Add Material
                        </button>
                    </div>
                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-3">
                        {materials.length === 0 ? (
                            <p className="text-center text-sm text-white/50">No materials yet</p>
                        ) : (
                            materials.map((material) => (
                                <div key={material.id} className="flex items-center gap-2 rounded border border-white/10 bg-white/5 p-2">
                                    <input
                                        type="text"
                                        value={material.name || ''}
                                        onChange={(e) => updateMaterial(material.id!, 'name', e.target.value)}
                                        placeholder="Material name"
                                        className="flex-1 rounded bg-white/10 px-2 py-1 text-sm text-white placeholder-white/40 outline-none"
                                    />
                                    <input
                                        type="number"
                                        value={material.quantity || 0}
                                        onChange={(e) => updateMaterial(material.id!, 'quantity', parseFloat(e.target.value) || 0)}
                                        placeholder="Qty"
                                        className="w-20 rounded bg-white/10 px-2 py-1 text-sm text-white placeholder-white/40 outline-none"
                                    />
                                    <select
                                        value={material.unit || 'kg'}
                                        onChange={(e) => updateMaterial(material.id!, 'unit', e.target.value)}
                                        className="w-16 rounded bg-white/10 px-2 py-1 text-xs text-white outline-none"
                                    >
                                        <option value="kg">kg</option>
                                        <option value="g">g</option>
                                        <option value="L">L</option>
                                        <option value="m">m</option>
                                        <option value="pcs">pcs</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => removeMaterial(material.id!)}
                                        className="rounded bg-rose-500/20 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/30 transition-colors"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-2">
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
                    >
                        Cancel
                    </button>
                )}
                <button
                    onClick={handleSubmit}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
                >
                    <Save className="h-4 w-4" />
                    {isEdit ? 'Save Changes' : 'Create Project'}
                </button>
            </div>
        </div>
    )
}
