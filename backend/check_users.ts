import { prisma } from './src/database/prisma.service';

async function checkUsers() {
    const users = await prisma.user.findMany({
        select: { email: true, name: true, avatar: true }
    });
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
}

checkUsers().catch(err => {
    console.error(err);
    process.exit(1);
});
