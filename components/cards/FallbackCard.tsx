import React from 'react'
import { GlassCard, SectionHeader } from '@/components/ui/GlassCard'

export default function FallbackCard({
    toolName,
    output
}: {
    toolName: string
    output: unknown
}) {
    const formattedTitle = toolName
        .replace(/Tool$/, '')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim()

    const copyToClipboard = () => {
        navigator.clipboard.writeText(JSON.stringify(output, null, 2))
    }

    return (
        <GlassCard>
            <div className="flex items-start justify-between">
                <SectionHeader
                    eyebrow="Action Report"
                    title={formattedTitle}
                />
                <button
                    onClick={copyToClipboard}
                    className="text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded border border-white/10 hover:bg-white/5"
                >
                    Copy Data
                </button>
            </div>

            <div className="mt-4 relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-violet-500/10 to-transparent blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative rounded-lg border border-white/10 bg-[#0c051d]/50 p-4 font-mono text-xs text-emerald-300/90 overflow-auto max-h-80 shadow-inner">
                    <pre>{JSON.stringify(output, null, 2)}</pre>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-white/30 uppercase tracking-widest">
                <div className="h-1 w-1 rounded-full bg-emerald-500/50" />
                System Output
            </div>
        </GlassCard>
    )
}
