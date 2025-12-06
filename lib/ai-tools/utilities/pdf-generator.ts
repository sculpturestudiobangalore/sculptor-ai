import { PDFDocument, rgb, StandardFonts, PDFFont } from "pdf-lib";

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  client: {
    name: string;
    address: string;
    phone: string;
    gstin?: string;
  };
  project: {
    name: string;
    type: string;
    deadline: string;
  };
  items: Array<{
    description: string;
    quantity?: number;
    rate?: number;
    amount: number;
    hsnSacCode?: string;
    unit?: string;
    material?: string;
    size?: string;
    finish?: string;
    notes?: string;
    estimatedWeight?: number;
    optionType?: string;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  advancePaid: number;
  balanceDue: number;
  terms: string;
  companySettings: CompanySettings;
}

export interface QuotationLineItem {
  name?: string;
  description?: string;
  hsnSacCode?: string;
  quantity?: number;
  estimatedWeight?: number;
  unit?: string;
  rate: number;
  total: number;
  notes?: string;
  material?: string;
  size?: string;
  finish?: string;
  optionType?: string;
}

export interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  bankDetails?: {
    accountName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branch?: string;
  };
}

export interface QuotationData {
  quotationNumber: string;
  date: string;
  validUntil: string;
  client: {
    name: string;
    address: string;
    phone: string;
  };
  project: {
    name: string;
    type: string;
    deadline: string;
  };
  items: QuotationLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  terms?: string;
  companySettings: CompanySettings;
}

export class PDFGenerator {
  // Helper to calculate text height
  private static calculateTextHeight(
    text: string,
    font: PDFFont,
    fontSize: number,
    maxWidth: number
  ): number {
    if (!text) return 0;

    // Split by newlines first to handle multi-line text
    const paragraphs = text.split("\n");
    let totalLines = 0;

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        // Empty line still counts as one line
        totalLines++;
        continue;
      }

      const words = paragraph.split(" ");
      let line = "";
      let lines = 1;

      for (const word of words) {
        const testLine = line + word + " ";
        const width = font.widthOfTextAtSize(testLine, fontSize);
        if (width > maxWidth && line !== "") {
          line = word + " ";
          lines++;
        } else {
          line = testLine;
        }
      }

      totalLines += lines;
    }

    return totalLines * (fontSize + 4); // Line height = font size + 4 padding
  }

  // Helper to wrap text
  private static wrapText(
    text: string,
    font: PDFFont,
    fontSize: number,
    maxWidth: number
  ): string[] {
    if (!text) return [];

    // First, split by newlines to preserve intentional line breaks
    const paragraphs = text.split("\n");
    let allLines: string[] = [];

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        // Preserve empty lines
        allLines.push("");
        continue;
      }

      const words = paragraph.split(" ");
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + " " + word;
        const width = font.widthOfTextAtSize(testLine, fontSize);
        if (width < maxWidth) {
          currentLine = testLine;
        } else {
          allLines.push(currentLine);
          currentLine = word;
        }
      }
      allLines.push(currentLine);
    }

    return allLines;
  }

  static async generateInvoice(invoiceData: InvoiceData): Promise<Uint8Array> {
    try {
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([595, 842]);
      const { width, height } = page.getSize();

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const margin = { left: 40, right: 40, top: 40, bottom: 40 };
      const contentWidth = width - margin.left - margin.right;
      let yPosition = height - margin.top;

      const checkPageBreak = (requiredSpace: number) => {
        if (yPosition < margin.bottom + requiredSpace) {
          page = pdfDoc.addPage([595, 842]);
          yPosition = height - margin.top;
          return true;
        }
        return false;
      };

      // Header
      page.drawText(invoiceData.companySettings.name, {
        x: margin.left,
        y: yPosition,
        size: 20,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.2),
      });
      yPosition -= 25;

      // Company Address
      const addressLines = invoiceData.companySettings.address.split("\n");
      for (const line of addressLines) {
        page.drawText(line, {
          x: margin.left,
          y: yPosition,
          size: 9,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
        yPosition -= 12;
      }
      page.drawText(
        `Phone: ${invoiceData.companySettings.phone} | Email: ${invoiceData.companySettings.email}`,
        {
          x: margin.left,
          y: yPosition,
          size: 9,
          font,
          color: rgb(0.4, 0.4, 0.4),
        }
      );
      yPosition -= 12;
      page.drawText(`GSTIN: ${invoiceData.companySettings.gstin}`, {
        x: margin.left,
        y: yPosition,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      yPosition -= 30;

      // Invoice Meta
      let metaY = height - margin.top;
      page.drawText("TAX INVOICE", {
        x: width - margin.right - 120,
        y: metaY,
        size: 16,
        font: boldFont,
      });
      metaY -= 25;
      page.drawText(invoiceData.invoiceNumber, {
        x: width - margin.right - 120,
        y: metaY,
        size: 12,
        font: boldFont,
      });
      metaY -= 20;
      page.drawText(`Date: ${invoiceData.date}`, {
        x: width - margin.right - 120,
        y: metaY,
        size: 10,
        font,
      });
      metaY -= 15;
      page.drawText(`Due Date: ${invoiceData.dueDate}`, {
        x: width - margin.right - 120,
        y: metaY,
        size: 10,
        font,
      });

      // Client & Project
      const detailsY = yPosition;
      const boxHeight = 80;

      // Client
      page.drawRectangle({
        x: margin.left,
        y: detailsY - boxHeight,
        width: contentWidth / 2 - 10,
        height: boxHeight,
        color: rgb(0.97, 0.97, 0.97),
      });
      let clientY = detailsY - 15;
      page.drawText("Bill To:", {
        x: margin.left + 10,
        y: clientY,
        size: 10,
        font: boldFont,
      });
      clientY -= 15;
      page.drawText(invoiceData.client.name, {
        x: margin.left + 10,
        y: clientY,
        size: 10,
        font: boldFont,
      });
      clientY -= 15;
      if (invoiceData.client.address) {
        const lines = invoiceData.client.address.split("\n");
        for (const line of lines) {
          if (clientY < detailsY - boxHeight + 10) break;
          page.drawText(line, {
            x: margin.left + 10,
            y: clientY,
            size: 9,
            font,
          });
          clientY -= 12;
        }
      }

      // Project
      const projectBoxX = margin.left + contentWidth / 2 + 10;
      page.drawRectangle({
        x: projectBoxX,
        y: detailsY - boxHeight,
        width: contentWidth / 2 - 10,
        height: boxHeight,
        color: rgb(0.97, 0.97, 0.97),
      });
      let projectY = detailsY - 15;
      page.drawText("Project:", {
        x: projectBoxX + 10,
        y: projectY,
        size: 10,
        font: boldFont,
      });
      projectY -= 15;
      page.drawText(invoiceData.project.name, {
        x: projectBoxX + 10,
        y: projectY,
        size: 10,
        font,
      });

      yPosition = detailsY - boxHeight - 30;

      // ===== TABLE HEADERS =====
      const tableHeaders = [
        "No.",
        "Description",
        "HSN/SAC",
        "Weight",
        "Qty",
        "Unit",
        "Rate",
        "Amount",
      ];
      const columnWidths = [30, 180, 50, 40, 30, 35, 60, 75];

      // Draw Header Background
      page.drawRectangle({
        x: margin.left,
        y: yPosition - 5,
        width: contentWidth,
        height: 25,
        color: rgb(0.95, 0.95, 0.95),
      });

      let xOffset = margin.left;
      tableHeaders.forEach((header, i) => {
        page.drawText(header, {
          x: xOffset + 5,
          y: yPosition + 4,
          size: 9,
          font: boldFont,
          color: rgb(0.2, 0.2, 0.2),
        });
        xOffset += columnWidths[i];
      });

      yPosition -= 25;

      // ===== LINE ITEMS (Dynamic Height) =====
      let itemNumber = 1;
      let isAlternateRow = false;

      for (const item of invoiceData.items) {
        // 1. Calculate required height for this row
        const descriptionWidth = columnWidths[1] - 10;
        const mainDescHeight = this.calculateTextHeight(
          item.description || "Item",
          boldFont,
          9,
          descriptionWidth
        );

        // Calculate details height
        let detailsHeight = 0;
        const details = [];
        if (item.material) details.push(`Material: ${item.material}`);
        if (item.size) details.push(`Size: ${item.size}`);
        if (item.finish) details.push(`Finish: ${item.finish}`);
        if (item.optionType) details.push(`Option: ${item.optionType}`);
        if (item.notes) details.push(item.notes);

        for (const detail of details) {
          detailsHeight += this.calculateTextHeight(
            detail,
            font,
            8,
            descriptionWidth
          );
        }

        // Total row height (padding + desc + details)
        const rowHeight = Math.max(30, mainDescHeight + detailsHeight + 15);

        // 2. Check Page Break
        if (checkPageBreak(rowHeight)) {
          // Redraw headers on new page
          page.drawRectangle({
            x: margin.left,
            y: yPosition - 5,
            width: contentWidth,
            height: 25,
            color: rgb(0.95, 0.95, 0.95),
          });
          let xOffset = margin.left;
          tableHeaders.forEach((header, i) => {
            page.drawText(header, {
              x: xOffset + 5,
              y: yPosition + 4,
              size: 9,
              font: boldFont,
              color: rgb(0.2, 0.2, 0.2),
            });
            xOffset += columnWidths[i];
          });
          yPosition -= 25;
        }

        // 3. Draw Row Background
        if (isAlternateRow) {
          page.drawRectangle({
            x: margin.left,
            y: yPosition - rowHeight + 10,
            width: contentWidth,
            height: rowHeight,
            color: rgb(0.98, 0.98, 0.98),
          });
        }

        // 4. Draw Content
        xOffset = margin.left;
        const startY = yPosition - 10;

        // Item No
        page.drawText(itemNumber.toString(), {
          x: xOffset + 5,
          y: startY,
          size: 9,
          font,
        });
        xOffset += columnWidths[0];

        // Description & Details
        const descX = xOffset + 5;
        let currentTextY = startY;

        // Main Description (Wrapped)
        const descText = item.description || "Item";
        const descLines = this.wrapText(
          descText,
          boldFont,
          9,
          descriptionWidth
        );
        for (const line of descLines) {
          page.drawText(line, {
            x: descX,
            y: currentTextY,
            size: 9,
            font: boldFont,
            color: rgb(0.1, 0.1, 0.1),
          });
          currentTextY -= 13;
        }

        // Details (Wrapped)
        currentTextY -= 2;
        for (const detail of details) {
          const detailLines = this.wrapText(detail, font, 8, descriptionWidth);
          for (const line of detailLines) {
            page.drawText(line, {
              x: descX,
              y: currentTextY,
              size: 8,
              font,
              color: rgb(0.4, 0.4, 0.4),
            });
            currentTextY -= 11;
          }
        }
        xOffset += columnWidths[1];

        // HSN
        page.drawText(item.hsnSacCode || "-", {
          x: xOffset + 5,
          y: startY,
          size: 9,
          font,
        });
        xOffset += columnWidths[2];

        // Weight
        page.drawText(
          item.estimatedWeight ? item.estimatedWeight.toString() : "-",
          { x: xOffset + 5, y: startY, size: 9, font }
        );
        xOffset += columnWidths[3];

        // Qty
        page.drawText(item.quantity?.toString() || "1", {
          x: xOffset + 5,
          y: startY,
          size: 9,
          font,
        });
        xOffset += columnWidths[4];

        // Unit
        page.drawText(item.unit || "nos", {
          x: xOffset + 5,
          y: startY,
          size: 9,
          font,
        });
        xOffset += columnWidths[5];

        // Rate
        const rateText = item.rate
          ? `Rs. ${item.rate.toLocaleString("en-IN")}`
          : "-";
        const rateWidth = font.widthOfTextAtSize(rateText, 9);
        page.drawText(rateText, {
          x: xOffset + columnWidths[6] - rateWidth - 5,
          y: startY,
          size: 9,
          font,
        });
        xOffset += columnWidths[6];

        // Amount
        const amountText = `Rs. ${item.amount.toLocaleString("en-IN")}`;
        const amountWidth = boldFont.widthOfTextAtSize(amountText, 9);
        page.drawText(amountText, {
          x: xOffset + columnWidths[7] - amountWidth - 5,
          y: startY,
          size: 9,
          font: boldFont,
        });

        // Update Y and State
        yPosition -= rowHeight;
        itemNumber++;
        isAlternateRow = !isAlternateRow;
      }
      yPosition -= 15;

      // Totals
      checkPageBreak(150);
      const totalsWidth = 250;
      const totalsX = width - margin.right - totalsWidth;

      page.drawLine({
        start: { x: margin.left, y: yPosition },
        end: { x: width - margin.right, y: yPosition },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });
      yPosition -= 20;

      page.drawText("Subtotal:", {
        x: totalsX,
        y: yPosition,
        size: 10,
        font: boldFont,
      });
      page.drawText(`Rs. ${invoiceData.subtotal.toLocaleString("en-IN")}`, {
        x: width - margin.right - 80,
        y: yPosition,
        size: 10,
        font: boldFont,
      });
      yPosition -= 20;

      if (invoiceData.tax > 0) {
        page.drawText("GST (12%):", {
          x: totalsX,
          y: yPosition,
          size: 10,
          font,
        });
        page.drawText(`Rs. ${invoiceData.tax.toLocaleString("en-IN")}`, {
          x: width - margin.right - 80,
          y: yPosition,
          size: 10,
          font,
        });
        yPosition -= 20;
      }

      page.drawLine({
        start: { x: totalsX, y: yPosition + 5 },
        end: { x: width - margin.right, y: yPosition + 5 },
        thickness: 2,
        color: rgb(0, 0, 0),
      });
      yPosition -= 15;
      page.drawText("Total:", {
        x: totalsX,
        y: yPosition,
        size: 12,
        font: boldFont,
      });
      page.drawText(`Rs. ${invoiceData.total.toLocaleString("en-IN")}`, {
        x: width - margin.right - 80,
        y: yPosition,
        size: 12,
        font: boldFont,
      });
      yPosition -= 25;

      if (invoiceData.advancePaid > 0) {
        page.drawText("Advance Paid:", {
          x: totalsX,
          y: yPosition,
          size: 10,
          font,
          color: rgb(0, 0.6, 0),
        });
        page.drawText(
          `Rs. ${invoiceData.advancePaid.toLocaleString("en-IN")}`,
          {
            x: width - margin.right - 80,
            y: yPosition,
            size: 10,
            font,
            color: rgb(0, 0.6, 0),
          }
        );
        yPosition -= 20;
        page.drawText("Balance Due:", {
          x: totalsX,
          y: yPosition,
          size: 11,
          font: boldFont,
          color: rgb(0.8, 0.5, 0),
        });
        page.drawText(`Rs. ${invoiceData.balanceDue.toLocaleString("en-IN")}`, {
          x: width - margin.right - 80,
          y: yPosition,
          size: 11,
          font: boldFont,
          color: rgb(0.8, 0.5, 0),
        });
        yPosition -= 30;
      }

      // Terms & Bank
      const bottomY = yPosition;
      checkPageBreak(100);
      const currentBottomY = yPosition < bottomY ? yPosition : bottomY;

      if (invoiceData.terms) {
        page.drawText("Terms & Conditions:", {
          x: margin.left,
          y: currentBottomY,
          size: 10,
          font: boldFont,
        });
        let tY = currentBottomY - 15;
        const lines = invoiceData.terms.split("\n");
        for (const line of lines) {
          if (tY < margin.bottom + 60) break;
          page.drawText(line, {
            x: margin.left,
            y: tY,
            size: 8,
            font,
            maxWidth: contentWidth,
          });
          tY -= 12;
        }
      }

      if (invoiceData.companySettings.bankDetails) {
        const bd = invoiceData.companySettings.bankDetails;
        const bankX = margin.left;
        const bankY = margin.bottom + 80;
        if (currentBottomY > bankY + 60) {
          page.drawText("Bank Details:", {
            x: bankX,
            y: bankY,
            size: 10,
            font: boldFont,
          });
          const details = [
            `Account Name: ${bd.accountName}`,
            `Bank: ${bd.bankName}`,
            `Account No: ${bd.accountNumber}`,
            `IFSC: ${bd.ifscCode}`,
          ];
          let bY = bankY - 15;
          for (const d of details) {
            page.drawText(d, { x: bankX, y: bY, size: 9, font });
            bY -= 12;
          }
        }
      }

      page.drawText("Thank you for your business!", {
        x: margin.left,
        y: margin.bottom + 20,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });

      return await pdfDoc.save();
    } catch (error) {
      console.error("PDF generation error:", error);
      throw new Error("Failed to generate invoice PDF");
    }
  }

  static async generateQuotation(
    quotationData: QuotationData
  ): Promise<Uint8Array> {
    try {
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([595, 842]);
      const { width, height } = page.getSize();

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const margin = { left: 40, right: 40, top: 40, bottom: 40 };
      const contentWidth = width - margin.left - margin.right;
      let yPosition = height - margin.top;

      const checkPageBreak = (requiredSpace: number) => {
        const footerSpace = 60; // Minimized reserved space for footer
        if (yPosition < margin.bottom + footerSpace + requiredSpace) {
          page = pdfDoc.addPage([595, 842]);
          yPosition = height - margin.top;
          return true;
        }
        return false;
      };

      // ===== HEADER =====
      // Company Name
      page.drawText(quotationData.companySettings.name, {
        x: margin.left,
        y: yPosition,
        size: 20,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1),
      });

      // Quotation Label
      page.drawText("QUOTATION", {
        x: width - margin.right - 120,
        y: yPosition,
        size: 20,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.5),
      });
      yPosition -= 25;

      // Company Address
      const addressLines = (quotationData.companySettings.address || "").split(
        "\n"
      );
      for (const line of addressLines) {
        page.drawText(line, {
          x: margin.left,
          y: yPosition,
          size: 9,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
        yPosition -= 12;
      }

      // Quotation Meta (Right side)
      let metaY = height - margin.top - 25;
      page.drawText(`Quotation No: ${quotationData.quotationNumber}`, {
        x: width - margin.right - 120,
        y: metaY,
        size: 10,
        font: boldFont,
      });
      metaY -= 15;
      page.drawText(`Date: ${quotationData.date}`, {
        x: width - margin.right - 120,
        y: metaY,
        size: 9,
        font,
      });
      metaY -= 15;
      page.drawText(`Valid Until: ${quotationData.validUntil}`, {
        x: width - margin.right - 120,
        y: metaY,
        size: 9,
        font,
      });

      // Contact Info
      page.drawText(
        `Phone: ${quotationData.companySettings.phone} | Email: ${quotationData.companySettings.email}`,
        {
          x: margin.left,
          y: yPosition,
          size: 9,
          font,
          color: rgb(0.3, 0.3, 0.3),
        }
      );
      yPosition -= 12;

      page.drawText(`GSTIN: ${quotationData.companySettings.gstin}`, {
        x: margin.left,
        y: yPosition,
        size: 9,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 40;

      // ===== CLIENT & PROJECT DETAILS =====
      const detailsY = yPosition;
      const boxHeight = 80;

      // Client Details Box
      page.drawRectangle({
        x: margin.left,
        y: detailsY - boxHeight,
        width: contentWidth / 2 - 10,
        height: boxHeight,
        color: rgb(0.98, 0.98, 0.98),
        borderColor: rgb(0.9, 0.9, 0.9),
        borderWidth: 1,
      });

      let clientY = detailsY - 15;
      page.drawText("BILL TO:", {
        x: margin.left + 10,
        y: clientY,
        size: 8,
        font: boldFont,
        color: rgb(0.5, 0.5, 0.5),
      });
      clientY -= 15;

      page.drawText(quotationData.client.name, {
        x: margin.left + 10,
        y: clientY,
        size: 11,
        font: boldFont,
      });
      clientY -= 15;

      if (quotationData.client.address) {
        const clientAddressLines = quotationData.client.address.split("\n");
        for (const line of clientAddressLines) {
          if (clientY < detailsY - boxHeight + 10) break;
          page.drawText(line, {
            x: margin.left + 10,
            y: clientY,
            size: 9,
            font,
          });
          clientY -= 12;
        }
      }

      // Project Details Box
      const projectBoxX = margin.left + contentWidth / 2 + 10;
      page.drawRectangle({
        x: projectBoxX,
        y: detailsY - boxHeight,
        width: contentWidth / 2 - 10,
        height: boxHeight,
        color: rgb(0.98, 0.98, 0.98),
        borderColor: rgb(0.9, 0.9, 0.9),
        borderWidth: 1,
      });

      let projectY = detailsY - 15;
      if (quotationData.project.name) {
        page.drawText("PROJECT:", {
          x: projectBoxX + 10,
          y: projectY,
          size: 8,
          font: boldFont,
          color: rgb(0.5, 0.5, 0.5),
        });
        projectY -= 15;

        page.drawText(quotationData.project.name, {
          x: projectBoxX + 10,
          y: projectY,
          size: 11,
          font: boldFont,
        });
        projectY -= 15;

        if (quotationData.project.type) {
          page.drawText(`Type: ${quotationData.project.type}`, {
            x: projectBoxX + 10,
            y: projectY,
            size: 9,
            font,
          });
          projectY -= 12;
        }
        if (quotationData.project.deadline) {
          page.drawText(`Deadline: ${quotationData.project.deadline}`, {
            x: projectBoxX + 10,
            y: projectY,
            size: 9,
            font,
          });
        }
      }

      yPosition = detailsY - boxHeight - 30;

      // ===== TABLE HEADERS =====
      const tableHeaders = [
        "No.",
        "Description",
        "HSN/SAC",
        "Weight",
        "Qty",
        "Unit",
        "Rate",
        "Amount",
      ];
      const columnWidths = [30, 180, 50, 40, 30, 35, 60, 75];
      // Adjusted widths: Description wider, others optimized

      // Draw Header Background
      page.drawRectangle({
        x: margin.left,
        y: yPosition - 5,
        width: contentWidth,
        height: 25,
        color: rgb(0.2, 0.2, 0.4),
      });

      let xOffset = margin.left;
      tableHeaders.forEach((header, i) => {
        page.drawText(header, {
          x: xOffset + 5,
          y: yPosition + 4,
          size: 9,
          font: boldFont,
          color: rgb(1, 1, 1),
        });
        xOffset += columnWidths[i];
      });

      yPosition -= 25;

      // ===== LINE ITEMS (Dynamic Height) =====
      let itemNumber = 1;
      let isAlternateRow = false;

      for (const item of quotationData.items) {
        // 1. Calculate required height for this row
        const descriptionWidth = columnWidths[1] - 10;
        const mainDescHeight = this.calculateTextHeight(
          item.name || item.description || "Item",
          boldFont,
          9,
          descriptionWidth
        );

        // Calculate details height
        let detailsHeight = 0;
        const details = [];
        if (item.material) details.push(`Material: ${item.material}`);
        if (item.finish) details.push(`Finish: ${item.finish}`);
        if (item.notes) details.push(item.notes);

        for (const detail of details) {
          detailsHeight += this.calculateTextHeight(
            detail,
            font,
            8,
            descriptionWidth
          );
        }

        // Total row height (padding + desc + details)
        // calculateTextHeight already returns the height in points, so we just sum them
        const rowHeight = Math.max(30, mainDescHeight + detailsHeight + 15);

        // 2. Check Page Break
        if (checkPageBreak(rowHeight)) {
          // Redraw headers on new page
          page.drawRectangle({
            x: margin.left,
            y: yPosition - 5,
            width: contentWidth,
            height: 25,
            color: rgb(0.2, 0.2, 0.4),
          });
          let xOffset = margin.left;
          tableHeaders.forEach((header, i) => {
            page.drawText(header, {
              x: xOffset + 5,
              y: yPosition + 4,
              size: 9,
              font: boldFont,
              color: rgb(1, 1, 1),
            });
            xOffset += columnWidths[i];
          });
          yPosition -= 25;
        }

        // 3. Draw Row Background
        if (isAlternateRow) {
          page.drawRectangle({
            x: margin.left,
            y: yPosition - rowHeight + 10, // Adjust for visual alignment
            width: contentWidth,
            height: rowHeight,
            color: rgb(0.97, 0.97, 0.99),
          });
        }

        // 4. Draw Content
        xOffset = margin.left;
        const startY = yPosition - 10;

        // Item No
        page.drawText(itemNumber.toString(), {
          x: xOffset + 5,
          y: startY,
          size: 9,
          font,
        });
        xOffset += columnWidths[0];

        // Description & Details
        const descX = xOffset + 5;
        let currentTextY = startY;

        // Main Description (Wrapped)
        const descText = item.name || item.description || "Item";
        const descLines = this.wrapText(
          descText,
          boldFont,
          9,
          descriptionWidth
        );
        for (const line of descLines) {
          page.drawText(line, {
            x: descX,
            y: currentTextY,
            size: 9,
            font: boldFont,
            color: rgb(0.1, 0.1, 0.1),
          });
          currentTextY -= 13;
        }

        // Details (Wrapped)
        currentTextY -= 2; // small gap
        for (const detail of details) {
          const detailLines = this.wrapText(detail, font, 8, descriptionWidth);
          for (const line of detailLines) {
            page.drawText(line, {
              x: descX,
              y: currentTextY,
              size: 8,
              font,
              color: rgb(0.4, 0.4, 0.4),
            });
            currentTextY -= 11;
          }
        }
        xOffset += columnWidths[1];

        // Other Columns (Centered vertically if possible, but top-aligned is safer for now)
        // HSN
        page.drawText(item.hsnSacCode || "-", {
          x: xOffset + 5,
          y: startY,
          size: 9,
          font,
        });
        xOffset += columnWidths[2];

        // Weight
        page.drawText(
          item.estimatedWeight ? item.estimatedWeight.toString() : "-",
          { x: xOffset + 5, y: startY, size: 9, font }
        );
        xOffset += columnWidths[3];

        // Qty
        page.drawText(item.quantity?.toString() || "1", {
          x: xOffset + 5,
          y: startY,
          size: 9,
          font,
        });
        xOffset += columnWidths[4];

        // Unit
        page.drawText(item.unit || "nos", {
          x: xOffset + 5,
          y: startY,
          size: 9,
          font,
        });
        xOffset += columnWidths[5];

        // Rate
        const rateText = item.rate
          ? `Rs. ${item.rate.toLocaleString("en-IN")}`
          : "-";
        const rateWidth = font.widthOfTextAtSize(rateText, 9);
        page.drawText(rateText, {
          x: xOffset + columnWidths[6] - rateWidth - 5,
          y: startY,
          size: 9,
          font,
        });
        xOffset += columnWidths[6];

        // Amount
        const amountText = `Rs. ${item.total.toLocaleString("en-IN")}`;
        const amountWidth = boldFont.widthOfTextAtSize(amountText, 9);
        page.drawText(amountText, {
          x: xOffset + columnWidths[7] - amountWidth - 5,
          y: startY,
          size: 9,
          font: boldFont,
        });

        // Update Y and State
        yPosition -= rowHeight;
        itemNumber++;
        isAlternateRow = !isAlternateRow;
      }

      yPosition -= 10;

      // ===== TOTALS =====
      checkPageBreak(150);

      const totalsWidth = 220;
      const totalsX = width - margin.right - totalsWidth;

      // Divider
      page.drawLine({
        start: { x: margin.left, y: yPosition },
        end: { x: width - margin.right, y: yPosition },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });
      yPosition -= 20;

      // Subtotal
      page.drawText("Subtotal:", {
        x: totalsX,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: rgb(0.3, 0.3, 0.3),
      });
      const subtotalText = `Rs. ${quotationData.subtotal.toLocaleString(
        "en-IN"
      )}`;
      page.drawText(subtotalText, {
        x:
          width -
          margin.right -
          boldFont.widthOfTextAtSize(subtotalText, 10) -
          5,
        y: yPosition,
        size: 10,
        font: boldFont,
      });
      yPosition -= 25; // Increased spacing

      // Tax
      if (quotationData.tax > 0) {
        page.drawText("GST:", {
          x: totalsX,
          y: yPosition,
          size: 10,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
        const taxText = `Rs. ${quotationData.tax.toLocaleString("en-IN")}`;
        page.drawText(taxText, {
          x: width - margin.right - font.widthOfTextAtSize(taxText, 10) - 5,
          y: yPosition,
          size: 10,
          font,
        });
        yPosition -= 25; // Increased spacing
      }

      yPosition -= 10; // Extra gap before Total block

      // Total
      page.drawRectangle({
        x: totalsX - 10,
        y: yPosition - 10,
        width: totalsWidth + 10,
        height: 35, // Increased height
        color: rgb(0.95, 0.95, 0.95),
      });

      page.drawText("Total:", {
        x: totalsX,
        y: yPosition + 5, // Adjusted Y
        size: 14,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      const totalText = `Rs. ${quotationData.total.toLocaleString("en-IN")}`;
      page.drawText(totalText, {
        x: width - margin.right - boldFont.widthOfTextAtSize(totalText, 14) - 5,
        y: yPosition + 5, // Adjusted Y
        size: 14,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      yPosition -= 5; // ✅ FIXED: Minimal gap before Notes/Terms (reduced from 50→20→5)

      // ===== TERMS & BANK DETAILS =====
      // ===== NOTES & TERMS (Side-by-Side) =====
      const colGap = 20;
      const colWidth = (contentWidth - colGap) / 2;
      const leftColX = margin.left;
      const rightColX = margin.left + colWidth + colGap;

      let notesY = yPosition;
      let termsY = yPosition;

      // 1. Calculate Heights to check for page break
      let notesHeight = 0;
      let termsHeight = 0;

      if (quotationData.notes) {
        notesHeight += 15; // Header
        const lines = this.wrapText(quotationData.notes, font, 8, colWidth);
        notesHeight += lines.length * 12;
      }

      if (quotationData.terms) {
        termsHeight += 15; // Header
        const lines = this.wrapText(quotationData.terms, font, 8, colWidth);
        termsHeight += lines.length * 12;
      }

      const maxHeight = Math.max(notesHeight, termsHeight);

      // Check if we need a page break for the whole block
      if (checkPageBreak(maxHeight)) {
        notesY = yPosition;
        termsY = yPosition;
      }

      // Render Notes (Left Column)
      if (quotationData.notes) {
        page.drawText("Notes:", {
          x: leftColX,
          y: notesY,
          size: 10,
          font: boldFont,
          color: rgb(0.2, 0.2, 0.2),
        });
        notesY -= 15;

        const lines = this.wrapText(quotationData.notes, font, 8, colWidth);
        for (const line of lines) {
          page.drawText(line, {
            x: leftColX,
            y: notesY,
            size: 8,
            font,
            color: rgb(0.4, 0.4, 0.4),
          });
          notesY -= 12;
        }
      }

      // Render Terms (Right Column)
      if (quotationData.terms) {
        page.drawText("Terms & Conditions:", {
          x: rightColX,
          y: termsY,
          size: 10,
          font: boldFont,
          color: rgb(0.2, 0.2, 0.2),
        });
        termsY -= 15;

        const lines = this.wrapText(quotationData.terms, font, 8, colWidth);
        for (const line of lines) {
          page.drawText(line, {
            x: rightColX,
            y: termsY,
            size: 8,
            font,
            color: rgb(0.4, 0.4, 0.4),
          });
          termsY -= 12;
        }
      }

      // Update main Y position to the lowest point
      yPosition = Math.min(notesY, termsY) - 10;

      // Bank Details
      if (quotationData.companySettings.bankDetails) {
        const bd = quotationData.companySettings.bankDetails;
        const bankDetailsHeight = 15 + 4 * 12; // Header + 4 lines

        // Only check for page break if there's genuinely not enough space
        if (yPosition < margin.bottom + 60 + bankDetailsHeight) {
          checkPageBreak(bankDetailsHeight);
        }

        page.drawText("Bank Details:", {
          x: margin.left,
          y: yPosition,
          size: 10,
          font: boldFont,
          color: rgb(0.2, 0.2, 0.2),
        });
        yPosition -= 15;

        const details = [
          `Account Name: ${bd.accountName}`,
          `Bank: ${bd.bankName}`,
          `Account No: ${bd.accountNumber}`,
          `IFSC: ${bd.ifscCode}`,
        ];

        if (bd.branch) {
          details.push(`Branch: ${bd.branch}`);
        }

        for (const d of details) {
          page.drawText(d, {
            x: margin.left,
            y: yPosition,
            size: 9,
            font,
            color: rgb(0.4, 0.4, 0.4),
          });
          yPosition -= 12;
        }
      }

      // Footer
      page.drawText("Authorized Signatory", {
        x: width - margin.right - 120,
        y: margin.bottom + 50,
        size: 10,
        font: boldFont,
      });

      page.drawText("Thank you for your business!", {
        x: margin.left,
        y: margin.bottom + 20,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });

      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
    } catch (error) {
      console.error("PDF generation error:", error);
      throw new Error("Failed to generate quotation PDF");
    }
  }
}
