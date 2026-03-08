import { prisma, PrismaService } from './src/database/prisma.service';

async function main() {
    console.log('🧹 Starting cleanup process...');

    // Delete dependencies first
    console.log('Deleting Announcement Data...');
    await prisma.announcementLike.deleteMany({});
    await prisma.announcementComment.deleteMany({});
    await prisma.announcementRSVP.deleteMany({});
    await prisma.announcement.deleteMany({});

    console.log('Deleting Daily Log Data...');
    await prisma.dailyLogLike.deleteMany({});
    await prisma.dailyLog.deleteMany({});

    console.log('Deleting Task Data...');
    await prisma.task.deleteMany({});

    console.log('Deleting Payroll Data...');
    await prisma.timeEntry.deleteMany({});
    await prisma.payrollEvent.deleteMany({});
    await prisma.payrollItem.deleteMany({});
    await prisma.payslip.deleteMany({});
    await prisma.payrollPeriod.deleteMany({});

    console.log('Deleting Chat Data...');
    await prisma.message.deleteMany({});
    await prisma.participant.deleteMany({});
    await prisma.conversation.deleteMany({});

    console.log('✅ Cleanup completed successfully! Database is ready for fresh deployment.');
}

main()
    .catch((e) => {
        console.error('❌ Error during cleanup:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
