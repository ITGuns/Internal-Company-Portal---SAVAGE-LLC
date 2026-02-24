import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables MUST be first
dotenv.config({ path: path.join(__dirname, '.env') });

import { prisma } from './src/database/prisma.service';
import { EmailService } from './src/email/email.service';

const emailService = EmailService.getInstance();

async function main() {
    console.log('🚀 Starting to send emails to all pending employees...');

    // 1. Verify Email Connection
    const isConfigured = await emailService.verifyConnection();
    if (!isConfigured) {
        console.error('❌ Email service NOT configured correctly. Stopping.');
        return;
    }

    // 2. Fetch all Pending Users
    const pendingUsers = await prisma.user.findMany({
        where: {
            status: 'pending'
        }
    });

    if (pendingUsers.length === 0) {
        console.log('ℹ️ No pending employees found in the database.');
        return;
    }

    console.log(`📋 Found ${pendingUsers.length} pending employees.`);

    // 3. Send emails
    const defaultPassword = 'Savage2025!';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const loginUrl = `${frontendUrl}/login`;

    for (const user of pendingUsers) {
        console.log(`✉️ Sending welcome email to: ${user.name} (${user.email})...`);

        try {
            const result = await emailService.sendWelcomeEmail(
                user.email,
                user.name || 'Employee',
                defaultPassword,
                loginUrl
            );

            if (result.success) {
                console.log(`✅ Success: Email sent to ${user.name}`);
            } else {
                console.error(`❌ Failed: Could not send to ${user.name}. Error: ${result.error}`);
            }
        } catch (error) {
            console.error(`❌ Critical Error sending to ${user.name}:`, error);
        }
    }

    console.log('✨ All pending email tasks complete.');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Unexpected error in script:', err);
    process.exit(1);
});
