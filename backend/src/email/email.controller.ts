/**
 * Email Controller
 * API endpoints for email management and testing
 */

import express, { Request, Response, Router } from 'express';
import { authenticateToken } from '../auth/auth.middleware';
import { emailService } from './email.service';
import { EmailTemplateType } from './email.types';

export class EmailController {
    router(): Router {
        const router = express.Router();

        // Test email configuration
        router.post('/test', authenticateToken, async (req: Request, res: Response) => {
            try {
                const { email } = req.body;

                if (!email) {
                    return res.status(400).json({ error: 'Email address is required' });
                }

                // Simple email validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return res.status(400).json({ error: 'Invalid email address' });
                }

                const result = await emailService.sendTestEmail(email);

                if (result.success) {
                    res.json({
                        message: 'Test email sent successfully',
                        messageId: result.messageId,
                    });
                } else {
                    res.status(500).json({
                        error: 'Failed to send test email',
                        details: result.error,
                    });
                }
            } catch (error) {
                console.error('Error in sendTestEmail:', error);
                res.status(500).json({
                    error: 'Internal server error',
                    details: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        });

        // Send manual email
        router.post('/send', authenticateToken, async (req: Request, res: Response) => {
            try {
                const { to, subject, templateType, templateData } = req.body;

                if (!to || !subject) {
                    return res.status(400).json({ error: 'Recipient and subject are required' });
                }

                let result;

                if (templateType && templateData) {
                    // Send templated email
                    result = await emailService.sendTemplateEmail(
                        to,
                        subject,
                        templateType as EmailTemplateType,
                        templateData
                    );
                } else if (req.body.html || req.body.text) {
                    // Send raw email
                    result = await emailService.sendEmail({
                        to,
                        subject,
                        html: req.body.html,
                        text: req.body.text,
                    });
                } else {
                    return res.status(400).json({
                        error: 'Either templateType/templateData or html/text is required',
                    });
                }

                if (result.success) {
                    res.json({
                        message: 'Email sent successfully',
                        messageId: result.messageId,
                    });
                } else {
                    res.status(500).json({
                        error: 'Failed to send email',
                        details: result.error,
                    });
                }
            } catch (error) {
                console.error('Error in sendManualEmail:', error);
                res.status(500).json({
                    error: 'Internal server error',
                    details: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        });

        // Get email service status
        router.get('/status', authenticateToken, async (req: Request, res: Response) => {
            try {
                const isConnected = await emailService.verifyConnection();

                res.json({
                    enabled: process.env.EMAIL_ENABLED === 'true',
                    provider: process.env.EMAIL_PROVIDER || 'sendgrid',
                    connected: isConnected,
                    fromAddress: process.env.EMAIL_FROM_ADDRESS,
                    fromName: process.env.EMAIL_FROM_NAME,
                });
            } catch (error) {
                console.error('Error in getEmailStatus:', error);
                res.status(500).json({
                    error: 'Internal server error',
                    details: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        });

        return router;
    }
}
