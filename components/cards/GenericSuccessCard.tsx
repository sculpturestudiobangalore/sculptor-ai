import React from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2, User, Briefcase, Package, Building, DollarSign } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GenericSuccessOutput } from '@/types/tool-types'

const SectionHeader = ({
    eyebrow,
    title,
}: {
    eyebrow: string
    title: string
}) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/45">{eyebrow}</p>
            <h3 className="text-xl font-semibold text-white sm:text-2xl">{title}</h3>
        </div>
    </div>
)

export default function GenericSuccessCard({
    output,
    toolName
}: {
    output?: GenericSuccessOutput;
    toolName: string
}) {
    if (!output?.success) {
        return (
            <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                <SectionHeader
                    eyebrow="Operation failed"
                    title="Unable to complete action"
                />
                <p className="mt-3 text-sm text-rose-100/80">
                    {output?.message || 'Please try again or check your inputs.'}
                </p>
            </GlassCard>
        )
    }

    const getToolDisplayName = (tool: string): string => {
        const nameMap: Record<string, string> = {
            createClientTool: 'Client Creation',
            updateClientTool: 'Client Update',
            generateClientUpdateTool: 'Client Update',
            updateClientStateTool: 'State Update',
            addProjectMaterialTool: 'Material Allocation',
            updateProjectTool: 'Project Update',
            addProjectPhotoTool: 'Photo Added',
            updateTaskProgressTool: 'Task Progress',
            assignTaskTool: 'Task Assignment',
            addMaterialTool: 'Material Added',
            updateMaterialStockTool: 'Stock Updated',
            recordMaterialUsageTool: 'Usage Recorded',
            recordMaterialPurchaseTool: 'Purchase Recorded',
            addVendorTool: 'Vendor Added',
            addQuotationItemTool: 'Quotation Item',
            updateQuotationStatusTool: 'Quotation Status',
            convertQuotationToInvoiceTool: 'Invoice Created',
            updateInvoiceStatusTool: 'Invoice Status',
            recordPaymentTool: 'Payment Recorded',
            generateCreditNoteTool: 'Credit Note',
            generateDebitNoteTool: 'Debit Note',
            generatePaymentReceiptTool: 'Receipt Generated',
            cancelInvoiceTool: 'Invoice Cancelled',
        }
        return nameMap[tool] || tool.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace('Tool', '')
    }

    const getIcon = (tool: string) => {
        if (tool.includes('Client')) return <User className="h-5 w-5" />
        if (tool.includes('Project') || tool.includes('Task')) return <Briefcase className="h-5 w-5" />
        if (tool.includes('Material')) return <Package className="h-5 w-5" />
        if (tool.includes('Vendor')) return <Building className="h-5 w-5" />
        if (tool.includes('Payment') || tool.includes('Invoice') || tool.includes('Quotation')) return <DollarSign className="h-5 w-5" />
        return <CheckCircle2 className="h-5 w-5" />
    }

    return (
        <GlassCard className="border-emerald-400/30 bg-emerald-500/10">
            <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-400/20 p-2">
                    {getIcon(toolName)}
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">
                        {getToolDisplayName(toolName)}
                    </h3>
                    <p className="text-sm text-emerald-100/80">
                        Completed successfully
                    </p>
                </div>
            </div>

            {output.message && (
                <p className="mt-4 text-sm text-white/80">{output.message}</p>
            )}

            {/* Show additional data if present */}
            {output && Object.keys(output).filter(key => !['success', 'message', 'error'].includes(key)).length > 0 && (
                <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-medium text-white/60 mb-2">Details:</p>
                    <div className="text-sm text-white/80 space-y-1">
                        {Object.entries(output).map(([key, value]) => {
                            if (['success', 'message', 'error'].includes(key)) return null
                            return (
                                <div key={key} className="flex justify-between">
                                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                                    <span className="font-medium">
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </GlassCard>
    )
}
