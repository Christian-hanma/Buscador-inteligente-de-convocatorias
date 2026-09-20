import { db } from './connection.js';
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

export function resetDatabase() {
  for (const table of TABLES) {
    db.exec(`DROP TABLE IF EXISTS ${table}`);
  }
  runMigrations();
  console.log('[db] base de datos reiniciada');
}