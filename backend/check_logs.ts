import { prisma, PrismaService } from './src/database/prisma.service';

async function checkDailyLogs() {
    await PrismaService.connect();
    const logs = await prisma.dailyLog.findMany({
        include: {
            author: true
        }
    });
    console.log(`TOTAL LOGS FOUND: ${logs.length}`);
    logs.forEach(log => {
        console.log(`- ID: ${log.id}, Author: ${log.author?.email}, Dept: [${log.department}], Status: [${log.status}], Date: ${log.date.toISOString()}`);
    });
    process.exit(0);
}

checkDailyLogs();
