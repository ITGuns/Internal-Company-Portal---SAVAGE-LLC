import { defineConfig } from 'prisma/config';
import 'dotenv/config';

const datasourceUrl = (
    process.env.DIRECT_DATABASE_URL ||
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL ||
    ''
).trim();

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: datasourceUrl,
    },
});
