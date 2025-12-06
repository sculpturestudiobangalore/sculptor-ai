import React from 'react'
import { cn } from '@/lib/utils'
import { SectionHeader } from '@/components/ui/GlassCard'
import ReportGeneratorCard from '../cards/ReportGeneratorCard'
import ReportResultCard from '../cards/ReportResultCard'

interface ReportRendererProps {
    toolName: string
    result: any
    onAction?: (action: string, data: any) => void
}

export function ReportRenderer({ toolName, result, onAction }: ReportRendererProps) {
    const baseCardStyle =
        'rounded-[28px] border border-white/12 bg-white/10 p-6 text-white/90 backdrop-blur-[70px] shadow-[0_45px_140px_rgba(17,0,58,0.55)]'

    if (toolName === 'showReportGeneratorTool') {
        const o = result as {
            success: boolean
            showReportGeneratorUI: boolean
            clients: any[]
            error?: string
        }

        if (!o?.success || !o?.showReportGeneratorUI) {
            return null
        }

        return (
            <ReportGeneratorCard
                clients={o.clients}
                onAction={onAction}
                onCancel={() => {
                    console.log('[ToolCard] Report generator cancelled')
                }}
            />
        )
    }

    if (toolName === 'generateReportTool') {
        const o = result as {
            success: boolean
            reportType: string
            dateRange: { startDate: string; endDate: string }
            gstFilter: string
            data: any
            summary: any
            error?: string
        }

        if (!o?.success) {
            return (
                <div className={cn(baseCardStyle, 'border-rose-400/30 bg-rose-500/10 text-rose-100')}>
                    <SectionHeader eyebrow="Report" title="Failed to generate report" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </div>
            )
        }

        return (
            <ReportResultCard
                reportType={o.reportType}
                dateRange={o.dateRange}
                gstFilter={o.gstFilter}
                data={o.data}
                summary={o.summary}
                onAction={onAction}
            />
        )
    }

    return null
}
