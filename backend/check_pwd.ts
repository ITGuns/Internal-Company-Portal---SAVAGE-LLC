import { prisma } from './src/database/prisma.service';

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'pdvillorente12@gmail.com' }
    });
    console.log('PASSWORD FOR USER: ', user?.password);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
