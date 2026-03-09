const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv/config');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const users = await prisma.user.findMany({
        include: { roles: true }
    });
    console.log('--- USERS AND ROLES ---');
    users.forEach(u => {
        console.log(`User: ${u.email}, Name: ${u.name}, Roles: ${u.roles.map(r => r.role).join(', ')}`);
    });
    console.log('-----------------------');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
