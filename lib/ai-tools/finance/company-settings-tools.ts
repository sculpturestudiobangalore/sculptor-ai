import { tool } from "ai";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

// ============================================================================
// TOOL 1: Show Company Settings Form
// ============================================================================

export const showCompanySettingsFormTool = tool({
  description:
    "Display the company settings form to edit business details, bank information, and terms & conditions. Use when user wants to edit company details or business settings.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      // Fetch current business config
      const { data, error } = await supabase
        .from("business_config")
        .select("*")
        .eq("config_key", "business_tax")
        .single();

      if (error || !data) {
        return {
          success: false,
          error: "Failed to fetch company settings from database.",
        };
      }

      return {
        success: true,
        showForm: true,
        settings: {
          businessName: data.business_name || "",
          businessAddress: data.business_address || "",
          businessEmail: data.business_email || "",
          businessPhone: data.business_phone || "",
          gstin: data.business_gstin || "",
          pan: data.business_pan || "",
          stateCode: data.business_state_code || "",
          gstRate: data.gst_rate || 18.0,
          hsnCode: data.hsn_code || "",
          sacCode: data.sac_code || "",
          quotationTerms: data.quotation_terms_conditions || "",
          invoiceTerms: data.invoice_terms_conditions || "",
          // GST Bank Details
          gstBankDetails: data.bank_details || {
            accountName: "",
            bankName: "",
            accountNumber: "",
            ifscCode: "",
            branch: "",
            pan: "",
          },
          // Non-GST Bank Details
          nonGstBankDetails: data.non_gst_bank_details || {
            accountName: "",
            bankName: "",
            accountNumber: "",
            ifscCode: "",
            branch: "",
          },
        },
      };
    } catch (error) {
      console.error("Error fetching company settings:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error fetching settings",
      };
    }
  },
});

// ============================================================================
// TOOL 2: Update Company Settings
// ============================================================================

export const updateCompanySettingsTool = tool({
  description:
    "Update company settings including business details, bank information, and terms & conditions.",
  inputSchema: z.object({
    businessName: z.string().optional(),
    businessAddress: z.string().optional(),
    businessEmail: z.string().optional(),
    businessPhone: z.string().optional(),
    gstin: z.string().optional(),
    pan: z.string().optional(),
    stateCode: z.string().optional(),
    gstRate: z.number().optional(),
    hsnCode: z.string().optional(),
    sacCode: z.string().optional(),
    quotationTerms: z.string().optional(),
    invoiceTerms: z.string().optional(),
    gstBankDetails: z
      .object({
        accountName: z.string(),
        bankName: z.string(),
        accountNumber: z.string(),
        ifscCode: z.string(),
        branch: z.string().optional(),
        pan: z.string().optional(),
      })
      .optional(),
    nonGstBankDetails: z
      .object({
        accountName: z.string(),
        bankName: z.string(),
        accountNumber: z.string(),
        ifscCode: z.string(),
        branch: z.string().optional(),
      })
      .optional(),
  }),
  execute: async (params) => {
    try {
      // Build update object
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (params.businessName !== undefined)
        updateData.business_name = params.businessName;
      if (params.businessAddress !== undefined)
        updateData.business_address = params.businessAddress;
      if (params.businessEmail !== undefined)
        updateData.business_email = params.businessEmail;
      if (params.businessPhone !== undefined)
        updateData.business_phone = params.businessPhone;
      if (params.gstin !== undefined) updateData.business_gstin = params.gstin;
      if (params.pan !== undefined) updateData.business_pan = params.pan;
      if (params.stateCode !== undefined)
        updateData.business_state_code = params.stateCode;
      if (params.gstRate !== undefined) updateData.gst_rate = params.gstRate;
      if (params.hsnCode !== undefined) updateData.hsn_code = params.hsnCode;
      if (params.sacCode !== undefined) updateData.sac_code = params.sacCode;
      if (params.quotationTerms !== undefined)
        updateData.quotation_terms_conditions = params.quotationTerms;
      if (params.invoiceTerms !== undefined)
        updateData.invoice_terms_conditions = params.invoiceTerms;
      if (params.gstBankDetails !== undefined)
        updateData.bank_details = params.gstBankDetails;
      if (params.nonGstBankDetails !== undefined)
        updateData.non_gst_bank_details = params.nonGstBankDetails;

      // Update in database
      const { data, error } = await supabase
        .from("business_config")
        .update(updateData)
        .eq("config_key", "business_tax")
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to update settings: ${error.message}`,
        };
      }

      return {
        success: true,
        message: "Company settings updated successfully!",
        settings: {
          businessName: data.business_name,
          gstin: data.business_gstin,
        },
      };
    } catch (error) {
      console.error("Error updating company settings:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error updating settings",
      };
    }
  },
});
