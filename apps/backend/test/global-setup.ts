import { execSync } from 'node:child_process';
import { config } from 'dotenv';

export default function globalSetup() {
  config({ path: '../../.env', quiet: true });
  execSync('pnpm exec prisma migrate reset --force', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST },
  });
}