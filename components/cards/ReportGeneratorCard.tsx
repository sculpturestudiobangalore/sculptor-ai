'use client'

import React, { useState } from 'react'
import { FileText, Calendar, Download, Printer, Filter, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Client = {
    id: string
    name: string
}

type ReportGeneratorCardProps = {
    clients: Client[]
    onAction?: (action: string, data: any) => void
    onCancel?: () => void
}

export default function ReportGeneratorCard({
    clients,
    onAction,
    onCancel,
}: ReportGeneratorCardProps) {
    const [reportType, setReportType] = useState<string>('gst')
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [clientId, setClientId] = useState<string>('')
    const [gstFilter, setGstFilter] = useState<string>('all')
    const [loading, setLoading] = useState(false)
    const [reportResult, setReportResult] = useState<any>(null)

    const handleGenerate = async () => {
        setLoading(true)
        setReportResult(null)

        // Simulate tool call by using onAction to request data
        // Ideally, this component would receive the data back via props or a callback if managed by parent.
        // However, since tool-card usually renders based on tool output, we might need a way to fetch data *within* the card 
        // or trigger a new tool call that returns the data to *this* card.
        // BUT, the standard pattern here is: User clicks Generate -> AI Tool runs -> Returns Data -> AI shows *new* card with data?
        // OR, we can use a server action or direct fetch if we had it.
        // Since we are in "AI Tool Mode", let's assume we trigger the 'generateReportTool' via onAction, 
        // and the AI will respond with a NEW card containing the data? 
        // NO, that disrupts the flow. We want an interactive card.

        // WORKAROUND: We will trigger the tool, but we can't easily get the data back *into this specific instance* 
        // unless the tool output *updates* this card.
        // Actually, 'generateReportTool' returns the data. If we call it via onAction('generateReportTool', ...), 
        // the system might treat it as a new tool call.

        // Let's assume for this interactive card, we want to use `onAction` to send a message to the AI 
        // to generate the report, and the AI will likely display the result in a *new* message/card.
        // This is the safest pattern for now.

        // WAIT, the user wants an "Interactive Report Tool Card".
        // If I send a message, it scrolls.
        // If I want to update *this* card, I need to handle the response.
        // Given the constraints, I will send a message to the AI: "Generate GST report from X to Y..."
        // The AI will then run `generateReportTool` and show the result.
        // BUT, `generateReportTool` returns raw JSON. We need a way to display it nicely.
        // Maybe `generateReportTool` should return a `ShowReportResultCard`?

        // Let's stick to the plan: This card is for *configuration*.
        // When user clicks Generate, we send a command.
        // The AI runs `generateReportTool`.
        // We need a way to *display* the result.
        // I should probably update `tool-card.tsx` to handle `generateReportTool` output and show a `ReportResultCard`.
        // OR, `ReportGeneratorCard` can be the result card too if we pass data to it?

        // Let's make this card handle both: Input and Result (if passed).
        // But since we can't easily update props of an existing rendered card from a new tool call (it creates a new block),
        // the flow will be:
        // 1. User sees Generator Card (Inputs).
        // 2. User clicks Generate.
        // 3. Message sent to AI.
        // 4. AI runs tool.
        // 5. AI shows Result Card (with Download buttons).

        const command = `Generate ${reportType} report from ${startDate} to ${endDate}. Filter: ${gstFilter}. ${clientId ? `Client: ${clients.find(c => c.id === clientId)?.name}` : ''}`
        onAction?.('submitMessage', command)
        setLoading(false)
    }

    return (
        <div className="w-full rounded-2xl border border-violet-500/30 bg-linear-to-br from-violet-900/20 to-purple-900/20 p-4 shadow-xl backdrop-blur-sm sm:p-6">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-violet-400" />
                        <h3 className="text-lg font-bold text-white">Report Generator</h3>
                    </div>
                    <p className="mt-1 text-sm text-white/70">
                        Select parameters to generate business reports.
                    </p>
                </div>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="rounded-lg p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <Filter className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Controls */}
            <div className="grid gap-4 sm:grid-cols-2">
                {/* Report Type */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/60">Report Type</label>
                    <div className="relative">
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-500/50"
                        >
                            <option value="gst" className="bg-slate-900">GST Report (GSTR-1)</option>
                            <option value="profitability" className="bg-slate-900">Project Profitability</option>
                            <option value="performance" className="bg-slate-900">Company Performance</option>
                            <option value="client_statement" className="bg-slate-900">Client Statement</option>
                            <option value="material_usage" className="bg-slate-900">Material Usage</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-white/40" />
                    </div>
                </div>

                {/* GST Filter */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/60">Transactions Filter</label>
                    <div className="relative">
                        <select
                            value={gstFilter}
                            onChange={(e) => setGstFilter(e.target.value)}
                            className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-500/50"
                        >
                            <option value="all" className="bg-slate-900">All Transactions</option>
                            <option value="gst_only" className="bg-slate-900">GST Only (For CA)</option>
                            <option value="non_gst_only" className="bg-slate-900">Non-GST Only</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-white/40" />
                    </div>
                </div>

                {/* Date Range */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/60">Start Date</label>
                    <div className="relative">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-500/50 [color-scheme:dark]"
                        />
                        <Calendar className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-white/40" />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/60">End Date</label>
                    <div className="relative">
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-500/50 [color-scheme:dark]"
                        />
                        <Calendar className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-white/40" />
                    </div>
                </div>

                {/* Client Selector (Conditional) */}
                {reportType === 'client_statement' && (
                    <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-medium text-white/60">Client</label>
                        <div className="relative">
                            <select
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-500/50"
                            >
                                <option value="" className="bg-slate-900">Select Client</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-white/40" />
                        </div>
                    </div>
                )}
            </div>

            {/* Action Button */}
            <div className="mt-6">
                <button
                    onClick={handleGenerate}
                    disabled={loading || (reportType === 'client_statement' && !clientId)}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg transition-all",
                        loading || (reportType === 'client_statement' && !clientId)
                            ? "bg-white/10 text-white/40 cursor-not-allowed"
                            : "bg-linear-to-r from-violet-600 to-purple-600 hover:-translate-y-0.5 hover:shadow-violet-500/25"
                    )}
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                        </>
                    ) : (
                        <>
                            <FileText className="h-4 w-4" /> Generate Report
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
