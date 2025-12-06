'use client'

import React, { useState } from 'react'
import { FileText, Split, X, CheckSquare, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

type Item = {
    id: string
    description: string
    quantity: number
    unit: string
    rate: number
    amount: number
}

type SplitQuotationCardProps = {
    quotationNumber: string
    clientName: string
    projectName?: string
    items: Item[]
    onSubmit: (data: {
        originalQuotationNumber: string
        selectedItemIds: string[]
        splitStrategy: 'create_two_new'
    }) => void
    onCancel?: () => void
}

export default function SplitQuotationCard({
    quotationNumber,
    clientName,
    projectName,
    items,
    onSubmit,
    onCancel,
}: SplitQuotationCardProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const toggleAll = () => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(items.map(i => i.id)))
        }
    }

    const handleSubmit = () => {
        if (selectedIds.size === 0) return
        if (selectedIds.size === items.length) {
            // TODO: Handle "all selected" case - maybe warn user?
            // For now, we allow it, but it effectively duplicates the quotation if we don't cancel the original
        }

        onSubmit({
            originalQuotationNumber: quotationNumber,
            selectedItemIds: Array.from(selectedIds),
            splitStrategy: 'create_two_new',
        })
    }

    const selectedCount = selectedIds.size
    const remainingCount = items.length - selectedCount

    return (
        <div className="w-full rounded-2xl border border-violet-500/30 bg-linear-to-br from-violet-900/20 to-purple-900/20 p-4 shadow-xl backdrop-blur-sm sm:p-6">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Split className="h-5 w-5 text-violet-400" />
                        <h3 className="text-lg font-bold text-white">
                            Split Quotation {quotationNumber}
                        </h3>
                    </div>
                    <p className="mt-1 text-sm text-white/70">
                        Select items to move to a <strong>new quotation</strong>.
                        <br />
                        The remaining items will stay in another new quotation.
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

            {/* Selection Header */}
            <div className="mb-2 flex items-center justify-between px-1">
                <button
                    onClick={toggleAll}
                    className="flex items-center gap-2 text-sm font-medium text-violet-300 hover:text-violet-200"
                >
                    {selectedCount === items.length ? (
                        <>
                            <CheckSquare className="h-4 w-4" /> Deselect All
                        </>
                    ) : (
                        <>
                            <Square className="h-4 w-4" /> Select All
                        </>
                    )}
                </button>
                <span className="text-xs text-white/50">
                    {selectedCount} selected • {remainingCount} remaining
                </span>
            </div>

            {/* Items List */}
            <div className="mb-6 space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                {items.map((item) => {
                    const isSelected = selectedIds.has(item.id)
                    return (
                        <div
                            key={item.id}
                            onClick={() => toggleSelection(item.id)}
                            className={cn(
                                "group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all",
                                isSelected
                                    ? "border-violet-500/50 bg-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                                    : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                            )}
                        >
                            <div className={cn(
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                                isSelected
                                    ? "border-violet-400 bg-violet-500 text-white"
                                    : "border-white/30 bg-transparent group-hover:border-white/50"
                            )}>
                                {isSelected && <CheckSquare className="h-3.5 w-3.5" />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "text-sm font-medium leading-tight",
                                    isSelected ? "text-white" : "text-white/80"
                                )}>
                                    {item.description}
                                </p>
                                <p className="mt-1 text-xs text-white/50">
                                    {item.quantity} {item.unit} × ₹{item.rate.toLocaleString('en-IN')}
                                </p>
                            </div>

                            <div className="text-right">
                                <p className={cn(
                                    "text-sm font-bold",
                                    isSelected ? "text-violet-200" : "text-white/60"
                                )}>
                                    ₹{item.amount.toLocaleString('en-IN')}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Summary & Actions */}
            <div className="space-y-3">
                <div className="rounded-lg bg-black/20 p-3 text-xs text-white/60">
                    <p>
                        <span className="text-violet-300">New Quotation A:</span> {selectedCount} items
                    </p>
                    <p>
                        <span className="text-white/50">New Quotation B:</span> {remainingCount} items
                    </p>
                    <p className="mt-2 text-white/40 italic">
                        Original quotation {quotationNumber} will be marked as split/cancelled.
                    </p>
                </div>

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
                        disabled={selectedCount === 0}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white shadow-lg transition-all",
                            selectedCount > 0
                                ? "bg-linear-to-r from-violet-600 to-purple-600 hover:-translate-y-0.5"
                                : "bg-white/10 text-white/40 cursor-not-allowed"
                        )}
                    >
                        <Split className="h-4 w-4" />
                        Split Quotation
                    </button>
                </div>
            </div>
        </div>
    )
}
