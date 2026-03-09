import { prisma } from './src/database/prisma.service';

async function main() {
    try {
        const logs = await prisma.dailyLog.groupBy({
            by: ['department'],
            _count: { id: true }
        });
        console.log("LOGS PER DEPT:");
        console.log(JSON.stringify(logs, null, 2));

        const recent = await prisma.dailyLog.findMany({
            take: 5,
            select: { department: true, author: { select: { name: true } } }
        });
        console.log("Recent logs:", JSON.stringify(recent, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
