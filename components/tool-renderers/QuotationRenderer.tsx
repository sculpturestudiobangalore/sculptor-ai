import React, { lazy, Suspense } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/GlassCard'
import QuotationFormCard from '@/components/cards/QuotationFormCard'
import CombineQuotationCard from '@/components/cards/CombineQuotationCard'
import SplitQuotationCard from '@/components/cards/SplitQuotationCard'
import GenericSuccessCard from '@/components/cards/GenericSuccessCard'
import FallbackCard from '@/components/cards/FallbackCard'
import { QuotationOutput, GenericSuccessOutput } from '@/types/tool-types'

const rupee = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
})

const formatCurrency = (value: unknown): string => {
    if (typeof value === 'number') return rupee.format(value)
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return rupee.format(parsed)
    if (value === null || value === undefined || value === '') return '—'
    return String(value)
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

interface QuotationRendererProps {
    toolName: string
    result: any
    onAction?: (action: string, data: any) => void
}

export function QuotationRenderer({ toolName, result, onAction }: QuotationRendererProps) {
    if (toolName === 'listQuotationsTool') {
        const o = result as { success: boolean; quotations?: any[]; error?: string }

        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Quotations" title="Unable to fetch quotations" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error ?? 'No quotations available.'}</p>
                </GlassCard>
            )
        }

        if (!o.quotations || o.quotations.length === 0) {
            return (
                <GlassCard>
                    <SectionHeader eyebrow="Quotations" title="No quotations found" />
                    <p className="mt-3 text-sm text-white/70">No quotations exist for this client or project.</p>
                </GlassCard>
            )
        }

        const downloadQuotationPDF = async (q: any) => {
            // Get company settings from result
            const baseCompanySettings = (result as any).companySettings || {};

            // Select appropriate bank details based on GST status
            const isGSTApplicable = q.is_gst_applicable;
            const selectedBankDetails = isGSTApplicable
                ? baseCompanySettings.bankDetails
                : baseCompanySettings.nonGstBankDetails;

            const companySettings = {
                ...baseCompanySettings,
                bankDetails: selectedBankDetails,
            };

            const quotationData = {
                quotationNumber: q.quotation_number,
                date: new Date(q.created_at).toISOString().split('T')[0],
                validUntil: q.valid_until ? new Date(q.valid_until).toISOString().split('T')[0] : '',
                client: {
                    name: q.client_name || 'Client',
                    address: q.client_address || '',
                    phone: q.client_phone || ''
                },
                project: {
                    name: q.project_name || 'Project',
                    type: '',
                    deadline: ''
                },
                items: (q.line_items || q.items || []).map((item: any) => ({
                    ...item,
                    hsnSacCode: item.hsn_sac_code || '97030090'
                })),
                subtotal: (q.line_items || q.items || []).reduce((sum: number, item: any) => sum + (item.total || (item.quantity * item.unit_cost) || 0), 0),
                tax: (typeof q.total_amount === 'number' ? q.total_amount : 0) - ((q.line_items || q.items || []).reduce((sum: number, item: any) => sum + (item.total || (item.quantity * item.unit_cost) || 0), 0)),
                total: typeof q.total_amount === 'number' ? q.total_amount : 0,
                notes: q.notes || '', // Pass General Notes
                terms: q.terms_and_conditions || '', // Pass Terms & Conditions separately
                companySettings: companySettings
            };

            const { PDFGenerator } = await import('@/lib/ai-tools/utilities/pdf-generator');
            const pdfBytes = await PDFGenerator.generateQuotation(quotationData);

            const base64Pdf = btoa(String.fromCharCode(...pdfBytes));
            const pdfDataUrl = `data:application/pdf;base64,${base64Pdf}`;
            const link = document.createElement('a');
            link.href = pdfDataUrl;
            link.download = `${q.quotation_number || 'quotation'}.pdf`;
            link.click();
        };

        return (
            <GlassCard>
                <SectionHeader
                    eyebrow="Quotations"
                    title="All quotations for client/project"
                    meta={
                        <Badge className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80" variant="secondary">
                            {o.quotations.length} quotations
                        </Badge>
                    }
                />

                <div className="mt-6 grid gap-4">
                    {o.quotations.map((q) => (
                        <div key={q.id} className="rounded-2xl border border-white/12 bg-white/6 p-4 text-white/90 shadow-[0_20px_60px_rgba(25,10,90,0.15)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <p className="text-lg font-semibold text-white">{q.quotation_number || 'Quotation'}</p>
                                {q.client_name && (
                                    <p className="text-sm text-violet-200/90 font-medium mt-0.5">{q.client_name}</p>
                                )}
                                <div className="text-xs text-white/60 mt-1">
                                    Status: <span className="capitalize">{q.status}</span>
                                    {q.valid_until && (
                                        <>
                                            {' '}| Valid until: {new Date(q.valid_until).toLocaleDateString('en-IN')}
                                        </>
                                    )}
                                </div>
                                <div className="mt-2 text-sm text-white/80">
                                    Amount: <span className="font-bold">{formatCurrency(q.total_amount)}</span>
                                </div>
                            </div>
                            <div className="flex flex-col sm:items-end gap-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onAction?.('submitMessage', `Show edit form for quotation ${q.quotation_number}`)}
                                        className="rounded-lg px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => onAction?.('submitMessage', `Create invoice from quotation ${q.quotation_number}`)}
                                        className="rounded-lg px-3 py-1.5 bg-violet-500/20 hover:bg-violet-500/30 text-violet-100 text-sm font-medium transition-all"
                                    >
                                        Convert
                                    </button>
                                </div>
                                <button
                                    onClick={() => downloadQuotationPDF(q)}
                                    className="rounded-lg px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium shadow-md transition-all"
                                >
                                    Download PDF
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>
        )
    }

    if (toolName === 'showQuotationFormTool') {
        const formOutput = result as {
            success: boolean
            showForm: boolean
            isEdit?: boolean
            quotationNumber?: string
            clientName: string
            projectName?: string
            gstRate?: number
            validUntilDays?: number
            applyGST?: boolean
            notes?: string
            items?: any[]
        }

        if (!formOutput?.success || !formOutput?.showForm) {
            return null
        }

        return (
            <QuotationFormCard
                clientName={formOutput.clientName}
                projectName={formOutput.projectName}
                gstRate={formOutput.gstRate}
                isEdit={formOutput.isEdit}
                quotationNumber={formOutput.quotationNumber}
                initialData={
                    formOutput.isEdit
                        ? {
                            items: formOutput.items,
                            notes: formOutput.notes,
                            validUntilDays: formOutput.validUntilDays,
                            applyGST: formOutput.applyGST,
                        }
                        : undefined
                }
                onSubmit={(data) => {
                    console.log('🧾 [ToolCard] Quotation form submitted', data)

                    // Sanitize items to match tool schema
                    const sanitizedItems = data.items.map(item => ({
                        name: item.name,
                        description: item.description || item.name,
                        quantity: item.quantity,
                        rate: item.rate,
                        unit: item.unit,
                        material: item.material,
                        size: item.size,
                        estimatedWeight: item.estimatedWeight,
                        finish: item.finish,
                        optionType: item.optionType,
                        hsnSacCode: item.hsnSacCode,
                        notes: item.notes,
                    }));

                    // Check if this is create or edit
                    const isEdit = !!data.quotationNumber;

                    let message;
                    if (isEdit) {
                        // EDIT MODE - call updateQuotationTool
                        message = `Call updateQuotationTool for ${data.quotationNumber} with these EXACT details:
                        - items: ${JSON.stringify(sanitizedItems)}
                        - applyGST: ${data.applyGST}
                        - validUntilDays: ${data.validUntilDays}
                        - notes: ${JSON.stringify(data.notes ?? data.generalNotes)}
                        - quotationDate: "${data.quotationDate}"
                        
                        Do not ask for confirmation. Execute the update immediately.`;
                    } else {
                        // CREATE MODE - call generateQuotationTool
                        message = `Call generateQuotationTool with these EXACT details:
                        - clientName: "${data.clientName}"
                        - projectName: ${data.projectName ? `"${data.projectName}"` : 'undefined'}
                        - items: ${JSON.stringify(sanitizedItems)}
                        - applyGST: ${data.applyGST}
                        - validUntilDays: ${data.validUntilDays}
                        - notes: ${JSON.stringify(data.notes ?? data.generalNotes)}
                        
                        Do not ask for confirmation. Execute immediately.`;
                    }

                    console.log('➡️ [ToolCard] Sending submitMessage', message)
                    onAction?.('submitMessage', message)
                }}
                onCancel={() => {
                    onAction?.('submitMessage', 'List quotations');
                }}
            />
        )
    }

    if (toolName === 'showCombineQuotationTool') {
        const o = result as {
            success: boolean;
            showCombineUI: boolean;
            clientName: string;
            projectName?: string;
            previewTotal: string;
            quotations: any[];
            error?: string;
        }

        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Combine Quotations" title="Unable to load quotations" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }

        return (
            <CombineQuotationCard
                quotations={o.quotations}
                clientName={o.clientName}
                projectName={o.projectName}
                previewTotal={o.previewTotal}
                onSubmit={(data) => onAction?.('combineQuotation', data)}
                onCancel={() => onAction?.('cancelCombine', {})}
            />
        )
    }

    if (toolName === 'showSplitQuotationTool') {
        const o = result as {
            success: boolean;
            showSplitUI: boolean;
            quotationNumber: string;
            clientName: string;
            projectName?: string;
            items: any[];
            error?: string;
        }

        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Split Quotation" title="Unable to load items" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }

        return (
            <SplitQuotationCard
                quotationNumber={o.quotationNumber}
                clientName={o.clientName}
                projectName={o.projectName}
                items={o.items}
                onSubmit={(data) => onAction?.('splitQuotation', data)}
                onCancel={() => onAction?.('cancelSplit', {})}
            />
        )
    }

    if (toolName === 'combineQuotationTool') {
        const o = result as {
            success: boolean;
            newQuotation?: {
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
                    <SectionHeader eyebrow="Combine Quotations" title="Merge failed" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }

        return (
            <GlassCard className="border-emerald-400/30 bg-emerald-500/10">
                <SectionHeader
                    eyebrow="Quotations Merged"
                    title={o.newQuotation?.number || 'New Quotation'}
                />
                <div className="mt-4 space-y-2 text-sm text-white/80">
                    <p>{o.message}</p>
                    {o.newQuotation && (
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="flex justify-between">
                                <span>Total Amount:</span>
                                <span className="font-bold">{o.newQuotation.total}</span>
                            </div>
                            <div className="flex justify-between mt-1">
                                <span>Items:</span>
                                <span>{o.newQuotation.itemCount}</span>
                            </div>
                        </div>
                    )}
                </div>
            </GlassCard>
        )
    }

    if (toolName === 'splitQuotationTool') {
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
                    <SectionHeader eyebrow="Split Quotation" title="Split failed" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }

        const res = o.splitResult;
        return (
            <GlassCard className="border-emerald-400/30 bg-emerald-500/10">
                <SectionHeader
                    eyebrow="Quotation Split"
                    title="Split Successful"
                />
                <p className="mt-2 text-sm text-emerald-100/80">{o.message}</p>

                {res && (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                            <h4 className="font-medium text-white mb-2">{res.partA.number} (Part A)</h4>
                            <div className="text-sm text-white/70 space-y-1">
                                <div className="flex justify-between">
                                    <span>Items:</span>
                                    <span>{res.partA.itemCount}</span>
                                </div>
                                <div className="flex justify-between font-medium text-white">
                                    <span>Total:</span>
                                    <span>{res.partA.total}</span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                            <h4 className="font-medium text-white mb-2">{res.partB.number} (Part B)</h4>
                            <div className="text-sm text-white/70 space-y-1">
                                <div className="flex justify-between">
                                    <span>Items:</span>
                                    <span>{res.partB.itemCount}</span>
                                </div>
                                <div className="flex justify-between font-medium text-white">
                                    <span>Total:</span>
                                    <span>{res.partB.total}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </GlassCard>
        )
    }

    if (toolName === 'updateQuotationTool') {
        const o = result as {
            success: boolean;
            quotation?: {
                quotationNumber: string;
                subtotal: string;
                taxAmount: string;
                totalAmount: string;
                validUntil: string;
                itemCount: number;
                status: string;
            };
            message?: string;
            error?: string;
        };

        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Quotation Update" title="Update failed" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            );
        }

        const handleDownloadPDF = async () => {
            if (!o.quotation?.quotationNumber) return;

            try {
                // Fetch full quotation data
                const { createClient } = await import('@supabase/supabase-js');
                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );

                const { data: quotationData, error } = await supabase
                    .from('quotations')
                    .select(`
                        *,
                        line_items:quotation_items(*)
                    `)
                    .eq('quotation_number', o.quotation.quotationNumber)
                    .single();

                if (error || !quotationData) {
                    console.error('Failed to fetch quotation:', error);
                    return;
                }

                // Fetch company settings
                const { data: configData } = await supabase
                    .from('business_config')
                    .select('*')
                    .limit(1)
                    .single();

                // Select appropriate bank details based on GST status
                const isGSTApplicable = quotationData.is_gst_applicable;
                const selectedBankDetails = isGSTApplicable
                    ? configData?.bank_details
                    : configData?.non_gst_bank_details;

                const companySettings = {
                    name: configData?.business_name || 'Sculpture Studio',
                    address: configData?.address || "#343/3, 13th 'B' Cross, Vyalikaval, Bangalore-560003",
                    email: configData?.email || 'mdsculpturestudio@gmail.com',
                    phone: configData?.phone || '(+91) 9632390070',
                    gstin: configData?.gstin || '29AAECS8577R1ZM',
                    bankDetails: selectedBankDetails,
                };

                // Generate PDF
                const quotationPDFData = {
                    quotationNumber: quotationData.quotation_number,
                    date: new Date(quotationData.created_at).toISOString().split('T')[0],
                    validUntil: quotationData.valid_until ? new Date(quotationData.valid_until).toISOString().split('T')[0] : '',
                    client: {
                        name: quotationData.client_name || 'Client',
                        address: quotationData.client_address || '',
                        phone: quotationData.client_phone || ''
                    },
                    project: {
                        name: quotationData.project_name || 'Project',
                        type: '',
                        deadline: ''
                    },
                    items: (quotationData.line_items || []).map((item: any) => ({
                        ...item,
                        hsnSacCode: item.hsn_sac_code || '97030090'
                    })),
                    subtotal: (quotationData.line_items || []).reduce((sum: number, item: any) => sum + (item.total || 0), 0),
                    tax: (typeof quotationData.total_amount === 'number' ? quotationData.total_amount : 0) - ((quotationData.line_items || []).reduce((sum: number, item: any) => sum + (item.total || 0), 0)),
                    total: typeof quotationData.total_amount === 'number' ? quotationData.total_amount : 0,
                    notes: quotationData.notes || '',
                    terms: quotationData.terms_and_conditions || '',
                    companySettings: companySettings
                };

                const { PDFGenerator } = await import('@/lib/ai-tools/utilities/pdf-generator');
                const pdfBytes = await PDFGenerator.generateQuotation(quotationPDFData);

                const base64Pdf = btoa(String.fromCharCode(...pdfBytes));
                const pdfDataUrl = `data:application/pdf;base64,${base64Pdf}`;

                const link = document.createElement('a');
                link.href = pdfDataUrl;
                link.download = `${quotationData.quotation_number}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (error) {
                console.error('PDF generation failed:', error);
            }
        };

        return (
            <GlassCard className="border-emerald-400/30 bg-emerald-500/10">
                <SectionHeader
                    eyebrow="Quotation Updated"
                    title={o.quotation?.quotationNumber || 'Quotation'}
                />
                <p className="mt-2 text-sm text-emerald-100/80">{o.message}</p>

                {o.quotation && (
                    <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-white/60">New Total:</span>
                            <span className="font-bold text-white">{o.quotation.totalAmount}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-white/60">Valid Until:</span>
                            <span className="font-medium text-white">
                                {new Date(o.quotation.validUntil).toLocaleDateString('en-IN')}
                            </span>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleDownloadPDF}
                    className="mt-4 w-full rounded-lg px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium shadow-md transition-all"
                >
                    Download PDF
                </button>
            </GlassCard>
        )
    }

    if (toolName === 'generateQuotationTool') {
        const o = result as {
            success: boolean;
            quotation?: {
                id: string;
                quotationNumber: string;
                projectName: string;
                clientName: string;
                subtotal: string;
                taxType: string;
                taxAmount: string;
                totalAmount: string;
                validUntil: string;
                itemCount: number;
                status: string;
                pdfDataUrl: string;
                clientCreated: boolean;
            };
            message?: string;
            error?: string;
        }

        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Quotation Generation" title="Generation Failed" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }

        const handleDownload = () => {
            if (o.quotation?.pdfDataUrl) {
                const link = document.createElement('a');
                link.href = o.quotation.pdfDataUrl;
                link.download = `${o.quotation.quotationNumber}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        };

        return (
            <GlassCard className="border-emerald-400/30 bg-emerald-500/10">
                <SectionHeader
                    eyebrow="Quotation Generated"
                    title={o.quotation?.quotationNumber || 'New Quotation'}
                    meta={
                        o.quotation?.clientCreated && (
                            <Badge className="bg-emerald-500/20 text-emerald-100 border-emerald-500/30">
                                New Client
                            </Badge>
                        )
                    }
                />

                <p className="mt-2 text-sm text-emerald-100/80">{o.message}</p>

                {o.quotation && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                            <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Client</div>
                            <div className="font-medium text-white">{o.quotation.clientName}</div>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                            <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Project</div>
                            <div className="font-medium text-white">{o.quotation.projectName}</div>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm col-span-2 sm:col-span-1">
                            <div className="flex justify-between items-center">
                                <span className="text-white/60 text-xs uppercase tracking-wider">Total Amount</span>
                                <span className="font-bold text-lg text-white">{o.quotation.totalAmount}</span>
                            </div>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm col-span-2 sm:col-span-1">
                            <div className="flex justify-between items-center">
                                <span className="text-white/60 text-xs uppercase tracking-wider">Valid Until</span>
                                <span className="font-medium text-white">{new Date(o.quotation.validUntil).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={handleDownload}
                        className="flex-1 rounded-lg px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium shadow-lg shadow-violet-900/20 transition-all active:scale-[0.98]"
                    >
                        Download PDF
                    </button>
                    <button
                        onClick={() => onAction?.('submitMessage', `Show edit form for quotation ${o.quotation?.quotationNumber}`)}
                        className="rounded-lg px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
                    >
                        Edit
                    </button>
                </div>
            </GlassCard>
        )
    }

    // Handle generic success cases
    if ([
        'createQuotationTool',
        'updateQuotationStatusTool',
        'addQuotationItemTool',
        'convertQuotationToInvoiceTool',
        'generateCreditNoteTool',
        'generateDebitNoteTool'
    ].includes(toolName)) {
        return <GenericSuccessCard output={result as GenericSuccessOutput} toolName={toolName} />
    }

    return <FallbackCard toolName={toolName} output={result} />
}
