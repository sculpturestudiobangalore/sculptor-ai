import React, { useState } from 'react'
import { Save, X, Phone, Mail, MapPin, User, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VendorEditCardProps {
    vendor: {
        id: string
        name: string
        contact_person?: string
        phone?: string
        email?: string
        address?: string
        notes?: string
        materials_supplied?: string[]
    }
    onAction?: (action: string, data: any) => void
    onCancel?: () => void
}

export default function VendorEditCard({ vendor, onAction, onCancel }: VendorEditCardProps) {
    const [formData, setFormData] = useState({
        name: vendor.name,
        contact_person: vendor.contact_person || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        address: vendor.address || '',
        notes: vendor.notes || '',
        materials_supplied: vendor.materials_supplied?.join(', ') || ''
    })

    const [isSaving, setIsSaving] = useState(false)

    const handleSubmit = () => {
        setIsSaving(true)
        // Construct natural language command
        const updates = []
        if (formData.name !== vendor.name) updates.push(`name to "${formData.name}"`)
        if (formData.contact_person !== vendor.contact_person) updates.push(`contact person to "${formData.contact_person}"`)
        if (formData.phone !== vendor.phone) updates.push(`phone to "${formData.phone}"`)
        if (formData.email !== vendor.email) updates.push(`email to "${formData.email}"`)
        if (formData.address !== vendor.address) updates.push(`address to "${formData.address}"`)
        if (formData.notes !== vendor.notes) updates.push(`notes to "${formData.notes}"`)

        const currentMaterials = vendor.materials_supplied?.join(', ') || ''
        if (formData.materials_supplied !== currentMaterials) {
            // We need to handle array update carefully in natural language
            // Or just say "materials supplied to [list]"
            updates.push(`materials supplied to [${formData.materials_supplied}]`)
        }

        if (updates.length === 0) {
            onCancel?.()
            return
        }

        const command = `Update vendor "${vendor.name}" with ${updates.join(', ')}`
        console.log('📝 [VendorEditCard] Updating vendor:', command)
        onAction?.('submitMessage', command)
    }

    const baseInputStyle = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/20"

    return (
        <div className="rounded-[28px] border border-white/12 bg-white/10 p-6 text-white/90 backdrop-blur-[70px] shadow-[0_45px_140px_rgba(17,0,58,0.55)] max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="text-xs uppercase tracking-wider text-white/50 mb-1">Edit Vendor</div>
                    <h2 className="text-xl font-semibold text-white">{vendor.name}</h2>
                </div>
                <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X className="h-5 w-5 text-white/70" />
                </button>
            </div>

            <div className="space-y-4">
                {/* Name */}
                <div>
                    <label className="text-xs text-white/60 mb-1.5 block">Vendor Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className={baseInputStyle}
                        placeholder="Vendor name"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Contact Person */}
                    <div>
                        <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
                            <User className="h-3 w-3" /> Contact Person
                        </label>
                        <input
                            type="text"
                            value={formData.contact_person}
                            onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                            className={baseInputStyle}
                            placeholder="Name"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
                            <Phone className="h-3 w-3" /> Phone
                        </label>
                        <input
                            type="text"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className={baseInputStyle}
                            placeholder="Phone number"
                        />
                    </div>
                </div>

                {/* Email */}
                <div>
                    <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email
                    </label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className={baseInputStyle}
                        placeholder="email@example.com"
                    />
                </div>

                {/* Address */}
                <div>
                    <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Address
                    </label>
                    <input
                        type="text"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        className={baseInputStyle}
                        placeholder="Full address"
                    />
                </div>

                {/* Materials Supplied */}
                <div>
                    <label className="text-xs text-white/60 mb-1.5 block">Materials Supplied (comma separated)</label>
                    <input
                        type="text"
                        value={formData.materials_supplied}
                        onChange={e => setFormData({ ...formData, materials_supplied: e.target.value })}
                        className={baseInputStyle}
                        placeholder="e.g. Cement, Steel, Bricks"
                    />
                </div>

                {/* Notes */}
                <div>
                    <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Notes
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        className={cn(baseInputStyle, "min-h-[80px] resize-none")}
                        placeholder="Additional notes..."
                    />
                </div>
            </div>

            <div className="mt-8 flex gap-3">
                <button
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="flex-1 bg-violet-500 hover:bg-violet-600 text-white py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                    onClick={onCancel}
                    disabled={isSaving}
                    className="px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2.5 rounded-xl font-medium transition-all"
                >
                    Cancel
                </button>
            </div>
        </div>
    )
}
