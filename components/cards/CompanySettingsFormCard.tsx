'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface BankDetails {
    accountName: string
    bankName: string
    accountNumber: string
    ifscCode: string
    branch?: string
    pan?: string
}

interface CompanySettings {
    businessName: string
    businessAddress: string
    businessEmail: string
    businessPhone: string
    gstin: string
    pan: string
    stateCode: string
    gstRate: number
    hsnCode: string
    sacCode: string
    quotationTerms: string
    invoiceTerms: string
    gstBankDetails: BankDetails
    nonGstBankDetails: BankDetails
}

interface CompanySettingsFormCardProps {
    initialSettings: CompanySettings
    onSubmit: (settings: CompanySettings) => void
    onCancel: () => void
}

export default function CompanySettingsFormCard({
    initialSettings,
    onSubmit,
    onCancel
}: CompanySettingsFormCardProps) {
    const [settings, setSettings] = useState<CompanySettings>(initialSettings)

    const handleChange = (field: keyof CompanySettings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }))
    }

    const handleBankDetailsChange = (
        type: 'gstBankDetails' | 'nonGstBankDetails',
        field: keyof BankDetails,
        value: string
    ) => {
        setSettings(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: value
            }
        }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit(settings)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 p-6 rounded-2xl border border-white/12 bg-white/6 text-white shadow-[0_20px_60px_rgba(25,10,90,0.15)]">
            <div>
                <h3 className="text-xl font-semibold text-white mb-4">Company Settings</h3>
                <p className="text-sm text-white/60 mb-6">Edit your business details, bank information, and terms & conditions.</p>
            </div>

            {/* Business Information */}
            <div className="space-y-4">
                <h4 className="text-sm font-semibold text-violet-300 uppercase tracking-wider">Business Information</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-white/80">Business Name</Label>
                        <Input
                            value={settings.businessName}
                            onChange={(e) => handleChange('businessName', e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>

                    <div>
                        <Label className="text-white/80">Email</Label>
                        <Input
                            type="email"
                            value={settings.businessEmail}
                            onChange={(e) => handleChange('businessEmail', e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-white/80">Phone</Label>
                        <Input
                            value={settings.businessPhone}
                            onChange={(e) => handleChange('businessPhone', e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>

                    <div>
                        <Label className="text-white/80">State Code</Label>
                        <Input
                            value={settings.stateCode}
                            onChange={(e) => handleChange('stateCode', e.target.value)}
                            placeholder="e.g., 29"
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>
                </div>

                <div>
                    <Label className="text-white/80">Address</Label>
                    <Textarea
                        value={settings.businessAddress}
                        onChange={(e) => handleChange('businessAddress', e.target.value)}
                        className="bg-white/5 border-white/10 text-white min-h-[80px]"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label className="text-white/80">GSTIN</Label>
                        <Input
                            value={settings.gstin}
                            onChange={(e) => handleChange('gstin', e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>

                    <div>
                        <Label className="text-white/80">PAN</Label>
                        <Input
                            value={settings.pan}
                            onChange={(e) => handleChange('pan', e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>

                    <div>
                        <Label className="text-white/80">GST Rate (%)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={settings.gstRate}
                            onChange={(e) => handleChange('gstRate', parseFloat(e.target.value) || 0)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-white/80">HSN Code</Label>
                        <Input
                            value={settings.hsnCode}
                            onChange={(e) => handleChange('hsnCode', e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>

                    <div>
                        <Label className="text-white/80">SAC Code</Label>
                        <Input
                            value={settings.sacCode}
                            onChange={(e) => handleChange('sacCode', e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>
                </div>
            </div>

            {/* GST Bank Details */}
            <div className="space-y-4 pt-4 border-t border-white/10">
                <h4 className="text-sm font-semibold text-violet-300 uppercase tracking-wider">GST Bank Details (For GST Invoices)</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-white/80">Account Name</Label>
                        <Input
                            value={settings.gstBankDetails.accountName}
                            onChange={(e) => handleBankDetailsChange('gstBankDetails', 'accountName', e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>

                    <div>
                        <Label className="text-white/80">Bank Name</Label>
                        <Input
                            value={settings.gstBankDetails.bankName}
                            onChange={(e) => handleBankDetailsChange('gstBankDetails', 'bankName', e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-white/80">Account Number</Label>
                        <Input
                            value={settings.gstBankDetails.accountNumber}
                            onChange={(e) => handleBankDetailsChange('gstBankDetails', 'accountNumber', e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>

                    <div>
                        <Label className="text-white/80">IFSC Code</Label>
                        <Input
                            value={settings.gstBankDetails.ifscCode}
                            onChange={(e) => handleBankDetailsChange('gstBankDetails', 'ifscCode', e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-white/80">Branch</Label>
                        <Input
                            value={settings.gstBankDetails.branch}
                            onChange={(e) => handleBankDetailsChange('gstBankDetails', 'branch', e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>

                    <div>
                        <Label className="text-white/80">PAN</Label>
                        <Input
                            value={settings.gstBankDetails.pan}
                            onChange={(e) => handleBankDetailsChange('gstBankDetails', 'pan', e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>
                </div>
            </div>

            {/* Non-GST Bank Details */}
            <div className="space-y-4 pt-4 border-t border-white/10">
                <h4 className="text-sm font-semibold text-violet-300 uppercase tracking-wider">Non-GST Bank Details (For Non-GST Invoices)</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-white/80">Account Name</Label>
                        <Input
                            value={settings.nonGstBankDetails.accountName}
                            onChange={(e) => handleBankDetailsChange('nonGstBankDetails', 'accountName', e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>

                    <div>
                        <Label className="text-white/80">Bank Name</Label>
                        <Input
                            value={settings.nonGstBankDetails.bankName}
                            onChange={(e) => handleBankDetailsChange('nonGstBankDetails', 'bankName', e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-white/80">Account Number</Label>
                        <Input
                            value={settings.nonGstBankDetails.accountNumber}
                            onChange={(e) => handleBankDetailsChange('nonGstBankDetails', 'accountNumber', e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>

                    <div>
                        <Label className="text-white/80">IFSC Code</Label>
                        <Input
                            value={settings.nonGstBankDetails.ifscCode}
                            onChange={(e) => handleBankDetailsChange('nonGstBankDetails', 'ifscCode', e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>
                </div>

                <div>
                    <Label className="text-white/80">Branch</Label>
                    <Input
                        value={settings.nonGstBankDetails.branch}
                        onChange={(e) => handleBankDetailsChange('nonGstBankDetails', 'branch', e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                    />
                </div>
            </div>

            {/* Terms & Conditions */}
            <div className="space-y-4 pt-4 border-t border-white/10">
                <h4 className="text-sm font-semibold text-violet-300 uppercase tracking-wider">Terms & Conditions</h4>

                <div>
                    <Label className="text-white/80">Quotation Terms</Label>
                    <Textarea
                        value={settings.quotationTerms}
                        onChange={(e) => handleChange('quotationTerms', e.target.value)}
                        className="bg-white/5 border-white/10 text-white min-h-[100px]"
                        placeholder="Enter default terms for quotations..."
                    />
                </div>

                <div>
                    <Label className="text-white/80">Invoice Terms</Label>
                    <Textarea
                        value={settings.invoiceTerms}
                        onChange={(e) => handleChange('invoiceTerms', e.target.value)}
                        className="bg-white/5 border-white/10 text-white min-h-[100px]"
                        placeholder="Enter default terms for invoices..."
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
                <Button
                    type="submit"
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                >
                    Save Changes
                </Button>
                <Button
                    type="button"
                    onClick={onCancel}
                    variant="outline"
                    className="border-white/20 text-white/80 hover:bg-white/10"
                >
                    Cancel
                </Button>
            </div>
        </form>
    )
}
