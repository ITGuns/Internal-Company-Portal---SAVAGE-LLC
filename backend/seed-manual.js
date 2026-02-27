const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function runSeed() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        console.log('🌱 Starting Full Manual Seed (Clean State)...');
        await client.connect();

        // 0. Purge existing data
        console.log('🧹 Purging existing data...');
        await client.query('TRUNCATE TABLE "UserRole", "EmployeeProfile", "Message", "Participant", "Conversation", "DailyLog", "Task", "User", "Department" CASCADE');

        const passwordHash = await bcrypt.hash('Savage2025!', 10);

        // 1. Create Departments
        console.log('🏢 Creating Departments...');

        const depts = [
            { id: 'dept_eng', name: 'Engineering', driveId: 'sample-drive-id-engineering' },
            { id: 'dept_mark', name: 'Marketing', driveId: 'sample-drive-id-marketing' },
            { id: 'dept_ops', name: 'Operations', driveId: 'sample-drive-id-operations' }
        ];

        const deptMap = {};
        for (const d of depts) {
            const res = await client.query(
                'INSERT INTO "Department" (id, name, "driveId", "updatedAt") VALUES ($1, $2, $3, NOW()) RETURNING id',
                [d.id, d.name, d.driveId]
            );
            deptMap[d.name] = res.rows[0].id;
        }

        // 2. Helper for User Creation
        const seedUser = async (email, name, roleName, deptName, status = 'active', isApproved = false) => {
            const userId = `user_${email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_')}`;
            const deptId = deptMap[deptName];

            // Insert User
            await client.query(
                `INSERT INTO "User" (id, email, name, password, status, "isApproved", "avatar", "updatedAt") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                [userId, email, name, passwordHash, status, isApproved, `https://i.pravatar.cc/150?u=${email}`]
            );

            // Insert Role
            const roleId = `role_${userId}_${deptId}`;
            await client.query(
                'INSERT INTO "UserRole" (id, "userId", role, "departmentId") VALUES ($1, $2, $3, $4)',
                [roleId, userId, roleName.toLowerCase().replace(/ /g, '_'), deptId]
            );

            // Insert Profile
            const profileId = `profile_${userId}`;
            await client.query(
                'INSERT INTO "EmployeeProfile" (id, "userId", "jobTitle", "baseSalary", "updatedAt") VALUES ($1, $2, $3, $4, NOW())',
                [profileId, userId, roleName, 50000 + Math.random() * 50000]
            );

            console.log(`✅ ${name} (${email}) ready.`);
        };

        // 3. Seed Everyone
        console.log('👤 Seeding Users...');

        // Admin
        await seedUser('admin@savage.com', 'Savage Admin', 'Admin', 'Operations', 'active', true);

        // Real Employees
        await seedUser('genroujoshcatacutan25@gmail.com', 'Genrou Josh Catacutan', 'Operations Manager', 'Operations', 'active', true);
        await seedUser('daryldave018@gmail.com', 'Daryl Dave Caña', 'Operations Assistant', 'Operations', 'pending', false);
        await seedUser('petersingalivo.prof@gmail.com', 'Peter John Singalivo', 'Head of 3D Modeling', 'Engineering', 'pending', false);
        await seedUser('pdvillorente12@gmail.com', 'Pol Danyael H. Villorente', 'Web Developer', 'Engineering', 'pending', false);
        await seedUser('caetanya1@gmail.com', 'Caetanya Arcipe', 'Project Manager', 'Marketing', 'pending', false);
        await seedUser('gunsembacanan27@gmail.com', 'Guns\'n Full Embacanan', 'Web Developer', 'Engineering', 'pending', false);

        console.log('\n🚀 FULL SEED COMPLETE!');
        console.log('All accounts available with password: Savage2025!');

    } catch (err) {
        console.error('❌ Full Seed Failed!');
        console.error(err);
    } finally {
        await client.end();
    }
}

runSeed();
