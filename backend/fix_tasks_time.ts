import { prisma } from './src/database/prisma.service';

async function main() {
    console.log('Fixing task elapsed times...');

    // Convert seeded tasks from 480 seconds to 28800 seconds (8 hours)
    const result = await prisma.task.updateMany({
        where: {
            totalElapsed: 480,
            estimatedTime: 480,
            status: 'completed'
        },
        data: {
            totalElapsed: 28800
        }
    });

    console.log(`Updated ${result.count} tasks.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
