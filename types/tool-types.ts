import { ProjectInfo } from "@/components/cards/ProjectDetailsCard";

export type ClientPriority = "low" | "medium" | "high";

export type ClientSummary = {
  id: string;
  name: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  priority?: ClientPriority | null;
  state?: string | null;
  hasGST?: boolean;
};

export type ListClientsOutput = {
  success: boolean;
  total?: number;
  clients?: ClientSummary[];
  error?: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  client?: string;
  clientEmail?: string;
  description?: string;
  status?: string;
  budget?: number;
  spent?: number;
  deadline?: string;
  priority?: string;
  progress?: number;
  lastCompletedTask?: string | null;
  totalTasks?: number;
  completedTasks?: number;
};

export type ListProjectsOutput = {
  success: boolean;
  projects?: ProjectSummary[];
  error?: string;
};

export type ProjectCard = {
  id: string;
  name: string;
  budget?: number | null;
  actualCost?: number | null;
  status?: string | null;
  deadline?: string | null;
};

export type ClientCard = {
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
  projects?: ProjectCard[];
};

export type ProjectDetailsOutput = {
  success: boolean;
  project?: ProjectInfo;
  multipleMatches?: boolean;
  matches?: Array<{
    id: string;
    name: string;
    status?: string;
    deadline?: string;
  }>;
  message?: string;
  error?: string;
};

export type EstimateProjectCostOutput = {
  success: boolean;
  projectId?: string;
  projectName?: string;
  breakdown?: {
    laborHours: number;
    laborRate: number;
    laborCost: number;
    materialCost: number;
    subtotal: number;
    overheadPercentage: number;
    overhead: number;
    totalEstimate: number;
  };
  message?: string;
  error?: string;
};

export type QuotationOutput = {
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
  };
  error?: string;
};

export type InvoiceOutput = {
  success: boolean;
  invoice?: {
    id: string;
    invoiceNumber: string;
    quotationNumber?: string;
    projectName: string;
    clientName: string;
    issueDate: string;
    dueDate: string;
    subtotal: string;
    taxType: string;
    taxAmount: string;
    totalAmount: string;
    advancePaid: string;
    balanceDue: string;
    itemCount: number;
    status: string;
    previousPayments?: number;
  };
  error?: string;
};

export type PaymentOutput = {
  success: boolean;
  payment?: {
    amount: number;
  };
  error?: string;
};

export type OutstandingPaymentsOutput = {
  success: boolean;
  invoices?: Array<{
    id: string;
    invoice_number: string;
    total_amount: number;
    balance_due: number;
  }>;
  error?: string;
};

export type PaymentHistoryOutput = {
  success: boolean;
  payments?: Array<{
    id: string;
    paymentDate: string;
    amount: string;
    paymentMethod: string;
  }>;
  error?: string;
};

export type ReminderOutput = {
  success: boolean;
  reminderMessage?: string;
  error?: string;
};

export type NoteOutput = {
  success: boolean;
  creditNote?: { credit_amount: number };
  debitNote?: { amount: number };
  error?: string;
};

export type CancelOutput = {
  success: boolean;
  error?: string;
};

export type ReceiptOutput = {
  success: boolean;
  receiptNumber?: string;
  error?: string;
};

export type GenericSuccessOutput = {
  success: boolean;
  message?: string;
  [key: string]: any;
};

export type QuotationFormOutput = {
  success: boolean;
  showForm: boolean;
  clientName: string;
  projectName?: string;
  gstRate?: number;
  error?: string;
  matches?: Array<{ id: string; name: string }>;
};
