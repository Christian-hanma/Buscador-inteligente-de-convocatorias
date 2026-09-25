import path from 'node:path';
import { pool } from './connection.js';
import { runMigrations } from './migrate.js';

const TABLES = [
  'generated_cvs',
  'match_results',
  'job_offers',
  'user_job_sources',
  'job_sources',
  'config_filtros',
  'profiles',
  'users',
];

export async function resetDatabase() {
  for (const table of TABLES) {
    await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }
  await runMigrations();
  console.log('[db] base de datos reiniciada');
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  resetDatabase()
    .then(() => pool.end())
    .catch((err) => {
      console.error('[db] fallo al reiniciar:', err.message);
      process.exit(1);
    });
}