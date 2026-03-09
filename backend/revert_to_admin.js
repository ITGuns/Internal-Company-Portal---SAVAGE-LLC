const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv/config');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🚀 Reverting Overlord to Admin technical role...');

    // 1. Update Role names in UserRole table
    const updatedRoles = await prisma.userRole.updateMany({
        where: {
            role: {
                in: ['overlord'],
                mode: 'insensitive'
            }
        },
        data: { role: 'admin' }
    });
    console.log(`✅ Updated ${updatedRoles.count} user roles back to 'admin'.`);

    // 2. Update AvailableRole table
    const updatedAvailableRoles = await prisma.availableRole.updateMany({
        where: {
            name: {
                in: ['Overlord'],
                mode: 'insensitive'
            }
        },
        data: { name: 'Admin' }
    });
    console.log(`✅ Updated ${updatedAvailableRoles.count} available roles back to 'Admin'.`);

    // 3. Keep User names as Overlord for the admin account
    // (This was already done, but we'll ensure admin@savage.com is named Overlord)
    await prisma.user.update({
        where: { email: 'admin@savage.com' },
        data: { name: 'Overlord' }
    });
    console.log(`✅ Ensured admin@savage.com name is 'Overlord'.`);

    console.log('🎉 Technical revert complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
