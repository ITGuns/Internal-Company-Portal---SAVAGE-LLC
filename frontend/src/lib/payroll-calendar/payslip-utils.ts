import { Payslip, Deduction, PayPeriod, Employee } from "./types";
import { formatPayrollDate, formatPayrollPeriod, formatPayrollTime } from "../payroll-dates";
import { getPayrollItemTypeLabel, inferPayrollItemType, isDeductionItemType } from "../payslip-edit";
import { getPayBasisLabel } from "../pay-basis";
import { drawPdfApprovalBlock } from "../payslip-approval";

/**
 * Earning lines for the payslip PDF, labelled by item type (Regular hours, Overtime and so on)
 * so the legacy "Base Salary" wording never shows. `detail` is the stored line description,
 * which names the salary divisor scheme as it was when the payslip was generated.
 * Deductions and withholding tax are listed separately.
 */
export function getPayslipEarningLines(
  payslip: Pick<Payslip, "grossPay" | "items">,
): Array<{ label: string; amount: number; detail?: string }> {
  const lines = (payslip.items ?? [])
    .map((item) => ({ type: inferPayrollItemType(item.type, item.amount), amount: item.amount, description: item.description }))
    .filter((item) => !isDeductionItemType(item.type))
    .map((item) => {
      const label = getPayrollItemTypeLabel(item.type);
      const detail = item.description?.trim();
      return detail && detail !== label ? { label, amount: item.amount, detail } : { label, amount: item.amount };
    });

  return lines.length > 0 ? lines : [{ label: "Gross earnings", amount: payslip.grossPay }];
}

/**
 * Calculate gross pay based on salary and pay period
 */
export function calculateGrossPay(
  annualSalary: number,
  period: PayPeriod
): number {
  switch (period) {
    case "monthly":
      return Math.round(annualSalary / 12);
    case "bi-weekly":
      return Math.round(annualSalary / 26);
    case "weekly":
      return Math.round(annualSalary / 52);
    default:
      return Math.round(annualSalary / 12);
  }
}

/**
 * Calculate standard deductions based on gross pay
 */
export function calculateStandardDeductions(grossPay: number): Deduction[] {
  return [
    {
      id: "tax-income",
      type: "tax",
      name: "Income Tax",
      amount: Math.round(grossPay * 0.15),
      percentage: 15,
    },
    {
      id: "sss-contribution",
      type: "tax",
      name: "SSS Contribution",
      amount: Math.round(grossPay * 0.05),
      percentage: 5,
    },
    {
      id: "insurance-philhealth",
      type: "insurance",
      name: "PhilHealth",
      amount: 250,
    },
    {
      id: "pagibig-fund",
      type: "insurance",
      name: "Pag-IBIG Fund",
      amount: 100,
    }
  ];
}

/**
 * Calculate net pay from gross and deductions
 */
export function calculateNetPay(
  grossPay: number,
  deductions: Deduction[]
): number {
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  return Math.max(0, grossPay - totalDeductions);
}

/**
 * Format currency to USD string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Money for the payslip PDF: "PHP 1,234.00" (or "-PHP 1,234.00"). jsPDF's
 * built-in Helvetica has no peso sign and prints "±" for it, so the PDF spells
 * the currency out; screens keep formatCurrency with the sign.
 */
export function formatPdfMoney(amount: number, currency = "PHP"): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const digits = Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = value < 0 && digits !== "0.00" ? "-" : "";
  return `${sign}${currency} ${digits}`;
}

/**
 * Generate PDF for payslip using jspdf
 */
export function generatePayslipPDF(payslip: Payslip, employee: Employee): void {
  // Dynamic import to avoid SSR issues with Next.js
  import("jspdf").then(({ jsPDF }) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Company Header
    doc.setFillColor(30, 41, 59); // Dark blue header
    doc.rect(0, 0, pageWidth, 45, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Deskii", pageWidth / 2, 25, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("ENTERPRISE MANAGEMENT PORTAL", pageWidth / 2, 35, { align: "center" });

    yPos = 60;
    doc.setTextColor(30, 41, 59);

    // Payslip Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("PAYSLIP ADVICE", 15, yPos);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`#${payslip.id.slice(-8).toUpperCase()}`, pageWidth - 15, yPos, { align: "right" });
    yPos += 15;

    // Grid Layout for Info
    doc.setDrawColor(226, 232, 240);
    doc.line(15, yPos - 5, pageWidth - 15, yPos - 5);

    // Left: Employee Info
    doc.setFont("helvetica", "bold");
    doc.text("EMPLOYEE", 15, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(employee.name, 15, yPos + 6);
    doc.text(employee.role, 15, yPos + 12);
    doc.text(employee.department, 15, yPos + 18);

    // Right: Period Info
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT PERIOD", 110, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(formatPayPeriod(payslip.payPeriodStart, payslip.payPeriodEnd), 110, yPos + 6);
    doc.text(`Issue Date: ${formatPayrollDate(payslip.issueDate)}`, 110, yPos + 12);
    doc.text(`Status: ${payslip.status.toUpperCase()}`, 110, yPos + 18);

    yPos += 35;

    // Table Header
    doc.setFillColor(248, 250, 252);
    doc.rect(15, yPos, pageWidth - 30, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIPTION", 20, yPos + 7);
    doc.text("AMOUNT", pageWidth - 20, yPos + 7, { align: "right" });
    yPos += 15;

    // Earnings, one line per item type, under the employee's pay basis when known
    doc.setFont("helvetica", "normal");
    if (payslip.payBasis) {
      doc.text(`Pay basis: ${getPayBasisLabel(payslip.payBasis)}`, 20, yPos);
      yPos += 8;
    }
    getPayslipEarningLines(payslip).forEach((line) => {
      doc.text(line.label, 20, yPos);
      doc.text(formatPdfMoney(line.amount), pageWidth - 20, yPos, { align: "right" });
      yPos += 5;
      if (line.detail) {
        // The stored description (scheme name, hours) in small grey type under the label.
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const detailLines: string[] = doc.splitTextToSize(line.detail, pageWidth - 80);
        doc.text(detailLines, 20, yPos);
        yPos += detailLines.length * 4;
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
      }
      yPos += 3;
    });
    yPos += 2;

    // Deductions
    doc.setFont("helvetica", "bold");
    doc.text("DEDUCTIONS", 15, yPos + 5);
    yPos += 12;
    doc.setFont("helvetica", "normal");

    if (payslip.deductions.length === 0) {
      doc.text("No deductions applied", 20, yPos);
      yPos += 10;
    } else {
      payslip.deductions.forEach(d => {
        doc.text(d.name, 20, yPos);
        doc.text(formatPdfMoney(-d.amount), pageWidth - 20, yPos, { align: "right" });
        yPos += 8;
      });
    }

    yPos += 5;
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 10;

    // Summary Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(110, yPos, 85, 30, 3, 3, "F");

    doc.setFont("helvetica", "normal");
    doc.text("Total Gross:", 115, yPos + 8);
    doc.text(formatPdfMoney(payslip.grossPay), 190, yPos + 8, { align: "right" });

    doc.text("Total Deductions:", 115, yPos + 16);
    const totalDeductions = calculateTotalDeductions(payslip.deductions);
    doc.text(formatPdfMoney(-totalDeductions), 190, yPos + 16, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text((payslip.items ?? []).some((item) => item.type === "tax") ? "NET (AFTER TAX):" : "NET PAY:", 115, yPos + 25);
    doc.text(formatPdfMoney(payslip.netPay), 190, yPos + 25, { align: "right" });

    yPos += 50;

    // Signatures
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.line(15, yPos, 85, yPos);
    doc.text("Employee Signature", 15, yPos + 5);

    // Disbursement sign-off (2026-10-28): the approval block, or the plain signature line.
    drawPdfApprovalBlock(doc, payslip, 110, yPos, 80);

    // Reset text color for footer
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
      "This is a legally binding document generated by the Deskii Workspace.",
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 15,
      { align: "center" }
    );
    // Manila date and time, like every other payroll date. ICU puts a narrow
    // no-break space before AM / PM, which Helvetica cannot print either.
    const generatedAt = new Date();
    doc.text(
      `Generated on ${formatPayrollDate(generatedAt)} at ${formatPayrollTime(generatedAt).replace(/\s/g, " ")}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );

    // Generate filename (the period's Manila month; new Date("YYYY-MM-01") is a day early west of UTC)
    const monthYear = formatPayrollDate(payslip.payPeriodStart, { edge: "start", format: { month: "short", year: "numeric" } }, "");
    const employeePart = employee.name.replace(/\s+/g, "-");
    const filename = monthYear ? `payslip-${employeePart}-${monthYear}.pdf` : `payslip-${employeePart}.pdf`;

    // Save the PDF
    doc.save(filename);
  });
}

/**
 * Get color class for payslip status
 */
export function getStatusColor(status: Payslip["status"]): string {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "issued":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "draft":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
  }
}

/**
 * Calculate total deductions
 */
export function calculateTotalDeductions(deductions: Deduction[]): number {
  return deductions.reduce((sum, d) => sum + d.amount, 0);
}

/** Pay period label in Manila days. Same helper as every other payroll date label. */
export const formatPayPeriod = formatPayrollPeriod;
