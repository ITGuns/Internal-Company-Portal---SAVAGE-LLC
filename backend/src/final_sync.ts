
import { prisma } from './database/prisma.service';

async function finalCleanupAndSeed() {
    console.log('Final Database Sync: Wiping & Re-seeding ALL March 2-6 records (Everyone)...');

    // 1. Wipe everything for the date range
    const rangeStart = new Date('2026-03-01T00:00:00Z');
    const rangeEnd = new Date('2026-03-08T00:00:00Z');

    const users = await prisma.user.findMany({
        where: { status: { in: ['active', 'verified'] } }
    });

    await prisma.timeEntry.deleteMany({
        where: { start: { gte: rangeStart, lt: rangeEnd } }
    });
    await prisma.task.deleteMany({
        where: { startDate: { gte: rangeStart, lt: rangeEnd } }
    });
    await prisma.dailyLog.deleteMany({
        where: { date: { gte: rangeStart, lt: rangeEnd } }
    });

    console.log('Database wiped for 03/01 to 03/07.');

    // 2. Precision Seed: Exactly ONE 8h record per weekday (Mar 2-6)
    const days = [2, 3, 4, 5, 6];
    for (const emp of users) {
        if (emp.email === 'pdvillorente12@gmail.com') {
            // Force Pol's salary to 28,000 as requested
            await prisma.employeeProfile.upsert({
                where: { userId: emp.id },
                update: { baseSalary: 28000 },
                create: { userId: emp.id, baseSalary: 28000 }
            });
            console.log(`Verified Salary for Pol: 28,000`);
        }

        console.log(`Seeding ${emp.name}...`);
        for (const d of days) {
            const dateStr = `2026-03-${d.toString().padStart(2, '0')}`;
            const start = new Date(`${dateStr}T09:00:00Z`); // 9 AM UTC
            const end = new Date(`${dateStr}T17:00:00Z`);   // 5 PM UTC

            // One task
            await prisma.task.create({
                data: {
                    title: 'Daily Operations',
                    status: 'completed',
                    priority: 'High',
                    progress: 100,
                    totalElapsed: 480,
                    assigneeId: emp.id,
                    startDate: start,
                    dueDate: end,
                }
            });

            // One time entry
            await prisma.timeEntry.create({
                data: {
                    userId: emp.id,
                    start: start,
                    end: end,
                    duration: 480,
                    notes: 'Standard shift'
                }
            });

            // One daily log
            await prisma.dailyLog.create({
                data: {
                    content: 'Shift completed.',
                    date: new Date(dateStr),
                    department: 'Operations',
                    status: 'completed',
                    hoursLogged: 8,
                    authorId: emp.id,
                    logType: 'daily'
                }
            });
        }
    }

    console.log('Precision seeding complete for all employees.');
    await prisma.$disconnect();
}

finalCleanupAndSeed();
