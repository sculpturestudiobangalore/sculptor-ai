import React, { useState } from 'react'
import { User, Phone, Mail, MapPin, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import VendorEditCard from './VendorEditCard'

interface VendorCardProps {
    vendor: any
    onAction?: (action: string, data: any) => void
}

export default function VendorCard({ vendor, onAction }: VendorCardProps) {
    const [isEditing, setIsEditing] = useState(false)

    if (isEditing) {
        return (
            <VendorEditCard
                vendor={vendor}
                onAction={onAction}
                onCancel={() => setIsEditing(false)}
            />
        )
    }

    return (
        <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="font-medium text-white">{vendor.name}</h3>
                    {vendor.contact_person && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-white/50">
                            <User className="h-3 w-3" /> {vendor.contact_person}
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setIsEditing(true)}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                    title="Edit Vendor"
                >
                    <Edit2 className="h-4 w-4 text-white/70" />
                </button>
            </div>

            <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
                {vendor.phone && (
                    <div className="flex items-center gap-2 text-xs text-white/70">
                        <Phone className="h-3 w-3 text-white/40" /> {vendor.phone}
                    </div>
                )}
                {vendor.email && (
                    <div className="flex items-center gap-2 text-xs text-white/70">
                        <Mail className="h-3 w-3 text-white/40" /> {vendor.email}
                    </div>
                )}
                {vendor.address && (
                    <div className="flex items-center gap-2 text-xs text-white/70">
                        <MapPin className="h-3 w-3 text-white/40" /> {vendor.address}
                    </div>
                )}
            </div>

            {vendor.materials_supplied && vendor.materials_supplied.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1">
                    {vendor.materials_supplied.map((m: string, i: number) => (
                        <span key={i} className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-white/60">
                            {m}
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}
