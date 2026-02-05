/**
 * Standalone Email Test Script
 * Tests the email service without requiring database connection
 */

import 'dotenv/config'; // Load environment variables first
import { emailService } from './src/email/email.service';

async function testEmail() {
    console.log('🧪 Starting Email Service Test...\n');

    // Test 1: Verify email service connection
    console.log('📡 Test 1: Verifying SMTP connection...');
    const isConnected = await emailService.verifyConnection();

    if (isConnected) {
        console.log('✅ SMTP connection verified!\n');
    } else {
        console.log('❌ SMTP connection failed\n');
        return;
    }

    // Test 2: Send test email
    console.log('📧 Test 2: Sending test email...');
    const testResult = await emailService.sendTestEmail('gunsembacanan27@gmail.com');

    if (testResult.success) {
        console.log('✅ Test email sent successfully!');
        console.log(`   Message ID: ${testResult.messageId}\n`);
    } else {
        console.log('❌ Test email failed');
        console.log(`   Error: ${testResult.error}\n`);
        return;
    }

    // Test 3: Send welcome email
    console.log('📧 Test 3: Sending welcome email...');
    const welcomeResult = await emailService.sendWelcomeEmail(
        'gunsembacanan27@gmail.com',
        'Test User',
        'http://localhost:3000/login'
    );

    if (welcomeResult.success) {
        console.log('✅ Welcome email sent successfully!');
        console.log(`   Message ID: ${welcomeResult.messageId}\n`);
    } else {
        console.log('❌ Welcome email failed');
        console.log(`   Error: ${welcomeResult.error}\n`);
    }

    // Test 4: Send task assigned email
    console.log('📧 Test 4: Sending task assignment email...');
    const taskResult = await emailService.sendTaskAssignedEmail(
        'gunsembacanan27@gmail.com',
        {
            userName: 'Test User',
            taskTitle: 'Test Task - Email Integration',
            taskDescription: 'This is a test task to verify email notifications are working correctly.',
            assignedBy: 'Admin',
            taskUrl: 'http://localhost:3000/tasks/test-123',
            departmentName: 'Engineering'
        }
    );

    if (taskResult.success) {
        console.log('✅ Task assignment email sent successfully!');
        console.log(`   Message ID: ${taskResult.messageId}\n`);
    } else {
        console.log('❌ Task assignment email failed');
        console.log(`   Error: ${taskResult.error}\n`);
    }

    // Test 5: Send status change email
    console.log('📧 Test 5: Sending status change email...');
    const statusResult = await emailService.sendTaskStatusChangedEmail(
        'gunsembacanan27@gmail.com',
        {
            userName: 'Test User',
            taskTitle: 'Test Task - Email Integration',
            oldStatus: 'todo',
            newStatus: 'in_progress',
            changedBy: 'Admin',
            taskUrl: 'http://localhost:3000/tasks/test-123'
        }
    );

    if (statusResult.success) {
        console.log('✅ Status change email sent successfully!');
        console.log(`   Message ID: ${statusResult.messageId}\n`);
    } else {
        console.log('❌ Status change email failed');
        console.log(`   Error: ${statusResult.error}\n`);
    }

    console.log('🎉 Email testing complete!');
    console.log('\n📬 Check your inbox at: gunsembacanan27@gmail.com');
    console.log('   You should have received 4 emails:');
    console.log('   1. Test Email');
    console.log('   2. Welcome Email');
    console.log('   3. Task Assignment Email');
    console.log('   4. Task Status Change Email\n');
}

// Run the test
testEmail().catch((error) => {
    console.error('❌ Fatal error during email test:', error);
    process.exit(1);
});
