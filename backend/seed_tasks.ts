import { prisma } from './src/database/prisma.service';

const DATES = [
    new Date('2026-03-02T09:00:00Z'), // Monday
    new Date('2026-03-03T09:00:00Z'), // Tuesday
    new Date('2026-03-04T09:00:00Z'), // Wednesday
    new Date('2026-03-05T09:00:00Z'), // Thursday
    new Date('2026-03-06T09:00:00Z'), // Friday
];

async function main() {
    console.log('Fetching users...');

    // Get all users who aren't the generic admin
    const users = await prisma.user.findMany({
        where: {
            NOT: {
                email: 'admin@savage.com'
            }
        },
        include: {
            roles: true
        }
    });

    console.log(`Found ${users.length} employees to add tasks/time for.`);

    let taskCount = 0;
    let timeCount = 0;

    for (const user of users) {
        if (!user.isApproved && user.status !== 'active') {
            // Assuming we still want to add it for them since they was requested for "all employees except admin"
            // but typically we'd only do this for deployed employees. We'll do it for all found users.
        }

        const deptId = user.roles && user.roles.length > 0 ? user.roles[0].departmentId : null;
        const roleName = user.roles && user.roles.length > 0 ? user.roles[0].role : null;

        for (const date of DATES) {
            // Create an 8 hour task
            const endDate = new Date(date);
            endDate.setHours(endDate.getHours() + 8); // 8 hours later (5PM)

            // 1. Create completed Task
            await prisma.task.create({
                data: {
                    title: 'Daily Operations & Procedures',
                    description: 'Standard daily workflow tasks completed.',
                    status: 'completed',
                    priority: 'High',
                    startDate: date,
                    dueDate: endDate,
                    assigneeId: user.id,
                    departmentId: deptId,
                    role: roleName,
                    progress: 100,
                    timerStatus: 'stopped',
                    totalElapsed: 480, // 8 hours in minutes
                    estimatedTime: 480
                }
            });
            taskCount++;

            // 2. Create TimeEntry for 8 hours
            await prisma.timeEntry.create({
                data: {
                    userId: user.id,
                    start: date,
                    end: endDate,
                    duration: 480,
                    notes: 'Standard 8hr shift'
                }
            });
            timeCount++;
        }
    }

    console.log(`Successfully added ${taskCount} tasks and ${timeCount} time entries.`);
}

main()
    .catch(e => {
        console.error('Error seeding tasks:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
