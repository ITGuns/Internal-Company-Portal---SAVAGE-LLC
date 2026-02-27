const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function runSeed() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        console.log('🌱 Starting Manual Seed (Bypassing Prisma)...');
        await client.connect();

        const passwordHash = await bcrypt.hash('Savage2025!', 10);

        // 1. Create Operations Department if it doesn't exist
        const deptResult = await client.query(
            'INSERT INTO "Department" (id, name, "driveId", "updatedAt") VALUES ($1, $2, $3, NOW()) ON CONFLICT (name) DO UPDATE SET "updatedAt" = NOW() RETURNING id',
            ['dept_ops_manual', 'Operations', 'sample-drive-id-operations']
        );
        const deptId = deptResult.rows[0].id;
        console.log('✅ Department "Operations" ready.');

        // 2. Create Admin User
        const userResult = await client.query(
            `INSERT INTO "User" (id, email, name, password, status, "isApproved", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       ON CONFLICT (email) 
       DO UPDATE SET password = $4, status = $5, "isApproved" = $6, "updatedAt" = NOW() 
       RETURNING id`,
            ['admin_manual_id', 'admin@savage.com', 'Savage Admin', passwordHash, 'active', true]
        );
        const userId = userResult.rows[0].id;
        console.log('✅ Admin user "admin@savage.com" ready.');

        // 3. Create UserRole
        await client.query(
            'INSERT INTO "UserRole" (id, "userId", role, "departmentId") VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
            ['role_admin_manual', userId, 'administrator', deptId]
        );
        console.log('✅ Admin role assigned.');

        // 4. Create EmployeeProfile
        await client.query(
            'INSERT INTO "EmployeeProfile" (id, "userId", "jobTitle", "baseSalary", "updatedAt") VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT ("userId") DO UPDATE SET "jobTitle" = $3',
            ['profile_admin_manual', userId, 'Administrator', 100000]
        );
        console.log('✅ Admin profile created.');

        console.log('\n🚀 MANUAL SEED COMPLETE!');
        console.log('You can now log in at mydeskii.com/login with:');
        console.log('Email: admin@savage.com');
        console.log('Pass:  Savage2025!');

    } catch (err) {
        console.error('❌ Manual Seed Failed!');
        console.error(err);
    } finally {
        await client.end();
    }
}

runSeed();
