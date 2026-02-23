/**
 * Email Service
 * Core email sending functionality with support for SendGrid and SMTP
 */

import sgMail from '@sendgrid/mail';
import nodemailer, { Transporter } from 'nodemailer';
import { emailConfig, validateEmailConfig } from './email.config';
import {
    EmailOptions,
    EmailResult,
    EmailTemplateType,
    EmailTemplateData,
} from './email.types';
import { getEmailTemplate, htmlToPlainText } from './email.templates';

export class EmailService {
    private static instance: EmailService;
    private transporter?: Transporter;
    private isConfigured: boolean = false;

    private constructor() {
        this.initialize();
    }

    static getInstance(): EmailService {
        if (!EmailService.instance) {
            EmailService.instance = new EmailService();
        }
        return EmailService.instance;
    }

    private initialize(): void {
        if (!emailConfig.enabled) {
            console.log('📧 Email service is disabled');
            return;
        }

        this.isConfigured = validateEmailConfig();

        if (!this.isConfigured) {
            console.warn('⚠️ Email service configuration is incomplete');
            return;
        }

        if (emailConfig.provider === 'sendgrid') {
            sgMail.setApiKey(emailConfig.sendgrid!.apiKey);
            console.log('✅ SendGrid email service initialized');
        } else if (emailConfig.provider === 'smtp') {
            this.transporter = nodemailer.createTransport({
                host: emailConfig.smtp!.host,
                port: emailConfig.smtp!.port,
                secure: emailConfig.smtp!.secure,
                auth: {
                    user: emailConfig.smtp!.auth.user,
                    pass: emailConfig.smtp!.auth.pass,
                },
            });
            console.log('✅ SMTP email service initialized');
        }
    }

    /**
     * Send a raw email
     */
    async sendEmail(options: EmailOptions): Promise<EmailResult> {
        if (!this.isConfigured) {
            console.warn('⚠️ Email not sent - service is not configured');
            return {
                success: false,
                error: 'Email service is not configured',
            };
        }

        try {
            const { to, subject, html, text, attachments } = options;

            // Ensure we have either HTML or text
            const emailHtml = html || '';
            const emailText = text || (html ? htmlToPlainText(html) : '');

            if (emailConfig.provider === 'sendgrid') {
                return await this.sendViaSendGrid(to, subject, emailHtml, emailText, attachments);
            } else {
                return await this.sendViaSMTP(to, subject, emailHtml, emailText, attachments);
            }
        } catch (error) {
            console.error('❌ Error sending email:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Send email using SendGrid
     */
    private async sendViaSendGrid(
        to: string | string[],
        subject: string,
        html: string,
        text: string,
        attachments?: EmailOptions['attachments']
    ): Promise<EmailResult> {
        try {
            const msg: any = {
                to,
                from: {
                    email: emailConfig.from.email,
                    name: emailConfig.from.name,
                },
                subject,
                text,
                html,
            };

            if (attachments && attachments.length > 0) {
                msg.attachments = attachments.map((att) => ({
                    filename: att.filename,
                    content: att.content?.toString('base64') || '',
                    type: att.contentType,
                    disposition: 'attachment',
                }));
            }

            const response = await sgMail.send(msg);
            console.log(`✅ Email sent via SendGrid to ${to}`);

            return {
                success: true,
                messageId: response[0].headers['x-message-id'],
            };
        } catch (error: any) {
            console.error('❌ SendGrid error:', error);
            return {
                success: false,
                error: error.message || 'SendGrid send failed',
            };
        }
    }

    /**
     * Send email using SMTP
     */
    private async sendViaSMTP(
        to: string | string[],
        subject: string,
        html: string,
        text: string,
        attachments?: EmailOptions['attachments']
    ): Promise<EmailResult> {
        if (!this.transporter) {
            return {
                success: false,
                error: 'SMTP transporter not initialized',
            };
        }

        try {
            const mailOptions: any = {
                from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
                to: Array.isArray(to) ? to.join(', ') : to,
                subject,
                text,
                html,
            };

            if (attachments && attachments.length > 0) {
                mailOptions.attachments = attachments;
            }

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email sent via SMTP to ${to}`);

            return {
                success: true,
                messageId: info.messageId,
            };
        } catch (error: any) {
            console.error('❌ SMTP error:', error);
            return {
                success: false,
                error: error.message || 'SMTP send failed',
            };
        }
    }

    /**
     * Send a templated email
     */
    async sendTemplateEmail(
        to: string | string[],
        subject: string,
        templateType: EmailTemplateType,
        templateData: EmailTemplateData
    ): Promise<EmailResult> {
        try {
            const html = getEmailTemplate(templateType, templateData);
            const text = htmlToPlainText(html);

            return await this.sendEmail({
                to,
                subject,
                html,
                text,
            });
        } catch (error) {
            console.error('❌ Error sending template email:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Send welcome email to new user
     */
    async sendWelcomeEmail(
        to: string,
        userName: string,
        loginUrl: string
    ): Promise<EmailResult> {
        return await this.sendTemplateEmail(
            to,
            'Welcome to SAVAGE LLC Internal Portal',
            'welcome',
            {
                userName,
                userEmail: to,
                loginUrl,
            }
        );
    }

    /**
     * Send task assigned email
     */
    async sendTaskAssignedEmail(
        to: string,
        data: {
            userName: string;
            taskTitle: string;
            taskDescription: string;
            assignedBy: string;
            dueDate?: string;
            taskUrl: string;
            departmentName: string;
        }
    ): Promise<EmailResult> {
        return await this.sendTemplateEmail(
            to,
            `New Task Assigned: ${data.taskTitle}`,
            'task_assigned',
            data
        );
    }

    /**
     * Send task status changed email
     */
    async sendTaskStatusChangedEmail(
        to: string,
        data: {
            userName: string;
            taskTitle: string;
            oldStatus: string;
            newStatus: string;
            changedBy: string;
            taskUrl: string;
        }
    ): Promise<EmailResult> {
        return await this.sendTemplateEmail(
            to,
            `Task Status Updated: ${data.taskTitle}`,
            'task_status_changed',
            data
        );
    }

    /**
     * Send daily digest email
     */
    async sendDailyDigestEmail(
        to: string,
        data: {
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
    ): Promise<EmailResult> {
        return await this.sendTemplateEmail(
            to,
            `Daily Task Summary - ${data.date}`,
            'daily_digest',
            data
        );
    }

    /**
     * Send payslip generated email
     */
    async sendPayslipNotification(
        to: string,
        data: {
            userName: string;
            periodDateRange: string;
            netPay: string;
            grossPay: string;
            payDate: string;
            viewUrl: string;
        }
    ): Promise<EmailResult> {
        return await this.sendTemplateEmail(
            to,
            `Payslip Ready: ${data.periodDateRange}`,
            'payslip_generated',
            data
        );
    }

    /**
     * Send new employee verification email
     */
    async sendEmployeeVerificationEmail(
        to: string,
        data: {
            id?: string;
            name: string;
            role: string;
            department: string;
            salary: number;
            status: string;
            hoursThisWeek: number;
            performance: number;
        }
    ): Promise<EmailResult> {
        return await this.sendEmail({
            to,
            subject: `Action Required: New Employee Verification - ${data.name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #1a1a1a;">New Employee Verification Request</h2>
                    <p style="color: #4a4a4a;">A new employee has been added to the system and requires your verification.</p>
                    
                    <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #e5e7eb;">
                        <h3 style="margin-top: 0; color: #374151; font-size: 16px; margin-bottom: 12px;">Employee Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; width: 120px;">Name:</td>
                                <td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280;">Role:</td>
                                <td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.role}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280;">Department:</td>
                                <td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.department}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280;">Salary:</td>
                                <td style="padding: 8px 0; color: #111827; font-weight: 500;">$${data.salary.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280;">Status:</td>
                                <td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.status}</td>
                            </tr>
                        </table>
                    </div>

                    <p style="color: #4a4a4a;">Please review these details and accept to activate this employee.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/payroll" 
                           style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                           Verify & Accept Employee
                        </a>
                    </div>
                    
                    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                        This email was sent from the SAVAGE LLC Internal Portal.<br/>
                        If you did not authorize this, please contact support immediately.
                    </p>
                </div>
            `,
        });
    }


    async verifyConnection(): Promise<boolean> {
        if (!this.isConfigured) {
            return false;
        }

        try {
            if (emailConfig.provider === 'smtp' && this.transporter) {
                await this.transporter.verify();
                console.log('✅ SMTP connection verified');
                return true;
            }
            // SendGrid doesn't have a verify method, assume configured correctly
            console.log('✅ SendGrid assumed configured');
            return true;
        } catch (error) {
            console.error('❌ Email service verification failed:', error);
            return false;
        }
    }

    /**
     * Send test email
     */
    async sendTestEmail(to: string): Promise<EmailResult> {
        return await this.sendEmail({
            to,
            subject: 'Test Email from SAVAGE LLC Portal',
            html: `
        <h1>Test Email</h1>
        <p>This is a test email from the SAVAGE LLC Internal Portal.</p>
        <p>If you received this, your email configuration is working correctly!</p>
        <p>Time sent: ${new Date().toISOString()}</p>
      `,
        });
    }
}

// Export singleton instance
export const emailService = EmailService.getInstance();
