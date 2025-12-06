import React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import GlassCard, { SectionHeader } from '@/components/ui/GlassCard'
import GenericSuccessCard from '../cards/GenericSuccessCard'
import MaterialCard from '../cards/MaterialCard'
import VendorCard from '../cards/VendorCard'
import FallbackCard from '../cards/FallbackCard'
import { GenericSuccessOutput } from '@/types/tool-types'

interface InventoryRendererProps {
    toolName: string
    result: any
    onAction?: (action: string, data: any) => void
}

export function InventoryRenderer({ toolName, result, onAction }: InventoryRendererProps) {
    // Generic Success Cases
    if ([
        'addMaterialTool',
        'updateMaterialStockTool',
        'recordMaterialUsageTool',
        'recordMaterialPurchaseTool',
        'recordMaterialPurchaseTool',
        'addVendorTool',
        'updateMaterialTool',
        'updateVendorTool'
    ].includes(toolName)) {
        return <GenericSuccessCard output={result as GenericSuccessOutput} toolName={toolName} />
    }

    if (toolName === 'listMaterialsTool') {
        const o = result as { success: boolean; materials?: any[]; error?: string }
        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Materials" title="Unable to fetch materials" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }
        if (!o.materials || o.materials.length === 0) {
            return (
                <GlassCard>
                    <SectionHeader eyebrow="Materials" title="No materials found" />
                    <p className="mt-3 text-sm text-white/70">Add materials to manage your inventory.</p>
                </GlassCard>
            )
        }
        return (
            <GlassCard>
                <SectionHeader
                    eyebrow="Material Inventory"
                    title="Available Materials"
                    meta={<Badge variant="secondary">{o.materials.length} items</Badge>}
                />
                <div className="mt-4 space-y-3 max-h-80 overflow-auto">
                    {o.materials.map((mat) => (
                        <MaterialCard key={mat.id} material={mat} onAction={onAction} />
                    ))}
                </div>
            </GlassCard>
        )
    }

    if (toolName === 'generateReorderListTool') {
        const o = result as { success: boolean; reorderList?: any[]; error?: string }
        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Reorder List" title="Unable to generate list" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }
        if (!o.reorderList || o.reorderList.length === 0) {
            return (
                <GlassCard>
                    <SectionHeader eyebrow="Inventory Status" title="All materials stocked" />
                    <p className="mt-3 text-sm text-white/70">No reordering needed at this time.</p>
                </GlassCard>
            )
        }
        return (
            <GlassCard>
                <SectionHeader
                    eyebrow="Reorder Alert"
                    title="Materials Need Restocking"
                    meta={<Badge variant="secondary" className="bg-amber-500/25 text-amber-100">{o.reorderList.length} items</Badge>}
                />
                <div className="mt-4 space-y-3">
                    {o.reorderList.map((mat) => (
                        <div key={mat.id} className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-amber-100">{mat.name}</h4>
                                    <p className="text-xs text-amber-100/80">Supplier: {mat.supplier || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium text-amber-100">
                                        Stock: {mat.quantity_available} / Reorder: {mat.reorder_level}
                                    </div>
                                    <div className="text-xs text-amber-100/80 mb-2">Urgent restock needed</div>
                                    <button
                                        onClick={() => onAction?.('submitMessage', `Record purchase for ${mat.name}`)}
                                        className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 px-2 py-1 rounded transition-colors"
                                    >
                                        Order
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>
        )
    }

    if (toolName === 'listVendorsTool') {
        const o = result as { success: boolean; vendors?: any[]; error?: string }
        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Vendors" title="Unable to fetch vendors" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }
        if (!o.vendors || o.vendors.length === 0) {
            return (
                <GlassCard>
                    <SectionHeader eyebrow="Vendors" title="No vendors found" />
                    <p className="mt-3 text-sm text-white/70">Add vendors to manage your suppliers.</p>
                </GlassCard>
            )
        }
        return (
            <GlassCard>
                <SectionHeader
                    eyebrow="Vendor Directory"
                    title="Supplier Contacts"
                    meta={<Badge variant="secondary">{o.vendors.length} vendors</Badge>}
                />
                <div className="mt-4 space-y-3">
                    {o.vendors.map((vendor) => (
                        <VendorCard key={vendor.id} vendor={vendor} onAction={onAction} />
                    ))}
                </div>
            </GlassCard>
        )
    }

    if (toolName === 'listMaterialPurchasesTool') {
        const o = result as { success: boolean; purchases?: any[]; error?: string }
        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Purchases" title="Unable to fetch purchases" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }
        if (!o.purchases || o.purchases.length === 0) {
            return (
                <GlassCard>
                    <SectionHeader eyebrow="Purchases" title="No purchases found" />
                    <p className="mt-3 text-sm text-white/70">Record purchases to track expenses.</p>
                </GlassCard>
            )
        }
        return (
            <GlassCard>
                <SectionHeader
                    eyebrow="Purchase History"
                    title="Material Purchases"
                    meta={<Badge variant="secondary">{o.purchases.length} records</Badge>}
                />
                <div className="mt-4 space-y-3">
                    {o.purchases.map((p) => (
                        <div key={p.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-white">{p.material_name}</h4>
                                    <p className="text-xs text-white/60">
                                        {p.quantity} {p.unit} from {p.vendor_name}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium text-white">₹{p.total_cost}</div>
                                    <div className="text-xs text-white/60">{new Date(p.purchase_date).toLocaleDateString()}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>
        )
    }

    if (toolName === 'getVendorHistoryTool') {
        const o = result as { success: boolean; history?: any[]; vendor?: any; error?: string }
        if (!o?.success) {
            return (
                <GlassCard className="border-rose-400/30 bg-rose-500/10 text-rose-100">
                    <SectionHeader eyebrow="Vendor History" title="Unable to fetch history" />
                    <p className="mt-3 text-sm text-rose-100/80">{o?.error}</p>
                </GlassCard>
            )
        }

        return (
            <GlassCard>
                <SectionHeader
                    eyebrow="Vendor History"
                    title={o.vendor?.name || 'Vendor Details'}
                    meta={<Badge variant="secondary">{o.history?.length || 0} transactions</Badge>}
                />
                <div className="mt-4 space-y-3">
                    {o.history?.map((h) => (
                        <div key={h.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-white">{h.material_name}</h4>
                                    <p className="text-xs text-white/60">
                                        {h.quantity} {h.unit}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium text-white">₹{h.total_cost}</div>
                                    <div className="text-xs text-white/60">{new Date(h.purchase_date).toLocaleDateString()}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>
        )
    }

    return <FallbackCard toolName={toolName} output={result} />
}
