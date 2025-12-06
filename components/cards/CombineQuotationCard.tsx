'use client'

import React from 'react'
import { Merge, X, FileText, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type QuotationSummary = {
    quotationNumber: string
    totalAmount: string
    itemCount: number
    date: string
}

type CombineQuotationCardProps = {
    quotations: QuotationSummary[]
    clientName: string
    projectName?: string
    previewTotal: string
    onSubmit: (data: {
        quotationNumbers: string[]
    }) => void
    onCancel?: () => void
}

export default function CombineQuotationCard({
    quotations,
    clientName,
    projectName,
    previewTotal,
    onSubmit,
    onCancel,
}: CombineQuotationCardProps) {
    const handleSubmit = () => {
        onSubmit({
            quotationNumbers: quotations.map(q => q.quotationNumber)
        })
    }

    return (
        <div className="w-full rounded-2xl border border-violet-500/30 bg-linear-to-br from-violet-900/20 to-purple-900/20 p-4 shadow-xl backdrop-blur-sm sm:p-6">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Merge className="h-5 w-5 text-violet-400" />
                        <h3 className="text-lg font-bold text-white">
                            Combine Quotations
                        </h3>
                    </div>
                    <p className="mt-1 text-sm text-white/70">
                        Merge {quotations.length} quotations into a single new quotation.
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

            {/* Client/Project Info */}
            <div className="mb-4 rounded-lg bg-white/5 p-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-white/60">Client:</span>
                    <span className="font-medium text-white">{clientName}</span>
                </div>
                {projectName && (
                    <div className="mt-1 flex justify-between">
                        <span className="text-white/60">Project:</span>
                        <span className="font-medium text-white">{projectName}</span>
                    </div>
                )}
            </div>

            {/* Quotations List */}
            <div className="mb-6 space-y-2">
                {quotations.map((q) => (
                    <div
                        key={q.quotationNumber}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-300">
                                <FileText className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-white">{q.quotationNumber}</div>
                                <div className="text-xs text-white/50">{q.itemCount} items • {q.date}</div>
                            </div>
                        </div>
                        <div className="text-sm font-bold text-white/80">
                            {q.totalAmount}
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary Arrow */}
            <div className="mb-6 flex justify-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/40">
                    <ArrowRight className="h-4 w-4 rotate-90" />
                </div>
            </div>

            {/* New Quotation Preview */}
            <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-200">New Combined Total</span>
                    <span className="text-lg font-bold text-emerald-100">{previewTotal}</span>
                </div>
                <p className="mt-2 text-xs text-emerald-200/60 text-center">
                    A new quotation will be created containing all items from the above quotations.
                    The original quotations will be marked as merged/cancelled.
                </p>
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
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-linear-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
                >
                    <Merge className="h-4 w-4" />
                    Confirm Merge
                </button>
            </div>
        </div>
    )
}
