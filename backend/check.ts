import { prisma } from './src/database/prisma.service';

prisma.user.findMany({ include: { roles: true } })
    .then(users => {
        console.log(JSON.stringify(users.map(u => ({ email: u.email, roles: u.roles.map(r => r.role) })), null, 2));
        process.exit(0);
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
