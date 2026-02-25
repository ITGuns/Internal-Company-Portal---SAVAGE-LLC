
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const general = await prisma.conversation.findFirst({
        where: {
            type: 'channel',
            OR: [
                { name: { contains: 'general', mode: 'insensitive' } },
                { name: { contains: 'global', mode: 'insensitive' } }
            ]
        },
        include: {
            messages: {
                take: 10,
                orderBy: { createdAt: 'desc' }
            }
        }
    });
    console.log('GENERAL CHANNEL CONTENT:');
    console.log(JSON.stringify(general, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
