/**
 * Type definitions for Payroll Calendar module
 */

export type EventType = "payday" | "holiday" | "deadline" | "time" | "meeting" | "other";
export type PayrollTab = "calendar" | "employees" | "payslips" | "reports";

export interface Employee {
  id: string | number;
  name: string;
  role: string;
  department: string;
  avatar: string;
  hoursThisWeek: number;
  salary: number;
  performance: number;
  status: "active" | "vacation" | "leave" | "pending";
  // Extended fields for profile panel
  phone?: string;
  email?: string;
  citizenship?: string;
  city?: string;
  address?: string;
  birthday?: string;
  photo?: string; // URL for profile photo
  appliedDate?: string; // Date when application was submitted (for pending status)
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  extendedProps: {
    type: EventType;
    description?: string;
    custom?: boolean;
    customId?: string;
    // Clock-in/out session flags — these events are permanent, never deletable
    clockEntry?: boolean;
    entryId?: string;
    direction?: "in" | "out" | "total";
  };
}

export interface PayrollStats {
  payday: number;
  holiday: number;
  deadline: number;
  total: number;
}

// Time tracking interfaces
export type TimeEntryType = "work" | "vacation" | "sick" | "leave";

export interface TimeEntry {
  id: string;
  employeeId: string | number;
  date: string; // YYYY-MM-DD format
  type: TimeEntryType;
  clockIn?: string; // HH:MM format (for work type)
  clockOut?: string; // HH:MM format (for work type)
  hours?: number; // Calculated hours worked
  notes?: string;
}

export interface LeaveRecord {
  id: string;
  employeeId: string | number;
  type: "vacation" | "sick" | "leave";
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason?: string;
  approved: boolean;
}

// Document management
export interface EmployeeDocument {
  id: string;
  name: string;
  type: "contract" | "resume" | "tax" | "other";
  fileSize: string; // e.g., "2 MB"
  uploadDate: string;
  url?: string;
}

// Statistics for employee profile
export interface EmployeeStatistics {
  businessTrips: number; // days
  sickDays: number; // days
}

// Payslip management
export type PayslipStatus = "draft" | "issued" | "paid" | "void";

export interface Deduction {
  id: string;
  type: "tax" | "insurance" | "retirement" | "other";
  name: string;
  amount: number;
  percentage?: number; // If deduction is percentage-based
}

export interface Payslip {
  id: string;
  employeeId: string | number;
  employeeName: string;
  payPeriodStart: string; // YYYY-MM-DD
  payPeriodEnd: string; // YYYY-MM-DD
  issueDate: string; // YYYY-MM-DD
  status: PayslipStatus;
  hoursWorked: number;
  grossPay: number;
  deductions: Deduction[];
  netPay: number;
  notes?: string;
}

export type PayPeriod = "weekly" | "bi-weekly" | "monthly";

// Completed task tracking
export interface CompletedTask {
  id: string;
  employeeId: string | number;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  category?: string;
}
