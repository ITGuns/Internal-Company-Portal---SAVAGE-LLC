/**
 * Email Configuration
 * Manages email provider settings and configuration
 */

import { config } from '../config/env.config';

export interface EmailConfig {
    enabled: boolean;
    provider: 'sendgrid' | 'smtp';
    testOverrideEmail: string | null;
    from: {
        email: string;
        name: string;
    };
    sendgrid?: {
        apiKey: string;
    };
    smtp?: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
            user: string;
            pass: string;
        };
    };
}

export const emailConfig: EmailConfig = {
    enabled: process.env.EMAIL_ENABLED === 'true',
    provider: (process.env.EMAIL_PROVIDER as 'sendgrid' | 'smtp') || 'sendgrid',
    testOverrideEmail: process.env.TEST_EMAIL_OVERRIDE || null,
    from: {
        email: process.env.EMAIL_FROM_ADDRESS || 'noreply@savage-llc.com',
        name: process.env.EMAIL_FROM_NAME || 'SAVAGE LLC Internal Portal',
    },
    sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY || '',
    },
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
        },
    },
};

export const validateEmailConfig = (): boolean => {
    if (!emailConfig.enabled) {
        console.log('📧 Email service is disabled');
        return false;
    }

    if (emailConfig.provider === 'sendgrid') {
        if (!emailConfig.sendgrid?.apiKey) {
            console.error('❌ SendGrid API key is missing');
            return false;
        }
    } else if (emailConfig.provider === 'smtp') {
        if (!emailConfig.smtp?.auth.user || !emailConfig.smtp?.auth.pass) {
            console.error('❌ SMTP credentials are missing');
            return false;
        }
    }

    if (!emailConfig.from.email) {
        console.error('❌ Email FROM address is missing');
        return false;
    }

    console.log(`✅ Email service configured (provider: ${emailConfig.provider})`);
    return true;
};
