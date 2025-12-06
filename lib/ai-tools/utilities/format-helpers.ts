/**
 * Shared Formatting Utilities
 * Consolidates all formatting logic to ensure consistency across the application
 */

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

/**
 * Format a number as Indian Rupees (INR)
 * @param value - Number or string to format
 * @param options - Optional formatting options
 * @returns Formatted currency string (e.g., "₹1,00,000")
 */
export function formatINR(
  value: number | string | null | undefined,
  options?: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
    showSymbol?: boolean;
  }
): string {
  // Handle null/undefined/empty values
  if (value === null || value === undefined || value === "") return "—";

  // Convert to number
  const numValue =
    typeof value === "number" ? value : parseFloat(String(value));

  // Check if valid number
  if (!Number.isFinite(numValue)) return "—";

  // Format with Intl.NumberFormat
  const formatter = new Intl.NumberFormat("en-IN", {
    style: options?.showSymbol !== false ? "currency" : "decimal",
    currency: "INR",
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
  });

  return formatter.format(numValue);
}

/**
 * Format currency without symbol (just the number)
 */
export function formatINRNumber(
  value: number | string | null | undefined
): string {
  return formatINR(value, { showSymbol: false });
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format date to ISO format (YYYY-MM-DD)
 * @param value - Date string or Date object
 * @returns ISO date string or null if invalid
 */
export function toISODate(value?: string | Date | null): string | null {
  if (!value) return null;

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().split("T")[0];
}

/**
 * Format date to Indian locale format (DD/MM/YYYY)
 * @param value - Date string or Date object
 * @returns Formatted date string
 */
export function formatDateIN(value?: string | Date | null): string {
  if (!value) return "—";

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format date to display format (e.g., "5 Dec 2025")
 * @param value - Date string or Date object
 * @returns Formatted date string
 */
export function formatDateDisplay(value?: string | Date | null): string {
  if (!value) return "—";

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format datetime to display format with time
 * @param value - Date string or Date object
 * @returns Formatted datetime string
 */
export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "—";

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================================
// PHONE NUMBER FORMATTING
// ============================================================================

/**
 * Format phone number to Indian format
 * @param value - Phone number string
 * @returns Formatted phone number (e.g., "+91 96323 90070")
 */
export function formatPhoneIN(value?: string | null): string {
  if (!value) return "—";

  // Remove all non-digit characters
  const digits = value.replace(/\D/g, "");

  // Handle 10-digit numbers
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  // Handle 12-digit numbers (with country code)
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }

  // Return as-is if doesn't match expected format
  return value;
}

// ============================================================================
// GST NUMBER FORMATTING
// ============================================================================

/**
 * Validate and format GST number
 * @param value - GST number string
 * @returns Object with validity status and formatted value
 */
export function validateGSTIN(value?: string | null): {
  isValid: boolean;
  formatted: string;
  error?: string;
} {
  if (!value) {
    return { isValid: false, formatted: "", error: "GST number is required" };
  }

  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  const cleanValue = value.toUpperCase().trim();

  if (!gstRegex.test(cleanValue)) {
    return {
      isValid: false,
      formatted: cleanValue,
      error:
        "Invalid GST format. Expected format: 29AAECS8577R1ZM (15 characters)",
    };
  }

  return { isValid: true, formatted: cleanValue };
}

/**
 * Format GST number with separators for display
 * @param value - GST number string
 * @returns Formatted GST number (e.g., "29-AAECS-8577R-1ZM")
 */
export function formatGSTIN(value?: string | null): string {
  if (!value) return "—";

  const validation = validateGSTIN(value);

  if (!validation.isValid) return value;

  const gstin = validation.formatted;

  // Format: 29-AAECS-8577R-1ZM
  return `${gstin.slice(0, 2)}-${gstin.slice(2, 7)}-${gstin.slice(
    7,
    12
  )}-${gstin.slice(12)}`;
}

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

/**
 * Format percentage value
 * @param value - Number to format as percentage
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number | null | undefined,
  decimals: number = 0
): string {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "—";

  return `${value.toFixed(decimals)}%`;
}

/**
 * Format number with Indian numbering system (lakhs/crores)
 * @param value - Number to format
 * @returns Formatted number string
 */
export function formatNumberIN(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "—";

  return new Intl.NumberFormat("en-IN").format(value);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely parse a string to number
 * @param value - String to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed number or default value
 */
export function safeParseFloat(
  value: string | number | null | undefined,
  defaultValue: number = 0
): number {
  if (typeof value === "number") return value;
  if (!value) return defaultValue;

  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

/**
 * Safely parse a string to integer
 * @param value - String to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed integer or default value
 */
export function safeParseInt(
  value: string | number | null | undefined,
  defaultValue: number = 0
): number {
  if (typeof value === "number") return Math.floor(value);
  if (!value) return defaultValue;

  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}
