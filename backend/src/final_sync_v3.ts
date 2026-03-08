
import { prisma } from './database/prisma.service';

async function finalSyncV3() {
    console.log('Final Database Sync V3 (Fixed): Consolidating tasks...');

    const rangeStart = new Date('2026-03-01T00:00:00Z');
    const rangeEnd = new Date('2026-03-08T00:00:00Z');

    const users = await prisma.user.findMany({
        where: { status: { in: ['active', 'verified'] } }
    });

    const dept = await prisma.department.findFirst();
    const deptId = dept ? dept.id : undefined;

    // WIPE MARCH 2-7
    await prisma.timeEntry.deleteMany({ where: { start: { gte: rangeStart, lt: rangeEnd } } });
    await prisma.task.deleteMany({ where: { startDate: { gte: rangeStart, lt: rangeEnd } } });
    await prisma.dailyLog.deleteMany({ where: { date: { gte: rangeStart, lt: rangeEnd } } });

    console.log('Cleaned March 2-6.');

    const days = [2, 3, 4, 5, 6];

    // 1. SEED TASKS (GLOBAL - Only 2 per day for the whole company, unassigned)
    for (const d of days) {
        const dateStr = `2026-03-${d.toString().padStart(2, '0')}`;

        // Task 1: 4 hours
        await prisma.task.create({
            data: {
                title: 'Morning Operations',
                description: 'Standard morning operational oversight for the entire team.',
                status: 'completed',
                priority: 'High',
                progress: 100,
                totalElapsed: 14400,
                startDate: new Date(`${dateStr}T01:00:00Z`), // 9 AM PH
                dueDate: new Date(`${dateStr}T05:00:00Z`),   // 1 PM PH
                departmentId: deptId,
            }
        });

        // Task 2: 4 hours
        await prisma.task.create({
            data: {
                title: 'Afternoon Support',
                description: 'Quality assurance and client support session.',
                status: 'completed',
                priority: 'High',
                progress: 100,
                totalElapsed: 14400,
                startDate: new Date(`${dateStr}T05:00:00Z`), // 1 PM PH
                dueDate: new Date(`${dateStr}T09:00:00Z`),   // 5 PM PH
                departmentId: deptId,
            }
        });
    }

    // 2. SEED INDIVIDUAL DATA (Attendance/Logs for Payroll)
    for (const emp of users) {
        console.log(`Seeding attendance for ${emp.name}...`);

        if (emp.email === 'pdvillorente12@gmail.com') {
            await prisma.employeeProfile.upsert({
                where: { userId: emp.id },
                update: { baseSalary: 28000 },
                create: { userId: emp.id, baseSalary: 28000 }
            });
        }
        if (emp.email === 'daryldave018@gmail.com') {
            await prisma.employeeProfile.upsert({
                where: { userId: emp.id },
                update: { baseSalary: 22500 },
                create: { userId: emp.id, baseSalary: 22500 }
            });
        }

        for (const d of days) {
            const dateStr = `2026-03-${d.toString().padStart(2, '0')}`;

            await prisma.timeEntry.create({
                data: {
                    userId: emp.id,
                    start: new Date(`${dateStr}T01:00:00Z`), // 9 AM PH
                    end: new Date(`${dateStr}T09:00:00Z`),   // 5 PM PH
                    duration: 480,
                    notes: 'Standard Working Day'
                }
            });

            await prisma.dailyLog.create({
                data: {
                    content: 'Performed standard operations and support duties totaling 8 hours.',
                    date: new Date(dateStr),
                    department: dept ? dept.name : 'Operations',
                    status: 'completed',
                    hoursLogged: 8,
                    authorId: emp.id,
                    logType: 'daily'
                }
            });
        }
    }

    console.log('Sync V3 complete. Calendar is now clean.');
    await prisma.$disconnect();
}

finalSyncV3();
