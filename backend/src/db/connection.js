import pg from 'pg';
import { env } from '../config/env.js';

if (!env.DATABASE_URL) {
  throw new Error(
    'Falta DATABASE_URL en backend/.env. Copia la cadena "Session pooler" ' +
      '(puerto 5432) desde Supabase → Project Settings → Database → Connection string.'
  );
}

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Supabase (Supavisor) ignora el parámetro `options` de la URL, así que
// fijamos search_path en CADA conexión nueva. Sin esto los INSERT/DROP
// con nombre corto caen en `public` y las tablas viven en `convocatorias`.
const schemaOk = /^[A-Za-z_][A-Za-z0-9_]*$/.test(env.DATABASE_SCHEMA);
if (!schemaOk) {
  throw new Error(`DATABASE_SCHEMA inválido: ${env.DATABASE_SCHEMA}`);
}
pool.on('connect', (client) => {
  client.query(`SET search_path TO ${env.DATABASE_SCHEMA}, public`).catch((err) => {
    console.error('[db] no se pudo fijar search_path:', err.message);
  });
});

pool.on('error', (err) => console.error('[db] error de pool inesperado:', err.message));

export { pg };