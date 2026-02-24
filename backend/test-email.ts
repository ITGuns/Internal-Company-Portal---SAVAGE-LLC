import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables MUST be first
dotenv.config({ path: path.join(__dirname, '.env') });

import { EmailService } from './src/email/email.service';
const emailService = EmailService.getInstance();

async function test() {
    console.log('🧪 Testing Email Service...');

    // Test SMTP status
    const isConfigured = await emailService.verifyConnection();
    if (!isConfigured) {
        console.error('❌ Email service is not configured or connection failed.');
        return;
    }
    console.log('✅ SMTP Connection verified!');

    // Send a real welcome email to the developer for testing
    const testEmail = 'gunsembacanan27@gmail.com';
    console.log(`✉️ Sending test welcome email to ${testEmail}...`);

    const result = await emailService.sendWelcomeEmail(
        testEmail,
        'Guns\'n Full Embacanan',
        'Savage2025!',
        'http://localhost:3000/login'
    );

    if (result.success) {
        console.log('🚀 Email sent successfully! Check your inbox.');
    } else {
        console.error('❌ Email failed to send:', result.error);
    }
}

test();
