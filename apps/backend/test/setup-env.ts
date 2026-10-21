import { config } from 'dotenv';

config({ path: '../../.env', quiet: true });
if (!process.env.DATABASE_URL_TEST) throw new Error('DATABASE_URL_TEST is not set');
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;