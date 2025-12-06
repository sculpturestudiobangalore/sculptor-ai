'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { DollarSign, TrendingUp, FileText, Clock, CreditCard, Calendar } from 'lucide-react'
import { GlassCard, SectionHeader } from '@/components/ui/GlassCard'

interface Payment {
    id: string
    date: string
    amount: number
    method: string
    projectName: string
    clientName: string
    invoiceNumber: string | null
    isAdvance: boolean
    referenceNumber?: string
}

interface Invoice {
    id: string
    invoiceNumber: string
    date: string
    dueDate: string
    projectName: string
    clientName: string
    totalAmount: number
    advancePaid: number
    balanceDue: number
    status: string
    paidAmount: number
}

interface FinancialDashboardOutput {
    success: boolean
    dateRange?: {
        start: string
        end: string
    }
    summary?: {
        totalPaymentsReceived: number
        totalAdvances: number
        totalInvoicePayments: number
        totalInvoiced: number
        totalOutstanding: number
        totalRevenue: number
        collectionRate: number
        completedInvoices: number
        pendingInvoices: number
        totalInvoices: number
        totalPayments: number
    }
    payments?: Payment[]
    invoices?: Invoice[]
    paymentMethodBreakdown?: Record<string, number>
    monthlyRevenue?: Record<string, number>
    error?: string
}

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value)
}

const formatDate = (dateStr: string): string => {
    try {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
        return dateStr
    }
}

export default function FinancialDashboardCard({
    output,
}: {
    output?: FinancialDashboardOutput
}) {
    if (!output?.success || !output.summary) {
        return (
            <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                <SectionHeader eyebrow="Financial Dashboard" title="Unable to load data" />
                <p className="mt-3 text-sm text-rose-100/80">{output?.error ?? 'Please try again.'}</p>
            </GlassCard>
        )
    }

    const { summary, payments, invoices, paymentMethodBreakdown, dateRange } = output

    return (
        <GlassCard>
            <SectionHeader
                eyebrow="Financial Dashboard"
                title="Company Finances"
                meta={
                    dateRange && (
                        <Badge variant="secondary">
                            {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
                        </Badge>
                    )
                }
            />

            {/* Key Metrics */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <div className="flex items-center gap-2 text-xs text-emerald-200/80">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>Total Revenue</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-emerald-100">{formatCurrency(summary.totalRevenue)}</p>
                    <p className="mt-1 text-xs text-emerald-200/60">{summary.totalPayments} payments</p>
                </div>

                <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-4">
                    <div className="flex items-center gap-2 text-xs text-violet-200/80">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Total Invoiced</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-violet-100">{formatCurrency(summary.totalInvoiced)}</p>
                    <p className="mt-1 text-xs text-violet-200/60">{summary.totalInvoices} invoices</p>
                </div>

                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                    <div className="flex items-center gap-2 text-xs text-amber-200/80">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Outstanding</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-amber-100">{formatCurrency(summary.totalOutstanding)}</p>
                    <p className="mt-1 text-xs text-amber-200/60">{summary.pendingInvoices} pending</p>
                </div>

                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                    <div className="flex items-center gap-2 text-xs text-blue-200/80">
                        <FileText className="h-3.5 w-3.5" />
                        <span>Collection Rate</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-blue-100">{summary.collectionRate}%</p>
                    <p className="mt-1 text-xs text-blue-200/60">{summary.completedInvoices} completed</p>
                </div>
            </div>

            {/* Payment Breakdown */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/60">Advances Received</p>
                    <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(summary.totalAdvances)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/60">Invoice Payments</p>
                    <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(summary.totalInvoicePayments)}</p>
                </div>
                {paymentMethodBreakdown && (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                        <p className="text-xs text-white/60 mb-2">Payment Methods</p>
                        {Object.entries(paymentMethodBreakdown).map(([method, amount]) => (
                            <div key={method} className="flex justify-between text-sm">
                                <span className="text-white/70 capitalize">{method}:</span>
                                <span className="text-white font-medium">{formatCurrency(amount as number)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Payments */}
            {payments && payments.length > 0 && (
                <div className="mt-6">
                    <h4 className="mb-3 text-sm font-medium text-white/90">Recent Payments</h4>
                    <div className="overflow-hidden rounded-lg border border-white/10">
                        <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-white/10 text-xs text-white/60">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Date</th>
                                        <th className="px-4 py-3 text-left">Client</th>
                                        <th className="px-4 py-3 text-left">Project</th>
                                        <th className="px-4 py-3 text-left">Type</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                        <th className="px-4 py-3 text-left">Method</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {payments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 text-white/80">{formatDate(payment.date)}</td>
                                            <td className="px-4 py-3 text-white/80">{payment.clientName}</td>
                                            <td className="px-4 py-3 text-white/80">{payment.projectName}</td>
                                            <td className="px-4 py-3">
                                                {payment.isAdvance ? (
                                                    <Badge className="bg-violet-500/25 text-violet-100">Advance</Badge>
                                                ) : (
                                                    <Badge className="bg-emerald-500/25 text-emerald-100">Invoice</Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-emerald-400">
                                                {formatCurrency(payment.amount)}
                                            </td>
                                            <td className="px-4 py-3 text-white/70 capitalize">{payment.method}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoices Summary */}
            {invoices && invoices.length > 0 && (
                <div className="mt-6">
                    <h4 className="mb-3 text-sm font-medium text-white/90">Recent Invoices</h4>
                    <div className="overflow-hidden rounded-lg border border-white/10">
                        <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-white/10 text-xs text-white/60">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Invoice #</th>
                                        <th className="px-4 py-3 text-left">Date</th>
                                        <th className="px-4 py-3 text-left">Client</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                        <th className="px-4 py-3 text-right">Paid</th>
                                        <th className="px-4 py-3 text-right">Balance</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {invoices.map((invoice) => (
                                        <tr key={invoice.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 font-mono text-violet-400">{invoice.invoiceNumber}</td>
                                            <td className="px-4 py-3 text-white/80">{formatDate(invoice.date)}</td>
                                            <td className="px-4 py-3 text-white/80">{invoice.clientName}</td>
                                            <td className="px-4 py-3 text-right text-white/90">{formatCurrency(invoice.totalAmount)}</td>
                                            <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(invoice.paidAmount)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={cn(
                                                    "font-medium",
                                                    invoice.balanceDue > 0 ? "text-amber-400" : "text-emerald-400"
                                                )}>
                                                    {formatCurrency(invoice.balanceDue)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge className={cn(
                                                    "text-xs capitalize",
                                                    invoice.status === 'paid' || invoice.balanceDue === 0
                                                        ? "bg-emerald-500/25 text-emerald-100"
                                                        : "bg-amber-500/25 text-amber-100"
                                                )}>
                                                    {invoice.balanceDue === 0 ? 'paid' : invoice.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </GlassCard>
    )
}
