'use client'

import React, { useState } from 'react'
import { Mail, Phone, Building, MapPin, Save, X, Edit2, Briefcase, FileText, Receipt } from 'lucide-react'

// Using YOUR exact type from tool-card.tsx
type ClientCard = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company?: string | null;
    address?: string | null;
    notes?: string | null;
    priority?: string | null;
    state_code?: string | null;
    gstin?: string | null;
    gstType?: string | null;
    gstRate?: number | null;
    projectCount?: number;
    created_at?: string;
    updated_at?: string;
};

const baseCardStyle = "rounded-[28px] border border-white/12 bg-white/10 p-6 text-white/90 backdrop-blur-[70px] shadow-[0_45px_140px_rgba(17,0,58,0.55)]"

export default function ClientCardComponent({
    client,
    onAction
}: {
    client: ClientCard
    onAction?: (action: string, data: string) => void
}) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedData, setEditedData] = useState<ClientCard>(client)
    const [isSaving, setIsSaving] = useState(false)

    const handleEdit = (field: keyof ClientCard, value: any) => {
        setEditedData(prev => ({ ...prev, [field]: value }))
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            // Filter out null, undefined, and empty string values
            const updates: Record<string, any> = {}
            const fieldsToUpdate = ['name', 'email', 'phone', 'company', 'priority', 'state_code', 'gstin'] as const

            fieldsToUpdate.forEach(field => {
                const value = editedData[field]
                // Only include fields with actual values (not null, undefined, or empty string)
                if (value !== null && value !== undefined && value !== '') {
                    updates[field] = value
                }
            })

            // Check if there are any actual updates
            if (Object.keys(updates).length === 0) {
                console.warn('No fields to update')
                setIsSaving(false)
                return
            }

            // Construct message with only the fields that have values
            const updateParams = Object.entries(updates)
                .map(([key, value]) => `${key}="${value}"`)
                .join(', ')

            const updateMessage = `Call updateClientTool to update client "${client.name}" (ID: ${client.id}) with these details: ${updateParams}`

            onAction?.('submitMessage', updateMessage)
            setIsEditing(false)
        } catch (error) {
            console.error('Failed to update client:', error)
        } finally {
            setIsSaving(false)
        }
    }


    const handleCancel = () => {
        setEditedData(client)
        setIsEditing(false)
    }

    const data = isEditing ? editedData : client

    const priorityColors: Record<string, string> = {
        high: 'bg-rose-500/30 text-rose-100',
        medium: 'bg-amber-400/30 text-amber-100',
        low: 'bg-emerald-400/25 text-emerald-100',
    }

    return (
        <div className={baseCardStyle} style={{ minWidth: 320 }}>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                    <div className="text-xs uppercase tracking-[0.35em] text-white/45 mb-2">Client profile</div>
                    {isEditing ? (
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => handleEdit('name', e.target.value)}
                            className="text-2xl font-semibold text-white bg-white/10 border border-white/20 rounded-lg px-3 py-2 w-full focus:outline-none focus:border-violet-400 transition-all"
                            placeholder="Client name"
                        />
                    ) : (
                        <h2 className="text-2xl font-semibold text-white">{data.name}</h2>
                    )}
                </div>

                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="ml-4 p-2.5 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all"
                        title="Edit client"
                    >
                        <Edit2 className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Company & Priority */}
            <div className="flex items-center justify-between mb-4">
                {isEditing ? (
                    <input
                        type="text"
                        value={data.company || ''}
                        onChange={(e) => handleEdit('company', e.target.value)}
                        className="flex-1 text-sm text-white/70 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-400 mr-2"
                        placeholder="Company name"
                    />
                ) : (
                    data.company && <p className="text-sm text-white/70">{data.company}</p>
                )}

                {data.priority && !isEditing && (
                    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${priorityColors[data.priority] || 'bg-white/15 text-white'}`}>
                        {data.priority} priority
                    </span>
                )}

                {isEditing && (
                    <select
                        value={data.priority || 'medium'}
                        onChange={(e) => handleEdit('priority', e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-violet-400"
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                )}
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
                {/* Email */}
                <div>
                    <label className="text-xs text-white/60 flex items-center gap-2 mb-1">
                        <Mail className="h-3 w-3" /> Email
                    </label>
                    {isEditing ? (
                        <input
                            type="email"
                            value={data.email || ''}
                            onChange={(e) => handleEdit('email', e.target.value)}
                            className="w-full text-sm text-white/90 bg-white/10 border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:border-violet-400"
                            placeholder="email@example.com"
                        />
                    ) : (
                        <p className="text-sm text-white/90">{data.email || '—'}</p>
                    )}
                </div>

                {/* Phone */}
                <div>
                    <label className="text-xs text-white/60 flex items-center gap-2 mb-1">
                        <Phone className="h-3 w-3" /> Phone
                    </label>
                    {isEditing ? (
                        <input
                            type="tel"
                            value={data.phone || ''}
                            onChange={(e) => handleEdit('phone', e.target.value)}
                            className="w-full text-sm text-white/90 bg-white/10 border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:border-violet-400"
                            placeholder="+91 00000 00000"
                        />
                    ) : (
                        <p className="text-sm text-white/90">{data.phone || '—'}</p>
                    )}
                </div>

                {/* State */}
                <div>
                    <label className="text-xs text-white/60 mb-1 block">State Code</label>
                    {isEditing ? (
                        <input
                            type="text"
                            value={data.state_code || ''}
                            onChange={(e) => handleEdit('state_code', e.target.value)}
                            className="w-full text-sm text-white/90 bg-white/10 border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:border-violet-400"
                            placeholder="MH"
                            maxLength={2}
                        />
                    ) : (
                        <p className="text-sm text-white/90">State: {data.state_code || '—'}</p>
                    )}
                </div>

                {/* GST */}
                {(data.gstin || isEditing) && (
                    <div className="border-t border-white/10 pt-3">
                        <label className="text-xs text-white/60 mb-2 block">GST Details</label>
                        {isEditing ? (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={data.gstin || ''}
                                    onChange={(e) => handleEdit('gstin', e.target.value)}
                                    className="w-full text-sm text-white/90 bg-white/10 border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:border-violet-400"
                                    placeholder="GSTIN"
                                    maxLength={15}
                                />
                                <div className="flex gap-2">
                                    <select
                                        value={data.gstType || 'igst'}
                                        onChange={(e) => handleEdit('gstType', e.target.value)}
                                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-violet-400"
                                    >
                                        <option value="cgst_sgst">CGST+SGST</option>
                                        <option value="igst">IGST</option>
                                    </select>
                                    <input
                                        type="number"
                                        value={data.gstRate || 18}
                                        onChange={(e) => handleEdit('gstRate', parseFloat(e.target.value))}
                                        className="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-violet-400"
                                        placeholder="18"
                                        min="0"
                                        max="28"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-xs text-white/70">
                                <FileText className="h-4 w-4 text-white/50" />
                                GST ready • {data.gstType} {data.gstRate ? `(${data.gstRate}%)` : ''}
                            </div>
                        )}
                    </div>
                )}

                {/* Address */}
                {(data.address || isEditing) && (
                    <div className="border-t border-white/10 pt-3">
                        <label className="text-xs text-white/60 mb-1 block">Address</label>
                        {isEditing ? (
                            <textarea
                                value={data.address || ''}
                                onChange={(e) => handleEdit('address', e.target.value)}
                                className="w-full text-sm text-white/90 bg-white/10 border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:border-violet-400 min-h-[60px]"
                                placeholder="Full address"
                            />
                        ) : (
                            <p className="text-xs text-white/70">{data.address}</p>
                        )}
                    </div>
                )}

                {/* Project Count */}
                <div className="flex items-center justify-between text-xs border-t border-white/10 pt-2">
                    <span>Projects: <b>{data.projectCount ?? 0}</b></span>
                    <span>Since {data.created_at ? new Date(data.created_at).getFullYear() : 'N/A'}</span>
                </div>
            </div>

            {/* Action Buttons */}
            {isEditing ? (
                <div className="flex gap-3 pt-4 border-t border-white/10 mt-4">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 disabled:bg-violet-500/50 text-white rounded-xl transition-all font-medium"
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="px-4 py-2.5 bg-white/10 hover:bg-white/15 disabled:bg-white/5 border border-white/20 text-white/90 rounded-xl transition-all font-medium flex items-center gap-2"
                    >
                        <X className="h-4 w-4" />
                        Cancel
                    </button>
                </div>
            ) : (
                <div className="flex gap-2 pt-4 border-t border-white/10 mt-4">
                    <button
                        onClick={() => onAction?.('submitMessage', `Show all projects for ${client.name}`)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl transition-all text-sm"
                    >
                        <Briefcase className="h-4 w-4" />
                        Projects
                    </button>
                    <button
                        onClick={() => onAction?.('submitMessage', `Show all quotations for ${client.name}`)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl transition-all text-sm"
                    >
                        <FileText className="h-4 w-4" />
                        Quotations
                    </button>
                    <button
                        onClick={() => onAction?.('submitMessage', `Show all invoices for ${client.name}`)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl transition-all text-sm"
                    >
                        <Receipt className="h-4 w-4" />
                        Invoices
                    </button>

                </div>
            )}
        </div>
    )
}
