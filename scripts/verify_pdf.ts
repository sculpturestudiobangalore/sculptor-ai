import { config } from "dotenv";
import { resolve } from "path";
import fs from "fs";
import type { QuotationData } from "@/lib/ai-tools/utilities/pdf-generator";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

async function verifyPdfGeneration() {
  console.log("🔍 Starting PDF Generation Verification...");

  try {
    // Dynamic imports to ensure env vars are loaded first
    const { getBusinessConfig } = await import(
      "@/lib/ai-tools/finance/finance-helpers"
    );
    const { PDFGenerator } = await import(
      "@/lib/ai-tools/utilities/pdf-generator"
    );

    // 1. Fetch Business Config
    console.log("📊 Fetching Business Config...");
    const businessConfig = await getBusinessConfig();
    console.log("✅ Business Config Fetched:");
    console.log(JSON.stringify(businessConfig, null, 2));

    if (
      !businessConfig.bankDetails ||
      !businessConfig.bankDetails.accountNumber
    ) {
      console.error("❌ ERROR: Bank details are missing in the config!");
      process.exit(1);
    }

    // 2. Create Dummy Quotation Data
    const quotationData: QuotationData = {
      quotationNumber: "TEST-QTN-001",
      date: new Date().toISOString().split("T")[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      client: {
        name: "Test Client",
        address: "123 Test St, Test City",
        phone: "9876543210",
      },
      project: {
        name: "Test Project",
        type: "Sculpture",
        deadline: "2025-12-31",
      },
      items: [
        {
          description: "Test Item 1",
          quantity: 1,
          rate: 1000,
          total: 1000,
          unit: "nos",
        },
        {
          description: "Test Item 2",
          quantity: 2,
          rate: 500,
          total: 1000,
          unit: "nos",
        },
      ],
      subtotal: 2000,
      tax: 360,
      total: 2360,
      terms: "Test Terms and Conditions",
      companySettings: {
        name: businessConfig.businessName,
        address: businessConfig.businessAddress || "",
        phone: businessConfig.businessPhone || "",
        email: businessConfig.businessEmail || "",
        gstin: businessConfig.gstin || "",
        bankDetails: businessConfig.bankDetails,
      },
    };

    // 3. Generate PDF
    console.log("📄 Generating PDF...");
    const pdfBytes = await PDFGenerator.generateQuotation(quotationData);

    // 4. Save PDF
    const outputPath = "test_quotation.pdf";
    fs.writeFileSync(outputPath, pdfBytes);
    console.log(`✅ PDF Saved to ${outputPath}`);
    console.log("🎉 Verification Successful!");
  } catch (error) {
    console.error("❌ Verification Failed:", error);
    process.exit(1);
  }
}

verifyPdfGeneration();
