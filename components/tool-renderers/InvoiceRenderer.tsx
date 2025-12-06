import React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Receipt } from 'lucide-react'
import GlassCard, { SectionHeader } from '@/components/ui/GlassCard'
// NOTE: These card components don't exist after refactoring
// import InvoiceDetailsCard from '@/components/cards/InvoiceDetailsCard'
// import InvoiceListCard from '@/components/cards/InvoiceListCard'
import SplitInvoiceCard from '@/components/cards/SplitInvoiceCard'
import CombineInvoiceCard from '@/components/cards/CombineInvoiceCard'
import InvoiceFormCard from '@/components/cards/InvoiceFormCard'
import GenericSuccessCard from '@/components/cards/GenericSuccessCard'
import {
    GenericSuccessOutput,
    InvoiceOutput,
    OutstandingPaymentsOutput,
    PaymentHistoryOutput,
    ReminderOutput
} from '@/types/tool-types'
import { formatINR, formatDate } from "../../lib/ai-tools/finance/finance-helpers"

interface InvoiceRendererProps {
    toolName: string
    result: any
    onAction?: (action: string, data: any) => void
}

export function InvoiceRenderer({ toolName, result, onAction }: InvoiceRendererProps) {
    const formatCurrency = formatINR;

    // Generic Success Cases
    if ([
        'createInvoiceTool',
        'updateInvoiceStatusTool',
        'cancelInvoiceTool',
        'recordPaymentTool',
        'generateCreditNoteTool',
        'generateDebitNoteTool',
        'generatePaymentReceiptTool'
    ].includes(toolName)) {
        return <GenericSuccessCard output={result as GenericSuccessOutput} toolName={toolName} />
    }

    // Outstanding Payments
    if (toolName === 'getOutstandingPaymentsTool') {
        const o = result as OutstandingPaymentsOutput
        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Outstanding Payments" title="Unable to fetch data" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }
        if (!o.invoices || o.invoices.length === 0) {
            return (
                <GlassCard>
                    <SectionHeader eyebrow="Outstanding Payments" title="No overdue invoices" />
                    <p className="mt-3 text-sm text-white/70">All payments are up to date.</p>
                </GlassCard>
            )
        }

        const totalOutstanding = o.invoices.reduce((sum, inv) => sum + inv.balance_due, 0)

        return (
            <GlassCard>
                <SectionHeader
                    eyebrow="Outstanding Payments"
                    title="Overdue Invoices"
                    meta={<Badge variant="secondary" className="bg-rose-500/25 text-rose-100">
                        {formatINR(totalOutstanding)} due
                    </Badge>}
                />

                <div className="mt-4 space-y-3">
                    {o.invoices.map((inv) => (
                        <div key={inv.id} className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-rose-100">Invoice {inv.invoice_number}</h4>
                                    <p className="text-xs text-rose-100/80">Total: {formatINR(inv.total_amount)}</p>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-rose-100">{formatINR(inv.balance_due)}</div>
                                    <div className="text-xs text-rose-100/80">Balance due</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>
        )
    }

    // Payment History
    if (toolName === 'getPaymentHistoryTool') {
        const o = result as PaymentHistoryOutput
        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Payment History" title="Unable to fetch history" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }
        if (!o.payments || o.payments.length === 0) {
            return (
                <GlassCard>
                    <SectionHeader eyebrow="Payment History" title="No payments found" />
                    <p className="mt-3 text-sm text-white/70">Payment history will appear here.</p>
                </GlassCard>
            )
        }

        const totalAmount = o.payments.reduce((sum, p) => sum + parseFloat(p.amount.replace(/[^\d.]/g, '')), 0)

        return (
            <GlassCard>
                <SectionHeader
                    eyebrow="Payment History"
                    title="Transaction Records"
                    meta={<Badge variant="secondary">{o.payments.length} payments</Badge>}
                />

                <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 mb-4">
                    <div className="text-center">
                        <p className="text-xs uppercase tracking-[0.35em] text-white/45">Total Processed</p>
                        <p className="mt-1 text-2xl font-bold text-white">{formatINR(totalAmount)}</p>
                    </div>
                </div>

                <div className="space-y-3 max-h-80 overflow-auto">
                    {o.payments.map((payment) => (
                        <div key={payment.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-white">{payment.amount}</h4>
                                    <p className="text-xs text-white/60">{formatDate(payment.paymentDate)} • {payment.paymentMethod}</p>
                                </div>
                                <Receipt className="h-4 w-4 text-white/50" />
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>
        )
    }

    // Payment Reminder
    if (toolName === 'generatePaymentReminderTool') {
        const o = result as ReminderOutput
        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Payment Reminder" title="Unable to generate reminder" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }

        return (
            <GlassCard className="border-amber-400/30 bg-amber-500/10">
                <SectionHeader eyebrow="Payment Reminder" title="Ready to Send" />
                <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-500/5 p-4">
                    <p className="text-sm text-amber-100/90 whitespace-pre-wrap">{o.reminderMessage}</p>
                </div>
                <p className="mt-3 text-xs text-amber-100/70">
                    This reminder can be sent via email or message to the client.
                </p>
            </GlassCard>
        )
    }

    if (toolName === 'listInvoicesTool') {
        const o = result as { success: boolean; invoices?: any[]; error?: string }

        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Invoices" title="Unable to fetch invoices" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error ?? 'No invoices available.'}</p>
                </GlassCard>
            )
        }

        if (!o.invoices || o.invoices.length === 0) {
            return (
                <GlassCard>
                    <SectionHeader eyebrow="Invoices" title="No invoices found" />
                    <p className="mt-3 text-sm text-white/70">No invoices exist for this client or project.</p>
                </GlassCard>
            )
        }

        return (
            <GlassCard>
                <SectionHeader
                    eyebrow="Invoices"
                    title="All invoices"
                    meta={
                        <Badge className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80" variant="secondary">
                            {o.invoices.length} invoices
                        </Badge>
                    }
                />

                <div className="mt-6 grid gap-4">
                    {o.invoices.map((inv) => (
                        <div key={inv.id} className="rounded-2xl border border-white/12 bg-white/6 p-4 text-white/90 shadow-[0_20px_60px_rgba(25,10,90,0.15)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <p className="text-lg font-semibold text-white">{inv.invoice_number || 'Invoice'}</p>
                                <div className="text-xs text-white/60 mt-1">
                                    Client: {inv.client_name || 'Unknown'}
                                </div>
                                <div className="text-xs text-white/60 mt-1">
                                    Status: <span className={cn(
                                        "capitalize font-medium",
                                        inv.status === 'paid' ? "text-emerald-400" :
                                            inv.status === 'overdue' ? "text-rose-400" : "text-amber-400"
                                    )}>{inv.status}</span>
                                    {inv.due_date && (
                                        <>
                                            {' '}| Due: {new Date(inv.due_date).toLocaleDateString('en-IN')}
                                        </>
                                    )}
                                </div>
                                <div className="mt-2 text-sm text-white/80">
                                    Amount: <span className="font-bold">{formatCurrency(inv.total_amount)}</span>
                                    {inv.balance_due > 0 && (
                                        <span className="text-rose-300 ml-2">(Due: {formatCurrency(inv.balance_due)})</span>
                                    )}
                                </div>
                            </div>
                            {inv.pdf_data_url && (
                                <div className="flex flex-col sm:items-end gap-2">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onAction?.('submitMessage', `Edit invoice ${inv.invoice_number}`)}
                                            className="rounded-lg px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => onAction?.('submitMessage', `Record payment for invoice ${inv.invoice_number}`)}
                                            className="rounded-lg px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 text-sm font-medium transition-all"
                                        >
                                            Pay
                                        </button>
                                    </div>
                                    <a
                                        href={inv.pdf_data_url}
                                        download={`${inv.invoice_number}.pdf`}
                                        className="rounded-lg px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md transition-all flex items-center gap-2"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        PDF
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </GlassCard>
        )
    }

    if (toolName === 'showInvoiceEditFormTool') {
        const formOutput = result as {
            success: boolean
            showForm: boolean
            invoiceNumber: string
            clientName: string
            projectName?: string
            invoiceData?: any
        }

        if (!formOutput?.success || !formOutput?.showForm) {
            return null
        }

        return (
            <InvoiceFormCard
                clientName={formOutput.clientName}
                projectName={formOutput.projectName}
                invoiceNumber={formOutput.invoiceNumber}
                initialData={formOutput.invoiceData}
                onSubmit={(data) => {
                    console.log('🧾 [ToolCard] Invoice form submitted', data)

                    const payload = {
                        invoiceNumber: formOutput.invoiceNumber,
                        items: data.items,
                        issueDate: data.issueDate,
                        dueDate: data.dueDate,
                        advancePaid: data.advancePaid,
                        notes: data.notes,
                        source: 'invoice_form',
                    }

                    const message = `Update invoice ${formOutput.invoiceNumber} with these details:
                    - Items: ${JSON.stringify(data.items)}
                    - Issue Date: ${data.issueDate}
                    - Due Date: ${data.dueDate}
                    - Advance Paid: ${data.advancePaid}
                    - Notes: ${data.notes}
                    - Apply GST: ${data.applyGST}`
                    console.log('➡️ [ToolCard] Sending submitMessage', message)
                    onAction?.('submitMessage', message)
                }}
                onCancel={() => {
                    console.log('[ToolCard] Invoice form cancelled')
                }}
            />
        )
    }

    if (toolName === 'showSplitInvoiceTool') {
        const o = result as {
            success: boolean
            showSplitInvoiceUI?: boolean // Handle both potential property names
            showSplitUI?: boolean
            invoice: any
            items: any[]
            error?: string
            invoiceNumber?: string // Handle alternative output format
            clientName?: string
            projectName?: string
        }

        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Split Invoice" title="Unable to load items" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }

        // Normalize data based on which output format we received
        const invoiceNumber = o.invoice?.invoice_number || o.invoiceNumber;
        const clientName = o.invoice?.client_name || o.clientName || 'Unknown Client';
        const projectName = o.invoice?.project_name || o.projectName;

        // Items might be directly in o.items or need mapping if from o.items (depending on format)
        // Assuming o.items is consistent or we map it. 
        // The format at 2093 used mapping. The format at 1422 passed items directly.
        // We'll try to use items as is, but if they lack properties, SplitInvoiceCard might complain.
        // Let's assume the mapped format is safer if available.

        const items = o.items.map((i: any) => ({
            id: i.id,
            description: i.description,
            quantity: i.quantity,
            unit: i.unit,
            rate: i.unit_price || i.rate, // Handle both
            amount: i.total_price || i.amount, // Handle both
        }));

        return (
            <SplitInvoiceCard
                invoiceNumber={invoiceNumber}
                clientName={clientName}
                projectName={projectName}
                items={items}
                onSubmit={(data) => {
                    const command = `Split invoice ${data.originalInvoiceNumber} by moving items ${data.selectedItemIds.join(', ')} to a new invoice. GST for Part A: ${data.groupAGstStatus}, GST for Part B: ${data.groupBGstStatus}`
                    onAction?.('submitMessage', command)
                }}
                onCancel={() => {
                    console.log('[ToolCard] Split invoice cancelled')
                    onAction?.('cancelSplitInvoice', {})
                }}
            />
        )
    }

    if (toolName === 'splitInvoiceTool') {
        const o = result as {
            success: boolean;
            splitResult?: {
                original: string;
                partA: { number: string; total: string; itemCount: number; items: any[]; pdfDataUrl?: string };
                partB: { number: string; total: string; itemCount: number; items: any[]; pdfDataUrl?: string };
            };
            message?: string;
            error?: string;
        }

        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Split Invoice" title="Split failed" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }

        const res = o.splitResult;

        return (
            <GlassCard className="border-emerald-400/30 bg-emerald-500/10">
                <SectionHeader
                    eyebrow="Invoice Split Successful"
                    title="Created 2 New Invoices"
                />
                <p className="mt-2 text-sm text-emerald-100/80">{o.message}</p>

                {res && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {/* Part A */}
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="text-xs uppercase tracking-wider text-white/40 mb-1">Part A</div>
                            <div className="text-lg font-bold text-white">{res.partA.number}</div>
                            <div className="mt-2 flex justify-between text-sm">
                                <span className="text-white/60">{res.partA.itemCount} items</span>
                                <span className="font-medium text-emerald-300">{res.partA.total}</span>
                            </div>
                        </div>

                        {/* Part B */}
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="text-xs uppercase tracking-wider text-white/40 mb-1">Part B</div>
                            <div className="text-lg font-bold text-white">{res.partB.number}</div>
                            <div className="mt-2 flex justify-between text-sm">
                                <span className="text-white/60">{res.partB.itemCount} items</span>
                                <span className="font-medium text-emerald-300">{res.partB.total}</span>
                            </div>
                        </div>
                    </div>
                )}
            </GlassCard>
        )
    }

    if (toolName === 'showCombineInvoiceTool') {
        const o = result as {
            success: boolean;
            showCombineUI: boolean;
            clientName: string;
            projectName?: string;
            previewTotal: string;
            invoices: any[];
            error?: string;
        }

        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Combine Invoices" title="Unable to load invoices" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }

        return (
            <CombineInvoiceCard
                invoices={o.invoices}
                clientName={o.clientName}
                projectName={o.projectName}
                previewTotal={o.previewTotal}
                onSubmit={(data) => onAction?.('combineInvoice', data)}
                onCancel={() => onAction?.('cancelCombine', {})}
            />
        )
    }

    if (toolName === 'combineInvoiceTool') {
        const o = result as {
            success: boolean;
            newInvoice?: {
                number: string;
                total: string;
                itemCount: number;
            };
            message?: string;
            error?: string;
        }

        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Combine Invoices" title="Merge failed" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }

        return (
            <GlassCard className="border-emerald-400/30 bg-emerald-500/10">
                <SectionHeader
                    eyebrow="Invoices Merged"
                    title={o.newInvoice?.number || 'New Invoice'}
                />
                <p className="mt-2 text-sm text-emerald-100/80">{o.message}</p>

                {o.newInvoice && (
                    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-xs text-white/50">Total Amount</div>
                                <div className="text-xl font-bold text-emerald-300">{o.newInvoice.total}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-white/50">Items</div>
                                <div className="text-lg font-medium text-white">{o.newInvoice.itemCount}</div>
                            </div>
                        </div>
                    </div>
                )}
            </GlassCard>
        )
    }

    if (toolName === 'generateInvoiceTool' || toolName === 'updateInvoiceTool') {
        const o = result as {
            success: boolean;
            invoice?: any;
            error?: string;
        }

        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Invoice" title="Unable to generate invoice" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }

        const i = o.invoice
        if (!i) return <div>No invoice data</div>

        return (
            <GlassCard>
                <SectionHeader
                    eyebrow="Invoice Generated"
                    title={`Invoice ${i.invoiceNumber}`}
                    meta={<Badge variant="secondary" className={cn(
                        i.status === 'paid' ? 'bg-emerald-500/25' :
                            i.status === 'overdue' ? 'bg-rose-500/25' : 'bg-amber-500/25'
                    )}>
                        {i.status}
                    </Badge>}
                />

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/12 bg-white/7 p-4">
                        <p className="text-xs uppercase tracking-[0.35em] text-white/45">Project</p>
                        <p className="mt-2 text-lg font-semibold text-white">{i.projectName}</p>
                        <p className="text-sm text-white/70">Client: {i.clientName}</p>
                        {i.quotationNumber && (
                            <p className="text-xs text-white/60 mt-1">Based on Quotation: {i.quotationNumber}</p>
                        )}
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-white/7 p-4">
                        <p className="text-xs uppercase tracking-[0.35em] text-white/45">Due Date</p>
                        <p className="mt-2 text-lg font-semibold text-white">{formatDate(i.dueDate)}</p>
                        <p className="text-sm text-white/70">Issued: {formatDate(i.issueDate)}</p>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 border-t border-white/10 pt-4">
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-white/60">Subtotal:</span>
                            <span className="font-medium text-white">{i.subtotal}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/60">Tax ({i.taxType}):</span>
                            <span className="font-medium text-white">{i.taxAmount}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/10 pt-2">
                            <span className="text-white/80">Total Amount:</span>
                            <span className="font-bold text-white">{i.totalAmount}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-white/60">Advance Paid:</span>
                            <span className="font-medium text-white">{i.advancePaid}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/10 pt-2">
                            <span className="text-white/80">Balance Due:</span>
                            <span className="font-bold text-white">{i.balanceDue}</span>
                        </div>
                    </div>
                </div>
            </GlassCard>
        )
    }

    if (toolName === 'convertQuotationToInvoiceTool') {
        const o = result as {
            success: boolean;
            invoice?: {
                invoiceNumber: string;
                quotationNumber: string;
                projectName: string;
                clientName: string;
                totalAmount: string;
                advancePaid: string;
                balanceDue: string;
                dueDate: string;
                itemCount: number;
                status: string;
                pdfDataUrl?: string;
            };
            error?: string;
        };

        if (!o?.success || !o.invoice) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Invoice" title="Unable to create invoice" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            );
        }

        const inv = o.invoice;

        return (
            <GlassCard>
                <SectionHeader
                    eyebrow="Invoice Created"
                    title={`Invoice ${inv.invoiceNumber}`}
                    meta={<Badge variant="secondary" className="bg-emerald-500/25 text-emerald-200">
                        {inv.status}
                    </Badge>}
                />

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/12 bg-white/7 p-4">
                        <p className="text-xs uppercase tracking-[0.35em] text-white/45">Project</p>
                        <p className="mt-2 text-lg font-semibold text-white">{inv.projectName}</p>
                        <p className="text-sm text-white/70">Client: {inv.clientName}</p>
                        <p className="text-xs text-white/60 mt-1">From Quotation: {inv.quotationNumber}</p>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-white/7 p-4">
                        <p className="text-xs uppercase tracking-[0.35em] text-white/45">Due Date</p>
                        <p className="mt-2 text-lg font-semibold text-white">{formatDate(inv.dueDate)}</p>
                        <p className="text-sm text-white/70">Items: {inv.itemCount}</p>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 border-t border-white/10 pt-4">
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-white/60">Total Amount:</span>
                            <span className="font-bold text-white">{inv.totalAmount}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-white/60">Balance Due:</span>
                            <span className="font-bold text-white">{inv.balanceDue}</span>
                        </div>
                    </div>
                </div>

                {inv.pdfDataUrl && (
                    <div className="mt-6 flex justify-end">
                        <a
                            href={inv.pdfDataUrl}
                            download={`${inv.invoiceNumber}.pdf`}
                            className="rounded-lg px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md transition-all flex items-center gap-2"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download PDF
                        </a>
                    </div>
                )}
            </GlassCard>
        );
    }

    // Handle generic success cases
    if ([
        'createInvoiceTool',
        'updateInvoiceStatusTool',
        'cancelInvoiceTool',
        'recordPaymentTool',
        'recordPaymentTool',
        'generateCreditNoteTool',
        'generateDebitNoteTool',
        'generatePaymentReceiptTool'
    ].includes(toolName)) {
        return <GenericSuccessCard output={result as GenericSuccessOutput} toolName={toolName} />
    }

    return null
}
