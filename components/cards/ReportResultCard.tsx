'use client'

import React from 'react'
import { FileText, Download, Printer, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

type ReportResultCardProps = {
    reportType: string
    dateRange: { startDate: string; endDate: string }
    gstFilter: string
    data: any
    summary: any
    onAction?: (action: string, data: any) => void
}

export default function ReportResultCard({
    reportType,
    dateRange,
    gstFilter,
    data,
    summary,
    onAction,
}: ReportResultCardProps) {

    const handleDownloadCSV = () => {
        if (!data) return

        let csvContent = "data:text/csv;charset=utf-8,"
        let fileName = `${reportType}_${dateRange.startDate}_${dateRange.endDate}.csv`

        if (reportType === 'gst' || reportType === 'client_statement') {
            // Invoices List
            const invoices = Array.isArray(data) ? data : (data.invoices || [])

            // Headers
            const headers = [
                "Invoice No", "Date", "Client", "GSTIN",
                "Taxable Value", "CGST", "SGST", "IGST", "Total Tax", "Total Amount", "GST Applicable"
            ]
            csvContent += headers.join(",") + "\n"

            // Rows
            invoices.forEach((inv: any) => {
                const row = [
                    inv.invoice_number,
                    inv.issue_date,
                    `"${inv.client_name || ''}"`, // Quote to handle commas
                    inv.client_gstin || '',
                    inv.subtotal || 0,
                    inv.cgst_amount || 0,
                    inv.sgst_amount || 0,
                    inv.igst_amount || 0,
                    inv.tax_amount || 0,
                    inv.total_amount || 0,
                    inv.is_gst_applicable ? "Yes" : "No"
                ]
                csvContent += row.join(",") + "\n"
            })
        } else if (reportType === 'profitability') {
            // Projects List
            const projects = Array.isArray(data) ? data : []
            const headers = ["Project Name", "Client", "Status", "Budget", "Revenue", "Cost", "Profit", "Margin"]
            csvContent += headers.join(",") + "\n"

            projects.forEach((p: any) => {
                const row = [
                    `"${p.name}"`,
                    `"${p.clientName}"`,
                    p.status,
                    p.budget || 0,
                    p.revenue || 0,
                    p.cost || 0,
                    p.profit || 0,
                    p.margin
                ]
                csvContent += row.join(",") + "\n"
            })
        } else if (reportType === 'performance') {
            // Summary mostly
            csvContent += `Report,Company Performance\n`
            csvContent += `Period,${dateRange.startDate} to ${dateRange.endDate}\n\n`
            csvContent += `Total Revenue,${summary.totalRevenue}\n`
            csvContent += `Total Expenses,${summary.totalExpenses}\n`
            csvContent += `Net Profit,${summary.netProfit}\n`
        }

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", fileName)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handlePrint = () => {
        // Simple print trigger - user can save as PDF from browser
        window.print()
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount)
    }

    return (
        <div className="w-full rounded-2xl border border-violet-500/30 bg-linear-to-br from-violet-900/20 to-purple-900/20 p-4 shadow-xl backdrop-blur-sm sm:p-6 print:border-none print:shadow-none print:bg-white print:text-black">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between print:hidden">
                <div>
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-violet-400" />
                        <h3 className="text-lg font-bold text-white capitalize">{reportType.replace('_', ' ')} Report</h3>
                    </div>
                    <p className="mt-1 text-sm text-white/70">
                        {dateRange.startDate} to {dateRange.endDate} • {gstFilter === 'all' ? 'All Transactions' : gstFilter === 'gst_only' ? 'GST Only' : 'Non-GST Only'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handlePrint}
                        className="rounded-lg bg-white/5 p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                        title="Print / Save as PDF"
                    >
                        <Printer className="h-5 w-5" />
                    </button>
                    <button
                        onClick={handleDownloadCSV}
                        className="rounded-lg bg-violet-600 p-2 text-white transition-colors hover:bg-violet-700"
                        title="Download CSV"
                    >
                        <Download className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => {
                            if (!data) return;
                            // Dynamic import to avoid SSR issues if any, though client component is fine.
                            import('@/lib/ai-tools/utilities/export-helpers').then(({ generateExcel }) => {
                                const exportData = Array.isArray(data) ? data : (data.invoices || []);
                                generateExcel(exportData, `${reportType}_report`, reportType);
                            });
                        }}
                        className="rounded-lg bg-emerald-600 p-2 text-white transition-colors hover:bg-emerald-700"
                        title="Download Excel"
                    >
                        <FileText className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => {
                            if (!data) return;
                            if (reportType !== 'gst' && reportType !== 'client_statement') {
                                alert("Tally export is currently optimized for GST and Client Statement reports.");
                                return;
                            }
                            import('@/lib/ai-tools/utilities/export-helpers').then(({ generateTallyXML }) => {
                                const invoices = Array.isArray(data) ? data : (data.invoices || []);
                                generateTallyXML(invoices, `${reportType}_tally_import`);
                            });
                        }}
                        className="rounded-lg bg-orange-500 p-2 text-white transition-colors hover:bg-orange-600"
                        title="Export for Tally"
                    >
                        <FileText className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Print Header (Visible only when printing) */}
            <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold text-black mb-2 capitalize">{reportType.replace('_', ' ')} Report</h1>
                <p className="text-gray-600">Period: {dateRange.startDate} to {dateRange.endDate}</p>
                <p className="text-gray-600">Filter: {gstFilter}</p>
            </div>

            {/* Summary Cards */}
            <div className="mb-6 grid gap-4 sm:grid-cols-3 print:grid-cols-3">
                {Object.entries(summary).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-4 print:border-gray-200 print:bg-gray-50">
                        <p className="text-xs font-medium text-white/50 uppercase tracking-wider print:text-gray-500">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="mt-1 text-xl font-bold text-white print:text-black">
                            {typeof value === 'number' ? formatCurrency(value) : value as string}
                        </p>
                    </div>
                ))}
            </div>

            {/* Data Table Preview (Limited rows for large datasets) */}
            <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden print:border-gray-200 print:bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-white/60 print:bg-gray-100 print:text-gray-700">
                            <tr>
                                {reportType === 'profitability' ? (
                                    <>
                                        <th className="px-4 py-3 font-medium">Project</th>
                                        <th className="px-4 py-3 font-medium">Client</th>
                                        <th className="px-4 py-3 font-medium text-right">Revenue</th>
                                        <th className="px-4 py-3 font-medium text-right">Cost</th>
                                        <th className="px-4 py-3 font-medium text-right">Profit</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-4 py-3 font-medium">Date</th>
                                        <th className="px-4 py-3 font-medium">Invoice #</th>
                                        <th className="px-4 py-3 font-medium">Client</th>
                                        <th className="px-4 py-3 font-medium text-right">Amount</th>
                                        <th className="px-4 py-3 font-medium text-right">Tax</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-white/80 print:divide-gray-200 print:text-gray-800">
                            {reportType === 'profitability' ? (
                                (Array.isArray(data) ? data : []).slice(0, 10).map((row: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/5">
                                        <td className="px-4 py-3">{row.name}</td>
                                        <td className="px-4 py-3">{row.clientName}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(row.revenue)}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(row.cost)}</td>
                                        <td className={cn("px-4 py-3 text-right font-medium", row.profit >= 0 ? "text-emerald-400 print:text-green-600" : "text-rose-400 print:text-red-600")}>
                                            {formatCurrency(row.profit)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                (Array.isArray(data) ? data : (data.invoices || [])).slice(0, 10).map((row: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/5">
                                        <td className="px-4 py-3">{row.issue_date}</td>
                                        <td className="px-4 py-3">{row.invoice_number}</td>
                                        <td className="px-4 py-3">{row.client_name}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(row.total_amount)}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(row.tax_amount)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {(Array.isArray(data) ? data.length : (data.invoices?.length || 0)) > 10 && (
                    <div className="p-3 text-center text-xs text-white/40 print:hidden">
                        Showing first 10 rows. Download CSV for full report.
                    </div>
                )}
            </div>
        </div>
    )
}
