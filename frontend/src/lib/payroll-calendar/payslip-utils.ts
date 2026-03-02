import { Payslip, Deduction, PayPeriod, Employee } from "./types";

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
 * Generate unique payslip ID
 */
export function generatePayslipId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `PAY-${timestamp}-${random}`.toUpperCase();
}

/**
 * Get pay period dates for current month
 */
export function getCurrentPayPeriod(): { start: string; end: string } {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    start: firstDay.toISOString().split("T")[0],
    end: lastDay.toISOString().split("T")[0],
  };
}

/**
 * Validate payslip data
 */
export function validatePayslip(payslip: Partial<Payslip>): string[] {
  const errors: string[] = [];

  if (!payslip.employeeId) {
    errors.push("Employee ID is required");
  }

  if (!payslip.payPeriodStart) {
    errors.push("Pay period start date is required");
  }

  if (!payslip.payPeriodEnd) {
    errors.push("Pay period end date is required");
  }

  if (
    payslip.payPeriodStart &&
    payslip.payPeriodEnd &&
    new Date(payslip.payPeriodStart) > new Date(payslip.payPeriodEnd)
  ) {
    errors.push("Pay period start must be before end date");
  }

  if (payslip.grossPay && payslip.grossPay < 0) {
    errors.push("Gross pay cannot be negative");
  }

  if (payslip.netPay && payslip.netPay < 0) {
    errors.push("Net pay cannot be negative");
  }

  return errors;
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
    doc.text("SAVAGE LLC", pageWidth / 2, 25, { align: "center" });

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
    doc.text(`Issue Date: ${new Date(payslip.issueDate).toLocaleDateString()}`, 110, yPos + 12);
    doc.text(`Status: ${payslip.status.toUpperCase()}`, 110, yPos + 18);

    yPos += 35;

    // Table Header
    doc.setFillColor(248, 250, 252);
    doc.rect(15, yPos, pageWidth - 30, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIPTION", 20, yPos + 7);
    doc.text("AMOUNT", pageWidth - 20, yPos + 7, { align: "right" });
    yPos += 15;

    // Earnings
    doc.setFont("helvetica", "normal");
    doc.text("Gross Earnings / Base Salary", 20, yPos);
    doc.text(formatCurrency(payslip.grossPay), pageWidth - 20, yPos, { align: "right" });
    yPos += 10;

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
        doc.text(`-${formatCurrency(d.amount)}`, pageWidth - 20, yPos, { align: "right" });
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
    doc.text(formatCurrency(payslip.grossPay), 190, yPos + 8, { align: "right" });

    doc.text("Total Deductions:", 115, yPos + 16);
    const totalDeductions = calculateTotalDeductions(payslip.deductions);
    doc.text(`-${formatCurrency(totalDeductions)}`, 190, yPos + 16, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("NET PAY:", 115, yPos + 25);
    doc.text(formatCurrency(payslip.netPay), 190, yPos + 25, { align: "right" });

    yPos += 50;

    // Signatures
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.line(15, yPos, 85, yPos);
    doc.text("Employee Signature", 15, yPos + 5);

    doc.line(110, yPos, 190, yPos);
    doc.text("Authorized Signature", 110, yPos + 5);

    // Reset text color for footer
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
      "This is a legally binding document generated by the Savage LLC Enterprises Portal.",
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 15,
      { align: "center" }
    );
    doc.text(
      `Generated on ${new Date().toLocaleDateString("en-US")} at ${new Date().toLocaleTimeString("en-US")}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );

    // Generate filename
    const monthYear = new Date(payslip.payPeriodStart).toLocaleDateString(
      "en-US",
      { month: "short", year: "numeric" }
    );
    const filename = `payslip-${employee.name.replace(/\s+/g, "-")}-${monthYear}.pdf`;

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

/**
 * Format pay period string
 */
export function formatPayPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const startStr = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endStr = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startStr} - ${endStr}`;
}

/**
 * Get year-to-date earnings for employee
 */
export function calculateYTDEarnings(
  payslips: Payslip[],
  employeeId: number
): number {
  const currentYear = new Date().getFullYear();

  return payslips
    .filter((p) => {
      const payslipYear = new Date(p.payPeriodStart).getFullYear();
      return p.employeeId === employeeId && payslipYear === currentYear;
    })
    .reduce((sum, p) => sum + p.grossPay, 0);
}

/**
 * Get year-to-date taxes for employee
 */
export function calculateYTDTaxes(
  payslips: Payslip[],
  employeeId: number
): number {
  const currentYear = new Date().getFullYear();

  return payslips
    .filter((p) => {
      const payslipYear = new Date(p.payPeriodStart).getFullYear();
      return p.employeeId === employeeId && payslipYear === currentYear;
    })
    .reduce((sum, p) => {
      const taxDeductions = p.deductions
        .filter((d) => d.type === "tax")
        .reduce((taxSum, d) => taxSum + d.amount, 0);
      return sum + taxDeductions;
    }, 0);
}
