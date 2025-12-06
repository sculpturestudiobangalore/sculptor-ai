import React from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import CompanySettingsFormCard from '@/components/cards/CompanySettingsFormCard'

const SectionHeader = ({
    eyebrow,
    title,
}: {
    eyebrow: string
    title: string
}) => (
    <div>
        <p className="text-xs uppercase tracking-[0.35em] text-white/45">{eyebrow}</p>
        <h3 className="text-xl font-semibold text-white sm:text-2xl">{title}</h3>
    </div>
)

interface CompanySettingsRendererProps {
    toolName: string
    result: any
    onAction?: (action: string, data: any) => void
}

export function CompanySettingsRenderer({
    toolName,
    result,
    onAction
}: CompanySettingsRendererProps) {
    if (toolName === 'showCompanySettingsFormTool') {
        const o = result as {
            success: boolean
            showForm?: boolean
            settings?: any
            error?: string
        }

        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Company Settings" title="Failed to load settings" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }

        if (o.showForm && o.settings) {
            return (
                <GlassCard>
                    <CompanySettingsFormCard
                        initialSettings={o.settings}
                        onSubmit={(settings) => {
                            const message = `Call updateCompanySettingsTool with these settings: ${JSON.stringify(settings)}. Do not ask for confirmation, execute immediately.`
                            onAction?.('submitMessage', message)
                        }}
                        onCancel={() => {
                            onAction?.('submitMessage', 'Cancelled company settings update')
                        }}
                    />
                </GlassCard>
            )
        }
    }

    if (toolName === 'updateCompanySettingsTool') {
        const o = result as {
            success: boolean
            message?: string
            settings?: any
            error?: string
        }

        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Company Settings" title="Update failed" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }

        return (
            <GlassCard className="border-emerald-400/30 bg-emerald-500/10">
                <SectionHeader eyebrow="Company Settings" title="Settings Updated" />
                <p className="mt-2 text-sm text-emerald-100/80">{o.message}</p>
                {o.settings && (
                    <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-white/60">Business Name:</span>
                            <span className="font-medium text-white">{o.settings.businessName}</span>
                        </div>
                        {o.settings.gstin && (
                            <div className="flex justify-between mt-1">
                                <span className="text-white/60">GSTIN:</span>
                                <span className="font-medium text-white">{o.settings.gstin}</span>
                            </div>
                        )}
                    </div>
                )}
            </GlassCard>
        )
    }

    return null
}
