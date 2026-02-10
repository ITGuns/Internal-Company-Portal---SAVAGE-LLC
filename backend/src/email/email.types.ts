/**
 * Email Types and Interfaces
 * Defines all email-related type definitions
 */

export interface EmailOptions {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    attachments?: EmailAttachment[];
}

export interface EmailAttachment {
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
}

export interface EmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

// Email template data interfaces
export interface WelcomeEmailData {
    userName: string;
    userEmail: string;
    loginUrl: string;
}

export interface TaskAssignedEmailData {
    userName: string;
    taskTitle: string;
    taskDescription: string;
    assignedBy: string;
    dueDate?: string;
    taskUrl: string;
    departmentName: string;
}

export interface TaskStatusChangedEmailData {
    userName: string;
    taskTitle: string;
    oldStatus: string;
    newStatus: string;
    changedBy: string;
    taskUrl: string;
}

export interface DailyDigestEmailData {
    userName: string;
    date: string;
    assignedTasks: {
        title: string;
        status: string;
        dueDate?: string;
        url: string;
    }[];
    overdueTasks: {
        title: string;
        daysOverdue: number;
        url: string;
    }[];
    completedToday: number;
    totalPending: number;
    dashboardUrl: string;
}

export interface DepartmentUpdateEmailData {
    userName: string;
    departmentName: string;
    updateType: 'new_member' | 'task_created' | 'announcement';
    updateMessage: string;
    departmentUrl: string;
}

export interface PayslipGeneratedEmailData {
    userName: string;
    periodDateRange: string;
    netPay: string;
    grossPay: string;
    payDate: string;
    viewUrl: string;
}

export type EmailTemplateType =
    | 'welcome'
    | 'task_assigned'
    | 'task_status_changed'
    | 'daily_digest'
    | 'department_update'
    | 'password_reset'
    | 'payslip_generated';

export type EmailTemplateData =
    | WelcomeEmailData
    | TaskAssignedEmailData
    | TaskStatusChangedEmailData
    | DailyDigestEmailData
    | DepartmentUpdateEmailData
    | PayslipGeneratedEmailData;
