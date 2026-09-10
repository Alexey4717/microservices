import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

config({ override: true });

export default defineConfig({
  schema: 'apps/users/prisma/schema.prisma',
  migrations: {
    path: 'apps/users/prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
