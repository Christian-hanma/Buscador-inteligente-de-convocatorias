import { createApp } from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';

async function start() {
  await runMigrations();
  createApp().listen(env.PORT, () => {
    console.log(`[server] API escuchando en http://localhost:${env.PORT}`);
    console.log(`[server] AI activa: ${env.OPENAI_USE_MOCK || !env.OPENAI_API_KEY ? 'MOCK (sin clave)' : `openai (${env.OPENAI_MODEL})`}`);
  });
}

start().catch((err) => {
  console.error('[server] fallo al arrancar:', err.message);
  process.exit(1);
});