import type { Payslip } from "@/lib/payroll-calendar/types";

export interface PayrollReportDepartmentSummary {
  department: string;
  gross: number;
  net: number;
  deductions: number;
  count: number;
}

export interface PayrollReportStat {
  periodId: string;
  label: string;
  gross: number;
  net: number;
  deductions: number;
  count: number;
  breakdown?: { tax: number; benefits: number };
  departmentSummary?: PayrollReportDepartmentSummary[];
}

export interface PayrollReportFilters {
  query?: string;
  department?: string;
  employeeId?: string;
  status?: string;
}

export interface PayrollReportBatchFile {
  filename: string;
  content: string;
}

export interface PayrollReportBatchInput {
  payslips?: Payslip[];
  departmentSummary?: PayrollReportDepartmentSummary[];
  stats?: PayrollReportStat[];
  filters?: PayrollReportFilters;
  generatedAt?: string;
}

function normalizeFilter(value?: string | null): string {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized && normalized !== "all" ? normalized : "";
}

export function getPayslipDepartment(payslip: Pick<Payslip, "employeeDepartment">): string {
  return payslip.employeeDepartment?.trim() || "Unassigned";
}

export function getUniquePayslipDepartments(payslips: Payslip[]): string[] {
  return Array.from(new Set(payslips.map(getPayslipDepartment))).sort((left, right) => left.localeCompare(right));
}

export function buildPayrollReportSearchParams(filters: PayrollReportFilters): string {
  const params = new URLSearchParams();
  const department = normalizeFilter(filters.department);
  const employeeId = normalizeFilter(filters.employeeId);
  const status = normalizeFilter(filters.status);

  if (department) params.set("department", filters.department || "");
  if (employeeId) params.set("userId", filters.employeeId || "");
  if (status) params.set("status", filters.status || "");

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export function filterPayslipsForReport(payslips: Payslip[], filters: PayrollReportFilters): Payslip[] {
  const query = normalizeFilter(filters.query);
  const department = normalizeFilter(filters.department);
  const employeeId = normalizeFilter(filters.employeeId);
  const status = normalizeFilter(filters.status);

  return payslips.filter((payslip) => {
    const searchable = [
      payslip.id,
      String(payslip.employeeId),
      payslip.employeeName,
      payslip.employeeEmail,
      payslip.employeeDepartment,
      payslip.employeeRole,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (query && !searchable.includes(query)) return false;
    if (department && getPayslipDepartment(payslip).toLowerCase() !== department) return false;
    if (employeeId && String(payslip.employeeId).toLowerCase() !== employeeId) return false;
    if (status && String(payslip.status || "").toLowerCase() !== status) return false;

    return true;
  });
}

export function buildDepartmentCostSummary(payslips: Payslip[]): PayrollReportDepartmentSummary[] {
  const summary = new Map<string, PayrollReportDepartmentSummary>();

  payslips.forEach((payslip) => {
    const department = getPayslipDepartment(payslip);
    const current = summary.get(department) || {
      department,
      gross: 0,
      net: 0,
      deductions: 0,
      count: 0,
    };

    current.gross += payslip.grossPay || 0;
    current.net += payslip.netPay || 0;
    current.deductions += (payslip.deductions || []).reduce((total, deduction) => total + (deduction.amount || 0), 0);
    current.count += 1;
    summary.set(department, current);
  });

  return Array.from(summary.values()).sort((left, right) => right.gross - left.gross);
}

export function summarizePayslipCosts(payslips: Payslip[]) {
  return payslips.reduce(
    (summary, payslip) => {
      summary.gross += payslip.grossPay || 0;
      summary.net += payslip.netPay || 0;
      summary.deductions += (payslip.deductions || []).reduce((total, deduction) => total + (deduction.amount || 0), 0);
      summary.hours += payslip.hoursWorked || 0;
      summary.count += 1;
      return summary;
    },
    { gross: 0, net: 0, deductions: 0, hours: 0, count: 0 },
  );
}

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildPayslipArchiveCsv(payslips: Payslip[]): string {
  const rows = [
    ["Payslip ID", "Employee", "Email", "Department", "Role", "Status", "Period Start", "Period End", "Issue Date", "Hours", "Gross Pay", "Deductions", "Net Pay"],
    ...payslips.map((payslip) => [
      payslip.id,
      payslip.employeeName,
      payslip.employeeEmail || "",
      getPayslipDepartment(payslip),
      payslip.employeeRole || "",
      payslip.status,
      payslip.payPeriodStart || "",
      payslip.payPeriodEnd || "",
      payslip.issueDate || "",
      String(payslip.hoursWorked || 0),
      String(payslip.grossPay || 0),
      String((payslip.deductions || []).reduce((total, deduction) => total + (deduction.amount || 0), 0)),
      String(payslip.netPay || 0),
    ]),
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildDepartmentSummaryCsv(summary: PayrollReportDepartmentSummary[]): string {
  const rows = [
    ["Department", "Gross Pay", "Deductions", "Net Pay", "Payslip Count"],
    ...summary.map((row) => [
      row.department,
      String(row.gross),
      String(row.deductions),
      String(row.net),
      String(row.count),
    ]),
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildPayrollStatsCsv(stats: PayrollReportStat[]): string {
  const rows = [
    ["Period ID", "Period", "Gross Pay", "Deductions", "Net Pay", "Payslip Count"],
    ...stats.map((row) => [
      row.periodId,
      row.label,
      String(row.gross),
      String(row.deductions),
      String(row.net),
      String(row.count),
    ]),
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildPayrollReportBatchFiles(input: PayrollReportBatchInput): PayrollReportBatchFile[] {
  const files: PayrollReportBatchFile[] = [];

  if (input.payslips) {
    files.push({
      filename: "payslip-archive.csv",
      content: buildPayslipArchiveCsv(input.payslips),
    });
  }

  if (input.departmentSummary) {
    files.push({
      filename: "department-cost-summary.csv",
      content: buildDepartmentSummaryCsv(input.departmentSummary),
    });
  }

  if (input.stats) {
    files.push({
      filename: "period-summary.csv",
      content: buildPayrollStatsCsv(input.stats),
    });
  }

  files.push({
    filename: "report-manifest.json",
    content: JSON.stringify({
      generatedAt: input.generatedAt || new Date().toISOString(),
      filters: input.filters || {},
      fileCount: files.length,
      files: files.map((file) => file.filename),
    }, null, 2),
  });

  return files;
}

function sanitizeZipFilename(filename: string): string {
  const sanitized = filename
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9._ -]/g, "-")
    .trim();

  return sanitized || "report.txt";
}

const crcTable = (() => {
  const table: number[] = [];
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function uint16(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function uint32(value: number): number[] {
  return [
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ];
}

function dosTimestamp(date: Date): { date: number; time: number } {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

function concatChunks(chunks: Uint8Array[], totalLength: number): Uint8Array {
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

export function buildReportZipArchive(files: PayrollReportBatchFile[], modifiedAt = new Date()): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  const { date, time } = dosTimestamp(modifiedAt);
  const utf8Flag = 0x0800;
  let offset = 0;
  let totalLength = 0;
  let centralLength = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(sanitizeZipFilename(file.filename));
    const contentBytes = encoder.encode(file.content);
    const checksum = crc32(contentBytes);
    const localHeaderOffset = offset;

    const localHeader = Uint8Array.from([
      0x50, 0x4b, 0x03, 0x04,
      ...uint16(20),
      ...uint16(utf8Flag),
      ...uint16(0),
      ...uint16(time),
      ...uint16(date),
      ...uint32(checksum),
      ...uint32(contentBytes.length),
      ...uint32(contentBytes.length),
      ...uint16(nameBytes.length),
      ...uint16(0),
    ]);

    chunks.push(localHeader, nameBytes, contentBytes);
    offset += localHeader.length + nameBytes.length + contentBytes.length;
    totalLength += localHeader.length + nameBytes.length + contentBytes.length;

    const centralHeader = Uint8Array.from([
      0x50, 0x4b, 0x01, 0x02,
      ...uint16(20),
      ...uint16(20),
      ...uint16(utf8Flag),
      ...uint16(0),
      ...uint16(time),
      ...uint16(date),
      ...uint32(checksum),
      ...uint32(contentBytes.length),
      ...uint32(contentBytes.length),
      ...uint16(nameBytes.length),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint32(0),
      ...uint32(localHeaderOffset),
    ]);

    centralDirectory.push(centralHeader, nameBytes);
    centralLength += centralHeader.length + nameBytes.length;
  }

  const centralOffset = offset;
  const endOfCentralDirectory = Uint8Array.from([
    0x50, 0x4b, 0x05, 0x06,
    ...uint16(0),
    ...uint16(0),
    ...uint16(files.length),
    ...uint16(files.length),
    ...uint32(centralLength),
    ...uint32(centralOffset),
    ...uint16(0),
  ]);

  return concatChunks(
    [...chunks, ...centralDirectory, endOfCentralDirectory],
    totalLength + centralLength + endOfCentralDirectory.length,
  );
}
