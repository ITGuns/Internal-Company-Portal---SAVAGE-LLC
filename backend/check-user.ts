import { prisma } from './src/database/prisma.service';

async function main() {
    try {
        const u = await prisma.user.findUnique({
            where: { email: 'gunsembacanan27@gmail.com' },
            include: { roles: true }
        });
        console.log(JSON.stringify(u, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
