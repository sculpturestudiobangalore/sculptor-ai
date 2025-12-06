import React, { useState } from 'react'
import { Package, Tag, DollarSign, AlertTriangle, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import MaterialEditCard from './MaterialEditCard'

interface MaterialCardProps {
    material: any
    onAction?: (action: string, data: any) => void
}

export default function MaterialCard({ material, onAction }: MaterialCardProps) {
    const [isEditing, setIsEditing] = useState(false)

    if (isEditing) {
        return (
            <MaterialEditCard
                material={material}
                onAction={onAction}
                onCancel={() => setIsEditing(false)}
            />
        )
    }

    const isLowStock = material.reorder_level && material.quantity_available <= material.reorder_level

    return (
        <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10">
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">{material.name}</h3>
                        {isLowStock && (
                            <span className="flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-medium text-rose-300 border border-rose-500/30">
                                <AlertTriangle className="h-3 w-3" /> Low Stock
                            </span>
                        )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-white/50">
                        {material.category && (
                            <span className="flex items-center gap-1">
                                <Tag className="h-3 w-3" /> {material.category}
                            </span>
                        )}
                        {material.supplier && (
                            <span>• {material.supplier}</span>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => setIsEditing(true)}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                    title="Edit Material"
                >
                    <Edit2 className="h-4 w-4 text-white/70" />
                </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40">Stock</div>
                    <div className={cn(
                        "mt-0.5 text-sm font-medium",
                        isLowStock ? "text-rose-300" : "text-emerald-300"
                    )}>
                        {material.quantity_available} {material.unit}
                    </div>
                </div>
                <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40">Unit Cost</div>
                    <div className="mt-0.5 text-sm font-medium text-white/80">
                        ${material.unit_cost?.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    )
}
