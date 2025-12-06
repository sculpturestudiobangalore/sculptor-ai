import { supabase } from "@/lib/supabase";

/**
 * Fetches business configuration from database
 */
/**
 * Fetches business configuration from database
 */
export async function getBusinessConfig() {
  const { data, error } = await supabase
    .from("business_config")
    .select("*")
    .eq("config_key", "business_tax")
    .single();

  if (error || !data) {
    throw new Error(
      "Business configuration not found. Please set up business tax details."
    );
  }

  return {
    businessName: data.business_name || "Sculpture Studio",
    gstin: data.business_gstin || data.config_value?.gstin,
    stateCode: data.business_state_code || data.config_value?.state_code,
    stateName: data.config_value?.state_name || "Karnataka",
    gstRate: data.gst_rate || 18.0,
    hsnCode: data.hsn_code,
    sacCode: data.sac_code,
    businessPhone: data.business_phone,
    businessEmail: data.business_email,
    businessAddress: data.business_address,
    businessPan: data.business_pan,
    quotationTerms: data.quotation_terms_conditions,
    invoiceTerms: data.invoice_terms_conditions,
    // GST bank details (from bank_details column)
    bankDetails: data.bank_details || {
      accountName: "Sculpture Studio Bangalore",
      bankName: "State Bank of India",
      accountNumber: "37641718521",
      ifscCode: "SBIN0001811",
      branch: "Sadashivnagar (Bangalore)",
      pan: "AGWPY2066N",
    },
    // Non-GST bank details (from non_gst_bank_details column)
    nonGstBankDetails: data.non_gst_bank_details || {
      accountName: "Dhanush Kiran GP",
      bankName: "HDFC Bank",
      accountNumber: "50100296011576",
      ifscCode: "HDFC0000312",
      branch: "Vijaynagar Branch (Bangalore)",
    },
  };
}

/**
 * Calculates GST breakdown based on business and client state
 */
export function calculateGST(
  amount: number,
  gstRate: number,
  businessStateCode: string,
  clientStateCode?: string
) {
  const isInterState = clientStateCode && clientStateCode !== businessStateCode;

  if (isInterState) {
    // IGST for inter-state transactions
    const igstAmount = (amount * gstRate) / 100;
    return {
      taxType: "igst",
      igstRate: gstRate,
      igstAmount: Math.round(igstAmount * 100) / 100,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      totalTax: Math.round(igstAmount * 100) / 100,
    };
  } else {
    // CGST + SGST for intra-state transactions
    const halfRate = gstRate / 2;
    const cgstAmount = (amount * halfRate) / 100;
    const sgstAmount = (amount * halfRate) / 100;
    return {
      taxType: "gst",
      igstRate: 0,
      igstAmount: 0,
      cgstRate: halfRate,
      cgstAmount: Math.round(cgstAmount * 100) / 100,
      sgstRate: halfRate,
      sgstAmount: Math.round(sgstAmount * 100) / 100,
      totalTax: Math.round((cgstAmount + sgstAmount) * 100) / 100,
    };
  }
}

/**
 * Generates next document number using database function
 */
export async function getNextDocumentNumber(
  documentType: "invoice" | "quotation" | "receipt"
): Promise<string> {
  const prefix =
    documentType === "invoice"
      ? "INV"
      : documentType === "quotation"
      ? "QTN"
      : "RCP";

  const { data, error } = await supabase.rpc("get_next_document_number", {
    doc_type: documentType,
    prefix: prefix,
  });

  if (error) {
    console.error("Error generating document number:", error);
    throw new Error(`Failed to generate ${documentType} number`);
  }

  return data;
}

/**
 * Formats currency in INR
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats date in DD/MM/YYYY format
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/**
 * Converts number to words (for invoice total in words)
 */
export function numberToWords(num: number): string {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  if (num === 0) return "Zero";

  const crores = Math.floor(num / 10000000);
  const lakhs = Math.floor((num % 10000000) / 100000);
  const thousands = Math.floor((num % 100000) / 1000);
  const hundreds = Math.floor((num % 1000) / 100);
  const remainder = Math.floor(num % 100);

  let words = "";

  if (crores > 0) words += convertToWords(crores) + " Crore ";
  if (lakhs > 0) words += convertToWords(lakhs) + " Lakh ";
  if (thousands > 0) words += convertToWords(thousands) + " Thousand ";
  if (hundreds > 0) words += ones[hundreds] + " Hundred ";
  if (remainder > 0) words += convertToWords(remainder);

  return words.trim() + " Rupees Only";

  function convertToWords(n: number): string {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  }
}

/**
 * Validates GSTIN format
 */
export function validateGSTIN(gstin: string): boolean {
  const gstinRegex =
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
}
