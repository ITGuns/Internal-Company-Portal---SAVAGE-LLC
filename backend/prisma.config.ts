import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: (process.env['DATABASE_URL'] || '').includes('?')
            ? `${process.env['DATABASE_URL']}&advisory_lock=false&connect_timeout=60`
            : `${process.env['DATABASE_URL']}?advisory_lock=false&connect_timeout=60`,
    },
});
