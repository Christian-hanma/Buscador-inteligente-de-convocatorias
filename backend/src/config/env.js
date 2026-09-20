import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DATABASE_PATH:
    process.env.DATABASE_PATH ||
    path.resolve(__dirname, '../../data/app.db'),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  OPENAI_USE_MOCK: process.env.OPENAI_USE_MOCK === 'true',
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'dev-webhook-secret',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
};