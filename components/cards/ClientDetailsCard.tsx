'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Building2, Mail, Phone, TrendingUp, Clock, Wallet, Target } from 'lucide-react'
import { GlassCard, SectionHeader } from '@/components/ui/GlassCard'

interface Project {
    id: string
    name: string
    budget: number
    actualCost: number
    status: string
    deadline?: string
    progress: number
    totalTasks: number
    completedTasks: number
    totalPaid: number
    totalAdvances: number
    totalInvoiced: number
    balanceDue: number
    budgetUtilization: number
}

interface ClientTotals {
    totalBudget: number
    totalSpent: number
    totalAdvances: number
    totalBalance: number
    activeProjects: number
}

interface ClientDetailsOutput {
    success: boolean
    client?: {
        id: string
        name: string
        email?: string
        phone?: string
        company?: string
        address?: string
        priority?: string
        state_code?: string
        gstin?: string
        projectCount: number
        projects: Project[]
        totals: ClientTotals
    }
    error?: string
}

const statusStyles: Record<string, string> = {
    in_progress: 'bg-blue-500/25 text-blue-100',
    completed: 'bg-emerald-500/25 text-emerald-100',
    draft: 'bg-amber-500/25 text-amber-100',
    quoted: 'bg-violet-500/25 text-violet-100',
    paused: 'bg-rose-500/25 text-rose-100',
}

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value)
}

export default function ClientDetailsCard({
    output,
    onAction,
}: {
    output?: ClientDetailsOutput
    onAction?: (action: string, data: string) => void
}) {
    if (!output?.success || !output.client) {
        return (
            <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                <SectionHeader eyebrow="Client Details" title="Unable to load client" />
                <p className="mt-3 text-sm text-rose-100/80">{output?.error ?? 'Please try again.'}</p>
            </GlassCard>
        )
    }

    const { client } = output
    const { totals } = client

    return (
        <GlassCard>
            <SectionHeader
                eyebrow="Client Details"
                title={client.name}
                meta={
                    <div className="flex items-center gap-2">
                        {client.priority && (
                            <Badge variant="secondary" className="capitalize">
                                {client.priority} priority
                            </Badge>
                        )}
                        <Badge variant="secondary">{client.projectCount} projects</Badge>
                    </div>
                }
            />


            {/* Client Contact Information - Enhanced */}
            <div className="mt-6">
                <h4 className="mb-3 text-sm font-medium text-white/90">Contact Information</h4>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {client.email && (
                            <div className="flex items-start gap-3">
                                <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-400" />
                                <div>
                                    <p className="text-xs text-white/50">Email</p>
                                    <p className="text-sm text-white">{client.email}</p>
                                </div>
                            </div>
                        )}
                        {client.phone && (
                            <div className="flex items-start gap-3">
                                <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-400" />
                                <div>
                                    <p className="text-xs text-white/50">Phone</p>
                                    <p className="text-sm text-white">{client.phone}</p>
                                </div>
                            </div>
                        )}
                        {client.company && (
                            <div className="flex items-start gap-3">
                                <Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-400" />
                                <div>
                                    <p className="text-xs text-white/50">Company</p>
                                    <p className="text-sm text-white">{client.company}</p>
                                </div>
                            </div>
                        )}
                        {client.state_code && (
                            <div className="flex items-start gap-3">
                                <span className="mt-0.5 text-violet-400">📍</span>
                                <div>
                                    <p className="text-xs text-white/50">State</p>
                                    <p className="text-sm text-white">{client.state_code}</p>
                                </div>
                            </div>
                        )}
                        {client.gstin && (
                            <div className="flex items-start gap-3 sm:col-span-2">
                                <span className="mt-0.5 text-violet-400">🏛️</span>
                                <div>
                                    <p className="text-xs text-white/50">GSTIN</p>
                                    <p className="text-sm font-mono text-white">{client.gstin}</p>
                                </div>
                            </div>
                        )}
                        {client.address && (
                            <div className="flex items-start gap-3 sm:col-span-2">
                                <span className="mt-0.5 text-violet-400">🏠</span>
                                <div>
                                    <p className="text-xs text-white/50">Address</p>
                                    <p className="text-sm text-white">{client.address}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Financial Summary */}
            <div className="mt-6 grid gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                        <Wallet className="h-3.5 w-3.5" />
                        <span>Total Budget</span>
                    </div>
                    <p className="mt-2 text-xl font-bold text-white">{formatCurrency(totals.totalBudget)}</p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Total Spent</span>
                    </div>
                    <p className="mt-2 text-xl font-bold text-emerald-400">{formatCurrency(totals.totalSpent)}</p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                        <Target className="h-3.5 w-3.5" />
                        <span>Advances Paid</span>
                    </div>
                    <p className="mt-2 text-xl font-bold text-violet-400">{formatCurrency(totals.totalAdvances)}</p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Outstanding</span>
                    </div>
                    <p className="mt-2 text-xl font-bold text-amber-400">{formatCurrency(totals.totalBalance)}</p>
                </div>
            </div>

            {/* Projects Table */}
            {client.projects.length > 0 && (
                <div className="mt-6">
                    <h4 className="mb-3 text-sm font-medium text-white/90">Projects Overview</h4>
                    <div className="overflow-x-auto">
                        <div className="min-w-[800px]">
                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-4 rounded-t-lg border border-white/10 bg-white/5 px-4 py-3 text-xs font-medium text-white/60">
                                <div className="col-span-3">Project</div>
                                <div className="col-span-2 text-right">Budget</div>
                                <div className="col-span-2 text-right">Actual Cost</div>
                                <div className="col-span-1 text-center">Progress</div>
                                <div className="col-span-2 text-right">Advances</div>
                                <div className="col-span-2 text-right">Balance</div>
                            </div>

                            {/* Table Body */}
                            <div className="max-h-96 overflow-y-auto rounded-b-lg border border-t-0 border-white/10">
                                {client.projects.map((project, index) => (
                                    <div
                                        key={project.id}
                                        className={cn(
                                            'grid grid-cols-12 gap-4 border-b border-white/5 px-4 py-3 text-sm transition-colors hover:bg-white/5',
                                            index === client.projects.length - 1 && 'border-b-0'
                                        )}
                                    >
                                        {/* Project Name & Status */}
                                        <div className="col-span-3">
                                            <button
                                                onClick={() => onAction?.('viewProject', project.id)}
                                                className="group text-left"
                                            >
                                                <p className="font-medium text-white group-hover:text-violet-300 transition-colors">
                                                    {project.name}
                                                </p>
                                                <Badge className={cn('mt-1 text-xs capitalize', statusStyles[project.status] || 'bg-white/15 text-white')}>
                                                    {project.status?.replace('_', ' ') || 'draft'}
                                                </Badge>
                                            </button>
                                        </div>

                                        {/* Budget */}
                                        <div className="col-span-2 text-right">
                                            <p className="text-white/90">{formatCurrency(project.budget)}</p>
                                            <p className="mt-1 text-xs text-white/50">{project.totalTasks} tasks</p>
                                        </div>

                                        {/* Actual Cost */}
                                        <div className="col-span-2 text-right">
                                            <p className="text-white/90">{formatCurrency(project.actualCost)}</p>
                                            <p className="mt-1 text-xs text-white/50">
                                                {project.budgetUtilization}% utilized
                                            </p>
                                        </div>

                                        {/* Progress */}
                                        <div className="col-span-1">
                                            <div className="flex flex-col items-center">
                                                <p className="text-sm font-medium text-white">{project.progress}%</p>
                                                <div className="mt-1 h-1.5 w-full rounded-full bg-white/10">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                                        style={{ width: `${project.progress}%` }}
                                                    />
                                                </div>
                                                <p className="mt-1 text-xs text-white/50">
                                                    {project.completedTasks}/{project.totalTasks}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Advances */}
                                        <div className="col-span-2 text-right">
                                            <p className="font-medium text-violet-400">{formatCurrency(project.totalAdvances)}</p>
                                            <p className="mt-1 text-xs text-white/50">paid</p>
                                        </div>

                                        {/* Balance */}
                                        <div className="col-span-2 text-right">
                                            <p className={cn(
                                                "font-medium",
                                                project.balanceDue > 0 ? "text-amber-400" : "text-emerald-400"
                                            )}>
                                                {formatCurrency(project.balanceDue)}
                                            </p>
                                            <p className="mt-1 text-xs text-white/50">
                                                {project.balanceDue > 0 ? 'due' : 'settled'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {client.projects.length === 0 && (
                <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-6 text-center">
                    <p className="text-sm text-white/60">No projects found for this client.</p>
                </div>
            )}
        </GlassCard>
    )
}
