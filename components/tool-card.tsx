import { AlertTriangle, Briefcase, CalendarDays, Wallet, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import ProjectDetailsCard, { ProjectInfo } from '@/components/cards/ProjectDetailsCard'
import CostEstimateCard from '@/components/cards/CostEstimateCard'
import { formatINR, formatDate } from "@/lib/ai-tools/finance/finance-helpers"
import ClientCardComponent from '@/components/cards/ClientCard'

import { PDFGenerator } from '@/lib/ai-tools/utilities/pdf-generator'
import type { QuotationData } from '@/lib/ai-tools/utilities/pdf-generator'

import DailyScheduleCard from './cards/DailyScheduleCard';
import ReportGeneratorCard from './cards/ReportGeneratorCard';
import FinancialDashboardCard from './cards/FinancialDashboardCard';
import ReportResultCard from './cards/ReportResultCard';
import { ProjectRenderer } from './tool-renderers/ProjectRenderer';
import { ClientRenderer } from './tool-renderers/ClientRenderer';
import { QuotationRenderer } from './tool-renderers/QuotationRenderer';
import { InvoiceRenderer } from './tool-renderers/InvoiceRenderer';
import { InventoryRenderer } from './tool-renderers/InventoryRenderer';
import { TaskRenderer } from './tool-renderers/TaskRenderer';
import { ScheduleRenderer } from './tool-renderers/ScheduleRenderer';
import { ReportRenderer } from './tool-renderers/ReportRenderer';
import { CompanySettingsRenderer } from './tool-renderers/CompanySettingsRenderer';
import ProjectsCard from './cards/ProjectsCard';
import ClientListCard from './cards/ClientListCard';
import GenericSuccessCard from './cards/GenericSuccessCard';
import FallbackCard from './cards/FallbackCard';
import ActionConfirmation from './cards/ActionConfirmation';
import { GlassCard, SectionHeader } from '@/components/ui/GlassCard';
import {
    ListProjectsOutput,
    ListClientsOutput,
    ClientPriority,
    ProjectDetailsOutput,
    EstimateProjectCostOutput
} from '@/types/tool-types';
import ProjectFormCard from './cards/ProjectFormCard';






// ============================================================================
// TYPE DEFINITIONS (minimal - most moved to types/tool-types.ts)
// ============================================================================

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
    projects?: Array<{
        id: string;
        name: string;
        budget?: number | null;
        actualCost?: number | null;
        status?: string | null;
        deadline?: string | null;
    }>;
};



export interface ToolCardProps {
    toolName: string
    input?: unknown
    output?: unknown
    error?: string
    onAction?: (action: string, data: any) => void
}

// Base card style for glassmorphism effect
const baseCardStyle =
    'rounded-[28px] border border-white/12 bg-white/10 p-6 text-white/90 backdrop-blur-[70px] shadow-[0_45px_140px_rgba(17,0,58,0.55)]'

// Currency formatter
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

// ============================================================================
// MAIN TOOL CARD COMPONENT
// ============================================================================

export default function ToolCard({ toolName, input, output, error, onAction }: ToolCardProps) {
    const outputTyped = output as any

    switch (toolName) {
        // ========================================================================
        // CLIENT TOOLS - All delegated to ClientRenderer
        // ========================================================================
        case 'listClientsTool':
        case 'getClientTool':
        case 'validateClientDataTool':
        case 'createClientTool':
        case 'updateClientTool':
        case 'generateClientUpdateTool':
        case 'updateClientStateTool':
            return <ClientRenderer toolName={toolName} result={output} onAction={onAction} />

        // ========================================================================
        // PROJECT TOOLS - Delegated to ProjectRenderer where possible
        // ========================================================================
        case 'listProjectsTool':
        case 'getProjectTool':
        case 'createProjectTool':
        case 'updateProjectTool':
        case 'createProjectFromQuotationTool':
        case 'createPrototypeProjectTool':
        case 'calculateProjectProfitabilityTool':
        case 'showCreateProjectFormTool':
            return <ProjectRenderer toolName={toolName} result={output} onAction={onAction} />

        case 'estimateProjectCostTool':
            return <CostEstimateCard output={output as any} />

        // ========================================================================
        // FINANCIAL DASHBOARD
        // ========================================================================
        case 'getFinancialDashboardTool':
            return <FinancialDashboardCard output={output as any} />

        // ========================================================================
        // TASK TOOLS
        // ========================================================================
        case 'listProjectTasksTool':
        case 'createTaskTool':
        case 'updateTaskStatusTool':
        case 'assignTaskTool':
        case 'getTaskDetailsTool':
        case 'updateTasksUpToTool':
        case 'assignTasksToDefaultsTool':
        case 'updateTaskTool':
        case 'startTimeEntryTool':
        case 'stopTimeEntryTool':
            return <TaskRenderer toolName={toolName} result={output} onAction={onAction} />

        // ========================================================================
        // MATERIAL & VENDOR TOOLS  - Delegated to InventoryRenderer
        // ========================================================================
        case 'listVendorsTool':
        case 'addMaterialTool':
        case 'updateMaterialStockTool':
        case 'recordMaterialUsageTool':
        case 'recordMaterialPurchaseTool':
        case 'addVendorTool':
        case 'listMaterialsTool':
        case 'generateReorderListTool':
        case 'listMaterialPurchasesTool':
        case 'getVendorHistoryTool':
            return <InventoryRenderer toolName={toolName} result={output} onAction={onAction} />


        // ========================================================================
        // FINANCIAL TOOLS
        // ========================================================================







        case 'generateDailyScheduleTool':
        case 'invalidateScheduleCacheTool':
        case 'identifyBottlenecksTool':
        case 'optimizeTaskOrderTool':
        case 'getRecommendationsTool':
        case 'analyzeProjectHealthTool':
            return <ScheduleRenderer toolName={toolName} result={output} onAction={onAction} />







        // ========================================================================
        // 11.5 UNIFIED PROJECT CREATION FORM
        // ========================================================================
        // ========================================================================
        // 11.5 UNIFIED PROJECT CREATION FORM
        // ========================================================================
        // This case is now handled by the consolidated ProjectRenderer block above
        // case 'showCreateProjectFormTool':
        //     return <ProjectRenderer toolName={toolName} result={output} onAction={onAction} />

        // ========================================================================
        // 12. PROJECT FORM (Create/Edit)
        // ========================================================================
        // These cases are now handled by the consolidated ProjectRenderer block above
        // case 'createProjectTool':
        // case 'createProjectFromQuotationTool':
        // case 'updateProjectTool':
        case 'getProjectDetailsTool':
        // case 'listProjectTasksTool': // Handled by TaskRenderer
        // case 'startTimeEntryTool': // Handled by TaskRenderer
        // case 'stopTimeEntryTool': // Handled by TaskRenderer
        case 'addProjectMaterialTool':
        case 'addProjectPhotoTool':
        case 'updateTaskProgressTool':
        case 'assignTaskTool':
        case 'getProjectProgressTool':
            return <ProjectRenderer toolName={toolName} result={output} onAction={onAction} />

        // REPORT TOOLS - Delegated to ReportRenderer
        case 'showReportGeneratorTool':
        case 'generateReportTool':
            return <ReportRenderer toolName={toolName} result={output} onAction={onAction} />

        // COMPANY SETTINGS TOOLS - Delegated to CompanySettingsRenderer
        case 'showCompanySettingsFormTool':
        case 'updateCompanySettingsTool':
            return <CompanySettingsRenderer toolName={toolName} result={output} onAction={onAction} />
        // ========================================================================
        // QUOTATION TOOLS - Delegated to QuotationRenderer
        // ========================================================================
        case 'listQuotationsTool':
        case 'showQuotationFormTool':
        case 'createQuotationTool':
        case 'updateQuotationStatusTool':
        case 'addQuotationItemTool':
        case 'showCombineQuotationTool':
        case 'combineQuotationTool':
        case 'showSplitQuotationTool':
        case 'splitQuotationTool':
        case 'generateQuotationTool':
        case 'updateQuotationTool':
            return <QuotationRenderer toolName={toolName} result={output} onAction={onAction} />

        // ========================================================================
        // INVOICE TOOLS - Delegated to InvoiceRenderer
        // ========================================================================
        case 'updateInvoiceStatusTool':
        case 'recordPaymentTool':
        case 'generateCreditNoteTool':
        case 'createInvoiceTool':
        case 'cancelInvoiceTool':
        case 'listInvoicesTool':
        case 'showInvoiceEditFormTool':
        case 'showSplitInvoiceTool':
        case 'splitInvoiceTool':
        case 'showCombineInvoiceTool':
        case 'combineInvoiceTool':
        case 'generateInvoiceTool':
        case 'updateInvoiceTool':
        case 'convertQuotationToInvoiceTool':
        case 'getOutstandingPaymentsTool':
        case 'getPaymentHistoryTool':
        case 'generatePaymentReminderTool':
        case 'generateDebitNoteTool':
        case 'generatePaymentReceiptTool':
            return <InvoiceRenderer toolName={toolName} result={output} onAction={onAction} />



        default:
            // Smart Fallback: If it looks like a generic success, use ActionConfirmation
            if (outputTyped?.success === true && outputTyped?.message) {
                return <ActionConfirmation toolName={toolName} output={output} />
            }
            return <FallbackCard toolName={toolName} output={output} />
    }
}