import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  client: {
    name: string;
    address: string;
    phone: string;
  };
  items: {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
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
  items: {
    description: string;
    amount: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  terms?: string;
}

export class PDFGenerator {
  static async generateInvoice(invoiceData: InvoiceData): Promise<Uint8Array> {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Set up margins and dimensions
      const margin = 50;
      let yPosition = height - margin;

      // Header
      page.drawText('Dhanush Sculpture Studio', {
        x: margin,
        y: yPosition,
        size: 20,
        font: boldFont,
        color: rgb(0.12, 0.25, 0.69), // Blue color
      });
      yPosition -= 30;

      page.drawText('INVOICE', {
        x: margin,
        y: yPosition,
        size: 16,
        font: boldFont,
      });
      yPosition -= 20;

      // Invoice details
      page.drawText(`Invoice #: ${invoiceData.invoiceNumber}`, {
        x: margin,
        y: yPosition,
        size: 10,
        font,
      });
      yPosition -= 15;

      page.drawText(`Date: ${invoiceData.date}`, {
        x: margin,
        y: yPosition,
        size: 10,
        font,
      });
      yPosition -= 15;

      page.drawText(`Due Date: ${invoiceData.dueDate}`, {
        x: margin,
        y: yPosition,
        size: 10,
        font,
      });
      yPosition -= 30;

      // Client information
      page.drawText('Bill To:', {
        x: margin,
        y: yPosition,
        size: 12,
        font: boldFont,
      });
      yPosition -= 15;

      page.drawText(invoiceData.client.name, {
        x: margin,
        y: yPosition,
        size: 10,
        font,
      });
      yPosition -= 12;

      page.drawText(invoiceData.client.address, {
        x: margin,
        y: yPosition,
        size: 10,
        font,
      });
      yPosition -= 12;

      page.drawText(invoiceData.client.phone, {
        x: margin,
        y: yPosition,
        size: 10,
        font,
      });
      yPosition -= 30;

      // Table header
      page.drawText('Description', {
        x: margin,
        y: yPosition,
        size: 10,
        font: boldFont,
      });
      page.drawText('Qty', {
        x: width - 200,
        y: yPosition,
        size: 10,
        font: boldFont,
      });
      page.drawText('Rate', {
        x: width - 150,
        y: yPosition,
        size: 10,
        font: boldFont,
      });
      page.drawText('Amount', {
        x: width - 80,
        y: yPosition,
        size: 10,
        font: boldFont,
      });
      yPosition -= 20;

      // Draw line under header
      page.drawLine({
        start: { x: margin, y: yPosition },
        end: { x: width - margin, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      yPosition -= 15;

      // Items
      for (const item of invoiceData.items) {
        page.drawText(item.description, {
          x: margin,
          y: yPosition,
          size: 9,
          font,
        });
        page.drawText(item.quantity.toString(), {
          x: width - 200,
          y: yPosition,
          size: 9,
          font,
        });
        page.drawText(`₹${item.rate.toLocaleString('en-IN')}`, {
          x: width - 150,
          y: yPosition,
          size: 9,
          font,
        });
        page.drawText(`₹${item.amount.toLocaleString('en-IN')}`, {
          x: width - 80,
          y: yPosition,
          size: 9,
          font,
        });
        yPosition -= 15;
      }

      yPosition -= 10;

      // Totals
      page.drawText('Subtotal:', {
        x: width - 150,
        y: yPosition,
        size: 10,
        font: boldFont,
      });
      page.drawText(`₹${invoiceData.subtotal.toLocaleString('en-IN')}`, {
        x: width - 80,
        y: yPosition,
        size: 10,
        font,
      });
      yPosition -= 15;

      page.drawText('Tax (18%):', {
        x: width - 150,
        y: yPosition,
        size: 10,
        font: boldFont,
      });
      page.drawText(`₹${invoiceData.tax.toLocaleString('en-IN')}`, {
        x: width - 80,
        y: yPosition,
        size: 10,
        font,
      });
      yPosition -= 15;

      page.drawLine({
        start: { x: width - 150, y: yPosition },
        end: { x: width - margin, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      yPosition -= 15;

      page.drawText('TOTAL:', {
        x: width - 150,
        y: yPosition,
        size: 12,
        font: boldFont,
      });
      page.drawText(`₹${invoiceData.total.toLocaleString('en-IN')}`, {
        x: width - 80,
        y: yPosition,
        size: 12,
        font: boldFont,
      });

      // Notes
      if (invoiceData.notes) {
        yPosition -= 40;
        page.drawText('Notes:', {
          x: margin,
          y: yPosition,
          size: 10,
          font: boldFont,
        });
        yPosition -= 15;
        page.drawText(invoiceData.notes, {
          x: margin,
          y: yPosition,
          size: 9,
          font,
        });
      }

      // Footer
      yPosition = margin;
      page.drawText('Thank you for your business! • Dhanush Sculpture Studio', {
        x: margin,
        y: yPosition,
        size: 8,
        font,
        color: rgb(0.42, 0.45, 0.49),
      });

      return await pdfDoc.save();
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate invoice PDF');
    }
  }

  static async generateQuotation(quotationData: QuotationData): Promise<Uint8Array> {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const margin = 50;
      let yPosition = height - margin;

      // Header
      page.drawText('Dhanush Sculpture Studio', {
        x: margin,
        y: yPosition,
        size: 20,
        font: boldFont,
        color: rgb(0.06, 0.47, 0.31), // Green color
      });
      yPosition -= 30;

      page.drawText('QUOTATION', {
        x: margin,
        y: yPosition,
        size: 16,
        font: boldFont,
      });
      yPosition -= 20;

      // Quotation details
      page.drawText(`Quotation #: ${quotationData.quotationNumber}`, {
        x: margin,
        y: yPosition,
        size: 10,
        font,
      });
      yPosition -= 15;

      page.drawText(`Date: ${quotationData.date}`, {
        x: margin,
        y: yPosition,
        size: 10,
        font,
      });
      yPosition -= 15;

      page.drawText(`Valid Until: ${quotationData.validUntil}`, {
        x: margin,
        y: yPosition,
        size: 10,
        font,
      });
      yPosition -= 30;

      // Project information
      page.drawText('Project:', {
        x: margin,
        y: yPosition,
        size: 12,
        font: boldFont,
      });
      yPosition -= 15;

      page.drawText(`Client: ${quotationData.client.name}`, {
        x: margin,
        y: yPosition,
        size: 10,
        font,
      });
      yPosition -= 12;

      page.drawText(`Project: ${quotationData.project.name} (${quotationData.project.type})`, {
        x: margin,
        y: yPosition,
        size: 10,
        font,
      });
      yPosition -= 12;

      page.drawText(`Deadline: ${quotationData.project.deadline}`, {
        x: margin,
        y: yPosition,
        size: 10,
        font,
      });
      yPosition -= 12;

      page.drawText(`Contact: ${quotationData.client.phone}`, {
        x: margin,
        y: yPosition,
        size: 10,
        font,
      });
      yPosition -= 30;

      // Items
      page.drawText('Description', {
        x: margin,
        y: yPosition,
        size: 10,
        font: boldFont,
      });
      page.drawText('Amount', {
        x: width - 100,
        y: yPosition,
        size: 10,
        font: boldFont,
      });
      yPosition -= 20;

      page.drawLine({
        start: { x: margin, y: yPosition },
        end: { x: width - margin, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      yPosition -= 15;

      for (const item of quotationData.items) {
        page.drawText(item.description, {
          x: margin,
          y: yPosition,
          size: 9,
          font,
        });
        page.drawText(`₹${item.amount.toLocaleString('en-IN')}`, {
          x: width - 100,
          y: yPosition,
          size: 9,
          font,
        });
        yPosition -= 15;
      }

      yPosition -= 10;

      // Totals
      page.drawText('Subtotal:', {
        x: width - 150,
        y: yPosition,
        size: 10,
        font: boldFont,
      });
      page.drawText(`₹${quotationData.subtotal.toLocaleString('en-IN')}`, {
        x: width - 80,
        y: yPosition,
        size: 10,
        font,
      });
      yPosition -= 15;

      page.drawText('Tax (18%):', {
        x: width - 150,
        y: yPosition,
        size: 10,
        font: boldFont,
      });
      page.drawText(`₹${quotationData.tax.toLocaleString('en-IN')}`, {
        x: width - 80,
        y: yPosition,
        size: 10,
        font,
      });
      yPosition -= 15;

      page.drawLine({
        start: { x: width - 150, y: yPosition },
        end: { x: width - margin, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      yPosition -= 15;

      page.drawText('TOTAL:', {
        x: width - 150,
        y: yPosition,
        size: 12,
        font: boldFont,
      });
      page.drawText(`₹${quotationData.total.toLocaleString('en-IN')}`, {
        x: width - 80,
        y: yPosition,
        size: 12,
        font: boldFont,
      });

      // Terms
      if (quotationData.terms) {
        yPosition -= 40;
        page.drawText('Terms & Conditions:', {
          x: margin,
          y: yPosition,
          size: 10,
          font: boldFont,
        });
        yPosition -= 15;
        page.drawText(quotationData.terms, {
          x: margin,
          y: yPosition,
          size: 9,
          font,
        });
      }

      // Footer
      yPosition = margin;
      page.drawText('We appreciate the opportunity to work with you • Dhanush Sculpture Studio', {
        x: margin,
        y: yPosition,
        size: 8,
        font,
        color: rgb(0.42, 0.45, 0.49),
      });

      return await pdfDoc.save();
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate quotation PDF');
    }
  }

  // FIXED: Simple savePDF method that avoids Blob type issues
  static async savePDF(pdfBytes: Uint8Array, filename: string): Promise<string> {
    try {
      // Convert to base64 for direct download - no Blob involved
      const base64 = btoa(String.fromCharCode(...pdfBytes));
      const dataUrl = `data:application/pdf;base64,${base64}`;
      
      return dataUrl;
    } catch (error) {
      console.error('PDF save error:', error);
      throw new Error('Failed to save PDF');
    }
  }

  static generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${random}`;
  }

  static generateQuotationNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `QUO-${year}${month}-${random}`;
  }
}