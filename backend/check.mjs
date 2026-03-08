import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.user.findMany({ include: { roles: true } })
  .then(users => {
    console.log(JSON.stringify(users.map(u => ({ email: u.email, roles: u.roles.map(r => r.role) })), null, 2));
    p.$disconnect();
  })
  .catch(e => {
    console.error(e);
    p.$disconnect();
  });
