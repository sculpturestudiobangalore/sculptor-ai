import type { ToolCardProps } from '@/components/tool-card'
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export default function ActionConfirmation({ toolName, output }: { toolName: string, output: any }) {
    const [expanded, setExpanded] = useState(false)

    // Helper to format tool name
    const formatToolName = (name: string) => {
        return name
            .replace(/Tool$/, '')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim()
    }

    // Try to extract a meaningful message
    const message = output?.message || output?.success ? 'Operation completed successfully' : 'Operation completed'
    const details = output ? JSON.stringify(output, null, 2) : 'No details available'

    return (
        <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all hover:bg-white/10">
            <div
                className="flex cursor-pointer items-center justify-between p-3"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium text-white/90">{formatToolName(toolName)}</span>
                            <span className="hidden text-xs text-white/50 sm:inline-block">• {message}</span>
                        </div>
                    </div>
                </div>

                <button className="text-white/40 transition-colors hover:text-white">
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
            </div>

            {/* Mobile-only subtext for message if it's long */}
            <div className="px-3 pb-2 sm:hidden">
                <p className="text-xs text-white/50">{message}</p>
            </div>

            {expanded && (
                <div className="border-t border-white/10 bg-black/20 p-3 animate-in slide-in-from-top-1 duration-200">
                    <div className="font-mono text-xs text-emerald-300/80 overflow-auto max-h-40 whitespace-pre-wrap">
                        {details}
                    </div>
                </div>
            )}
        </div>
    )
}
