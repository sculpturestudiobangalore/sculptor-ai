import React, { useState } from 'react'
import { GlassCard, SectionHeader } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, CheckCircle2, Layers } from 'lucide-react'
import ToolCard from '@/components/tool-card'

interface BatchToolResultCardProps {
    toolName: string
    results: Array<{
        input: any
        output: any
    }>
    onAction?: (action: string, data: any) => void
}

export default function BatchToolResultCard({ toolName, results, onAction }: BatchToolResultCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    // Helper to format tool name into human readable string
    const formatToolName = (name: string) => {
        return name
            .replace(/Tool$/, '')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim()
    }

    const successCount = results.filter(r => (r.output as any)?.success !== false).length
    const failCount = results.length - successCount

    return (
        <GlassCard className="transition-all duration-300">
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/10 text-white">
                        <Layers className="h-5 w-5" />
                    </div>
                    <div>
                        <SectionHeader
                            eyebrow="Batch Operation"
                            title={`${formatToolName(toolName)} (` + results.length + `)`}
                        />
                        <div className="flex gap-2 mt-1">
                            {successCount > 0 && (
                                <span className="text-xs text-emerald-300 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> {successCount} successful
                                </span>
                            )}
                            {failCount > 0 && (
                                <span className="text-xs text-rose-300 flex items-center gap-1">
                                    • {failCount} failed
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <button className="text-white/60 hover:text-white transition-colors">
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
            </div>

            {isExpanded && (
                <div className="mt-6 space-y-4 border-t border-white/10 pt-4 animate-in slide-in-from-top-2 duration-200">
                    {results.map((result, index) => (
                        <div key={index} className="relative">
                            <div className="absolute -left-3 top-6 bottom-0 w-px bg-white/10" />
                            <div className="mb-2 text-xs font-mono text-white/40 uppercase tracking-wider">
                                Item {index + 1}
                            </div>
                            <ToolCard
                                toolName={toolName}
                                input={result.input}
                                output={result.output}
                                onAction={onAction}
                            />
                        </div>
                    ))}
                </div>
            )}
        </GlassCard>
    )
}
