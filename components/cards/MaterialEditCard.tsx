import React, { useState } from 'react'
import { Save, X, Package, Tag, DollarSign, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MaterialEditCardProps {
    material: {
        id: string
        name: string
        unit?: string
        category?: string
        unit_cost?: number
        reorder_level?: number
        notes?: string
        supplier?: string
    }
    onAction?: (action: string, data: any) => void
    onCancel?: () => void
}

export default function MaterialEditCard({ material, onAction, onCancel }: MaterialEditCardProps) {
    const [formData, setFormData] = useState({
        name: material.name,
        unit: material.unit || '',
        category: material.category || '',
        unit_cost: material.unit_cost || 0,
        reorder_level: material.reorder_level || 0,
        notes: material.notes || '',
        supplier: material.supplier || ''
    })

    const [isSaving, setIsSaving] = useState(false)

    const handleSubmit = () => {
        setIsSaving(true)
        // Construct natural language command
        const updates = []
        if (formData.name !== material.name) updates.push(`name to "${formData.name}"`)
        if (formData.unit !== material.unit) updates.push(`unit to "${formData.unit}"`)
        if (formData.category !== material.category) updates.push(`category to "${formData.category}"`)
        if (formData.unit_cost !== material.unit_cost) updates.push(`unit cost to ${formData.unit_cost}`)
        if (formData.reorder_level !== material.reorder_level) updates.push(`reorder level to ${formData.reorder_level}`)
        if (formData.notes !== material.notes) updates.push(`notes to "${formData.notes}"`)
        if (formData.supplier !== material.supplier) updates.push(`supplier to "${formData.supplier}"`)

        if (updates.length === 0) {
            onCancel?.()
            return
        }

        const command = `Update material "${material.name}" with ${updates.join(', ')}`
        console.log('📝 [MaterialEditCard] Updating material:', command)
        onAction?.('submitMessage', command)
    }

    const baseInputStyle = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/20"

    return (
        <div className="rounded-[28px] border border-white/12 bg-white/10 p-6 text-white/90 backdrop-blur-[70px] shadow-[0_45px_140px_rgba(17,0,58,0.55)] max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="text-xs uppercase tracking-wider text-white/50 mb-1">Edit Material</div>
                    <h2 className="text-xl font-semibold text-white">{material.name}</h2>
                </div>
                <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X className="h-5 w-5 text-white/70" />
                </button>
            </div>

            <div className="space-y-4">
                {/* Name */}
                <div>
                    <label className="text-xs text-white/60 mb-1.5 block">Material Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className={baseInputStyle}
                        placeholder="Material name"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Category */}
                    <div>
                        <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
                            <Tag className="h-3 w-3" /> Category
                        </label>
                        <input
                            type="text"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                            className={baseInputStyle}
                            placeholder="e.g. Raw Material"
                        />
                    </div>

                    {/* Unit */}
                    <div>
                        <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
                            <Package className="h-3 w-3" /> Unit
                        </label>
                        <input
                            type="text"
                            value={formData.unit}
                            onChange={e => setFormData({ ...formData, unit: e.target.value })}
                            className={baseInputStyle}
                            placeholder="e.g. kg, pcs"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Unit Cost */}
                    <div>
                        <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> Unit Cost
                        </label>
                        <input
                            type="number"
                            value={formData.unit_cost}
                            onChange={e => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) })}
                            className={baseInputStyle}
                            min="0"
                            step="0.01"
                        />
                    </div>

                    {/* Reorder Level */}
                    <div>
                        <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Reorder Level
                        </label>
                        <input
                            type="number"
                            value={formData.reorder_level}
                            onChange={e => setFormData({ ...formData, reorder_level: parseFloat(e.target.value) })}
                            className={baseInputStyle}
                            min="0"
                        />
                    </div>
                </div>

                {/* Supplier */}
                <div>
                    <label className="text-xs text-white/60 mb-1.5 block">Supplier</label>
                    <input
                        type="text"
                        value={formData.supplier}
                        onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                        className={baseInputStyle}
                        placeholder="Supplier name"
                    />
                </div>

                {/* Notes */}
                <div>
                    <label className="text-xs text-white/60 mb-1.5 block">Notes</label>
                    <textarea
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        className={cn(baseInputStyle, "min-h-[80px] resize-none")}
                        placeholder="Additional notes..."
                    />
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
