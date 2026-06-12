const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCompletedTasks() {
    console.log('🔍 Finding completed tasks with 0s time spent...');

    const tasks = await prisma.task.findMany({
        where: {
            status: 'completed',
            OR: [
                { totalElapsed: 0 },
                { totalElapsed: null }
            ]
        }
    });

    console.log(`Found ${tasks.length} tasks to fix.`);

    for (const task of tasks) {
        const est = task.estimatedTime || 0;
        const newElapsed = est * 60; // fallback to estimated time in seconds

        if (newElapsed > 0) {
            console.log(`Fixing task: ${task.title} (Est: ${est}m) -> Setting totalElapsed to ${newElapsed}s`);
            await prisma.task.update({
                where: { id: task.id },
                data: {
                    totalElapsed: newElapsed,
                    progress: 100 // ensure progress is also 100
                }
            });
        } else {
            console.log(`Task: ${task.title} has no estimated time. Setting progress to 100 but totalElapsed remains 0.`);
            await prisma.task.update({
                where: { id: task.id },
                data: { progress: 100 }
            });
        }
    }

    console.log('✅ Fix complete.');
    await prisma.$disconnect();
}

fixCompletedTasks().catch(err => {
    console.error(err);
    process.exit(1);
});
