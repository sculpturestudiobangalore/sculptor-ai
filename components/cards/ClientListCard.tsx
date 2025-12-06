import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Mail, Phone, FileText } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { ListClientsOutput, ClientSummary, ClientPriority } from '@/types/tool-types'

const priorityStyles: Record<ClientPriority, string> = {
    high: 'bg-rose-500/30 text-rose-100',
    medium: 'bg-amber-400/30 text-amber-100',
    low: 'bg-emerald-400/25 text-emerald-100',
}

const SectionHeader = ({
    eyebrow,
    title,
    meta,
}: {
    eyebrow: string
    title: string
    meta?: React.ReactNode
}) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/45">{eyebrow}</p>
            <h3 className="text-xl font-semibold text-white sm:text-2xl">{title}</h3>
        </div>
        {meta && <div className="text-sm text-white/70">{meta}</div>}
    </div>
)

export default function ClientListCard({ output, onAction }: { output?: ListClientsOutput, onAction?: (action: string, data: string) => void }) {
    const clients: ClientSummary[] = output?.clients ?? []

    if (!output?.success) {
        return (
            <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                <SectionHeader eyebrow="Client search" title="Unable to fetch clients" />
                <p className="mt-3 text-sm text-rose-100/80">{output?.error ?? 'The studio database did not respond.'}</p>
            </GlassCard>
        )
    }

    if (clients.length === 0) {
        return (
            <GlassCard>
                <SectionHeader eyebrow="Client roster" title="No clients found" />
                <p className="mt-3 text-sm text-white/70">Try adjusting filters or ask SculptorAI to add a new client.</p>
            </GlassCard>
        )
    }

    return (
        <GlassCard>
            <SectionHeader
                eyebrow="Client roster"
                title="Active client relationships"
                meta={
                    <Badge className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80" variant="secondary">
                        {output?.total ?? clients.length} clients
                    </Badge>
                }
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {clients.map((client) => (
                    <div
                        key={client.id}
                        className="rounded-2xl border border-white/12 bg-white/7 p-4 text-white/85 shadow-[0_32px_80px_rgba(20,0,60,0.35)] transition-all hover:bg-white/10"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <button
                                    onClick={() => onAction?.('viewClient', client.id)}
                                    className="text-left group"
                                >
                                    <p className="text-lg font-semibold text-white group-hover:text-violet-300 transition-colors flex items-center gap-2">
                                        {client.name || 'Unnamed Client'}
                                        <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                    </p>
                                </button>
                                {(client.company || client.state) && (
                                    <p className="text-xs text-white/55">
                                        {client.company}
                                        {client.company && client.state ? ' • ' : ''}
                                        {client.state && `State: ${client.state}`}
                                    </p>
                                )}
                            </div>
                            {client.priority && (
                                <span
                                    className={cn(
                                        'rounded-full px-3 py-1 text-xs font-medium capitalize',
                                        priorityStyles[client.priority as ClientPriority] ?? 'bg-white/15 text-white'
                                    )}
                                >
                                    {client.priority} priority
                                </span>
                            )}
                            <button
                                onClick={() => onAction?.('submitMessage', `Edit client ${client.name}`)}
                                className="rounded-lg px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all ml-auto self-start"
                            >
                                Edit
                            </button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/70">
                            {client.email && (
                                <span className="flex items-center gap-1">
                                    <Mail className="h-4 w-4 text-white/50" />
                                    {client.email}
                                </span>
                            )}
                            {client.phone && (
                                <span className="flex items-center gap-1">
                                    <Phone className="h-4 w-4 text-white/50" />
                                    {client.phone}
                                </span>
                            )}
                            {client.hasGST && (
                                <span className="flex items-center gap-1">
                                    <FileText className="h-4 w-4 text-white/50" />
                                    GST ready
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </GlassCard>
    )
}
