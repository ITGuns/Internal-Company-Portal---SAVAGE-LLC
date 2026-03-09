import { prisma } from './src/database/prisma.service';

async function main() {
    try {
        const logs = await prisma.dailyLog.findMany({
            include: { author: true }
        });
        console.log('Total DB logs:', logs.length);

        // Also let's simulate the controller logic:
        const department = undefined;
        const status = undefined;
        const logType = undefined;

        const items = await prisma.dailyLog.findMany({
            where: {},
            include: {
                author: {
                    select: { id: true, name: true, avatar: true, email: true }
                },
                likes: {
                    include: {
                        user: {
                            select: { id: true, name: true, avatar: true }
                        }
                    }
                }
            },
            orderBy: { date: 'desc' }
        });
        console.log('Controller findMany length:', items.length);

        console.log('First controller item:', JSON.stringify(items[0], null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
