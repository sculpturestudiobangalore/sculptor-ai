'use client'

import React, { useState } from 'react'
import { FileText, Plus, X, Save } from 'lucide-react'

type Item = {
    name: string
    description: string
    material?: string
    size?: string
    estimatedWeight?: number
    finish?: string
    optionType?: string
    quantity: number
    unit: string
    rate: number
    notes?: string
    hsnSacCode?: string
}

type InvoiceFormCardProps = {
    clientName: string
    projectName?: string
    invoiceNumber: string
    initialData: {
        items: Item[]
        notes?: string
        issueDate?: string
        dueDate?: string
        applyGST?: boolean
        advancePaid?: number
    }
    onSubmit: (data: {
        invoiceNumber: string
        items: Item[]
        notes?: string
        issueDate: string
        dueDate: string
        applyGST: boolean
        advancePaid: number
    }) => void
    onCancel?: () => void
}


export default function InvoiceFormCard({
    clientName,
    projectName,
    invoiceNumber,
    initialData,
    onSubmit,
    onCancel,
}: InvoiceFormCardProps) {
    const [items, setItems] = useState<Item[]>(initialData.items)
    const [notes, setNotes] = useState(initialData.notes || '')
    const [issueDate, setIssueDate] = useState(
        initialData.issueDate || new Date().toISOString().split('T')[0]
    )
    const [dueDate, setDueDate] = useState(
        initialData.dueDate || new Date().toISOString().split('T')[0]
    )
    const [applyGST, setApplyGST] = useState(initialData.applyGST || false)
    const [advancePaid, setAdvancePaid] = useState(initialData.advancePaid || 0)

    const gstRate = 18 // Default GST rate
    const effectiveGstRate = gstRate

    const addItem = () =>
        setItems([
            ...items,
            {
                name: '',
                description: '',
                material: '',
                size: '',
                estimatedWeight: undefined,
                finish: '',
                optionType: '',
                quantity: 1,
                unit: 'nos',
                rate: 0,
                notes: '',
                hsnSacCode: '',
            },
        ])

    const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))

    const updateItem = (i: number, field: keyof Item, value: any) => {
        const newItems = [...items]
        newItems[i] = { ...newItems[i], [field]: value }
        setItems(newItems)
    }

    // Prefer weight × rate; fall back to quantity × rate
    const getLineBase = (item: Item) => {
        if (item.estimatedWeight && item.estimatedWeight > 0) {
            return item.estimatedWeight
        }
        return item.quantity
    }

    const getLineAmount = (item: Item) => {
        const base = getLineBase(item)
        return base * item.rate
    }

    const subtotal = items.reduce((sum, item) => sum + getLineAmount(item), 0)
    const gstAmount = applyGST ? (subtotal * effectiveGstRate) / 100 : 0
    const total = subtotal + gstAmount

    const balanceDue = total - advancePaid

    const handleSubmit = () => {
        console.log('🧾 [Form] Update Invoice clicked', {
            invoiceNumber,
            itemsCount: items.length,
        })

        onSubmit({
            invoiceNumber,
            items,
            notes: notes.trim() || undefined,
            issueDate,
            dueDate,
            applyGST,
            advancePaid,
        })
    }


    return (
        <div className="w-full rounded-2xl border border-violet-500/30 bg-linear-to-br from-violet-900/20 to-purple-900/20 p-4 shadow-xl backdrop-blur-sm sm:p-6">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-violet-400" />
                        <h3 className="text-lg font-bold text-white">
                            Edit Invoice {invoiceNumber}
                        </h3>
                    </div>
                    <p className="mt-1 text-sm text-white/70">
                        Client:{' '}
                        <span className="font-semibold text-white">{clientName}</span>
                        {projectName && (
                            <>
                                {' '}
                                • Project:{' '}
                                <span className="font-semibold text-white">{projectName}</span>
                            </>
                        )}
                    </p>
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

            {/* Items */}
            <div className="mb-4 space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-white">Line Items</label>
                    <button
                        onClick={addItem}
                        className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-violet-500"
                    >
                        <Plus className="h-3 w-3" />
                        Add Item
                    </button>
                </div>

                {items.map((item, idx) => {
                    const lineBase = getLineBase(item)
                    const lineAmount = getLineAmount(item)

                    const basisText =
                        item.estimatedWeight && item.estimatedWeight > 0
                            ? `${item.estimatedWeight} kg @ ₹${item.rate.toLocaleString(
                                'en-IN',
                            )} per kg`
                            : `${item.quantity} ${item.unit} @ ₹${item.rate.toLocaleString(
                                'en-IN',
                            )} per ${item.unit}`

                    return (
                        <div
                            key={idx}
                            className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <input
                                    type="text"
                                    placeholder="Item name (e.g. Deer Sculpture)"
                                    value={item.name}
                                    onChange={(e) => updateItem(idx, 'name', e.target.value)}
                                    className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-violet-400"
                                />
                                <input
                                    type="text"
                                    placeholder="Material (Brass/FRP)"
                                    value={item.material ?? ''}
                                    onChange={(e) =>
                                        updateItem(idx, 'material', e.target.value)
                                    }
                                    className="w-36 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-violet-400"
                                />
                                {items.length > 1 && (
                                    <button
                                        onClick={() => removeItem(idx)}
                                        className="rounded-lg p-2 text-white/60 transition-colors hover:bg-red-500/20 hover:text-red-400"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            <input
                                type="text"
                                placeholder="Description/specifications"
                                value={item.description}
                                onChange={(e) =>
                                    updateItem(idx, 'description', e.target.value)
                                }
                                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-violet-400 mb-2"
                            />

                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <input
                                    type="text"
                                    placeholder="Size (e.g. 5 ft)"
                                    value={item.size ?? ''}
                                    onChange={(e) => updateItem(idx, 'size', e.target.value)}
                                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-violet-400"
                                />
                                <input
                                    type="number"
                                    placeholder="Est. Weight (kg)"
                                    value={item.estimatedWeight ?? ''}
                                    onChange={(e) =>
                                        updateItem(
                                            idx,
                                            'estimatedWeight',
                                            e.target.value ? parseFloat(e.target.value) : undefined,
                                        )
                                    }
                                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-violet-400"
                                />
                                <input
                                    type="text"
                                    placeholder="Finish (Antique/Glossy)"
                                    value={item.finish ?? ''}
                                    onChange={(e) => updateItem(idx, 'finish', e.target.value)}
                                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-violet-400"
                                />
                                <input
                                    type="text"
                                    placeholder="Option type (Brass/FRP)"
                                    value={item.optionType ?? ''}
                                    onChange={(e) =>
                                        updateItem(idx, 'optionType', e.target.value)
                                    }
                                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-violet-400"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mt-2">
                                <input
                                    type="number"
                                    placeholder="Qty"
                                    value={item.quantity}
                                    onChange={(e) =>
                                        updateItem(
                                            idx,
                                            'quantity',
                                            e.target.value ? parseFloat(e.target.value) : 0,
                                        )
                                    }
                                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-violet-400"
                                />
                                <input
                                    type="text"
                                    placeholder="Unit"
                                    value={item.unit}
                                    onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-violet-400"
                                />
                                <input
                                    type="number"
                                    placeholder="Rate"
                                    value={item.rate}
                                    onChange={(e) =>
                                        updateItem(
                                            idx,
                                            'rate',
                                            e.target.value ? parseFloat(e.target.value) : 0,
                                        )
                                    }
                                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-violet-400"
                                />
                                <input
                                    type="text"
                                    placeholder="HSN/SAC (optional)"
                                    value={item.hsnSacCode ?? ''}
                                    onChange={(e) =>
                                        updateItem(idx, 'hsnSacCode', e.target.value)
                                    }
                                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-violet-400"
                                />
                            </div>

                            <textarea
                                placeholder="Item notes, maintenance, warranty etc."
                                value={item.notes ?? ''}
                                onChange={(e) => updateItem(idx, 'notes', e.target.value)}
                                className="w-full mt-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-violet-400"
                            />

                            <div className="mt-1 text-right text-xs text-white/70">
                                Line total: ₹{lineAmount.toLocaleString('en-IN')}{' '}
                                {lineBase > 0 && item.rate > 0 && (
                                    <span className="text-white/50">({basisText})</span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Invoice Notes */}
            <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-white">
                    Invoice Notes
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Payment terms, delivery instructions, etc."
                    rows={2}
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-violet-400"
                />
            </div>

            {/* Invoice Options */}
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div>
                    <label className="mb-1 block text-sm font-medium text-white">
                        Issue Date
                    </label>
                    <input
                        type="date"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-white">
                        Due Date
                    </label>
                    <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-white">
                        Advance Paid
                    </label>
                    <input
                        type="number"
                        value={advancePaid}
                        onChange={(e) => setAdvancePaid(e.target.value ? parseFloat(e.target.value) : 0)}
                        placeholder="0"
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
                    />
                </div>
            </div>
            <div className="mb-4">
                <label className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 cursor-pointer hover:bg-white/15">
                    <input
                        type="checkbox"
                        checked={applyGST}
                        onChange={(e) => setApplyGST(e.target.checked)}
                        className="h-4 w-4 rounded border-white/30 bg-white/10 text-violet-600 focus:ring-2 focus:ring-violet-400"
                    />
                    <span className="text-sm font-medium text-white">
                        Apply GST ({effectiveGstRate}%)
                    </span>
                </label>
            </div>

            {/* Summary */}
            <div className="mb-4 rounded-xl border border-violet-500/30 bg-violet-900/20 p-3">
                <div className="flex justify-between text-sm text-white/70">
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {applyGST && effectiveGstRate > 0 && (
                    <div className="flex justify-between text-sm text-white/70">
                        <span>GST ({effectiveGstRate}%):</span>
                        <span>₹{gstAmount.toLocaleString('en-IN')}</span>
                    </div>
                )}
                <div className="flex justify-between border-t border-white/20 pt-2 text-base font-bold text-white">
                    <span>Total Amount:</span>
                    <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
                {advancePaid > 0 && (
                    <div className="flex justify-between text-sm text-white/70 mt-1">
                        <span>Advance Paid:</span>
                        <span>- ₹{advancePaid.toLocaleString('en-IN')}</span>
                    </div>
                )}
                <div className="mt-2 flex justify-between border-t border-white/20 pt-2 text-lg font-bold text-green-400">
                    <span>Balance Due:</span>
                    <span>₹{balanceDue.toLocaleString('en-IN')}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
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
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-linear-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
                >
                    <Save className="h-4 w-4" />
                    Update Invoice
                </button>
            </div>
        </div>
    )
}
