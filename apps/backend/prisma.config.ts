import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Scripts always run with cwd = apps/backend, so the root .env is two levels up.
// A missing file is fine: CI and containers pass real environment variables.
config({ path: '../../.env', quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: env('DATABASE_URL') },
});