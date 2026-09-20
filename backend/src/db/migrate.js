import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function runMigrations() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(sql);
  console.log('[db] migrations aplicadas');
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  runMigrations();
}