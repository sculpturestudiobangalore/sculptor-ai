import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/**
 * Generates and downloads an Excel file from JSON data.
 * @param data Array of objects to export
 * @param fileName Name of the file (without extension)
 * @param sheetName Name of the worksheet
 */
export const generateExcel = (
  data: any[],
  fileName: string,
  sheetName: string = "Sheet1"
) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const dataBlob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  });
  saveAs(dataBlob, `${fileName}.xlsx`);
};

/**
 * Generates and downloads a Tally XML file for Sales Vouchers.
 * @param invoices Array of invoice objects
 * @param fileName Name of the file (without extension)
 */
export const generateTallyXML = (invoices: any[], fileName: string) => {
  let xmlContent = `<ENVELOPE>\n<HEADER>\n<TALLYREQUEST>Import Data</TALLYREQUEST>\n</HEADER>\n<BODY>\n<IMPORTDATA>\n<REQUESTDESC>\n<REPORTNAME>Vouchers</REPORTNAME>\n<STATICVARIABLES>\n<SVCURRENTCOMPANY>Sculpture Studio</SVCURRENTCOMPANY>\n</STATICVARIABLES>\n</REQUESTDESC>\n<REQUESTDATA>\n`;

  invoices.forEach((inv) => {
    const date = new Date(inv.issue_date)
      .toISOString()
      .split("T")[0]
      .replace(/-/g, ""); // YYYYMMDD

    xmlContent += `<TALLYMESSAGE xmlns:UDF="TallyUDF">\n<VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">\n`;
    xmlContent += `<DATE>${date}</DATE>\n`;
    xmlContent += `<VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>\n`;
    xmlContent += `<VOUCHERNUMBER>${inv.invoice_number}</VOUCHERNUMBER>\n`;
    xmlContent += `<PARTYLEDGERNAME>${inv.client_name}</PARTYLEDGERNAME>\n`;
    xmlContent += `<PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>\n`;

    // Ledger Entry for Party (Debtor)
    xmlContent += `<ALLLEDGERENTRIES.LIST>\n`;
    xmlContent += `<LEDGERNAME>${inv.client_name}</LEDGERNAME>\n`;
    xmlContent += `<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n`;
    xmlContent += `<AMOUNT>-${inv.total_amount}</AMOUNT>\n`; // Debit is negative in Tally XML usually, or depends on context. For Sales, Party is Debited (Positive? No, Tally XML is tricky. Usually Debit is negative string in some versions, or just Amount. Let's stick to standard: Party Debit, Sales Credit.)
    // Actually Tally XML uses negative for Debit and Positive for Credit in some exports, but for Import it's often simpler.
    // Let's try standard: Debit Party, Credit Sales.
    // Wait, standard Tally XML:
    // Debit = Negative number? No, usually Debit is Positive in UI but in XML it might be signed.
    // Let's assume standard import format:
    // Party Ledger: ISDEEMEDPOSITIVE = Yes (Debit)
    // Sales Ledger: ISDEEMEDPOSITIVE = No (Credit)
    xmlContent += `</ALLLEDGERENTRIES.LIST>\n`;

    // Ledger Entry for Sales
    xmlContent += `<ALLLEDGERENTRIES.LIST>\n`;
    xmlContent += `<LEDGERNAME>Sales Account</LEDGERNAME>\n`;
    xmlContent += `<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`;
    xmlContent += `<AMOUNT>${inv.subtotal}</AMOUNT>\n`;
    xmlContent += `</ALLLEDGERENTRIES.LIST>\n`;

    // GST Ledgers
    if (inv.cgst_amount > 0) {
      xmlContent += `<ALLLEDGERENTRIES.LIST>\n<LEDGERNAME>CGST</LEDGERNAME>\n<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n<AMOUNT>${inv.cgst_amount}</AMOUNT>\n</ALLLEDGERENTRIES.LIST>\n`;
    }
    if (inv.sgst_amount > 0) {
      xmlContent += `<ALLLEDGERENTRIES.LIST>\n<LEDGERNAME>SGST</LEDGERNAME>\n<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n<AMOUNT>${inv.sgst_amount}</AMOUNT>\n</ALLLEDGERENTRIES.LIST>\n`;
    }
    if (inv.igst_amount > 0) {
      xmlContent += `<ALLLEDGERENTRIES.LIST>\n<LEDGERNAME>IGST</LEDGERNAME>\n<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n<AMOUNT>${inv.igst_amount}</AMOUNT>\n</ALLLEDGERENTRIES.LIST>\n`;
    }

    xmlContent += `</VOUCHER>\n</TALLYMESSAGE>\n`;
  });

  xmlContent += `</REQUESTDATA>\n</IMPORTDATA>\n</BODY>\n</ENVELOPE>`;

  const blob = new Blob([xmlContent], { type: "text/xml;charset=utf-8" });
  saveAs(blob, `${fileName}.xml`);
};
