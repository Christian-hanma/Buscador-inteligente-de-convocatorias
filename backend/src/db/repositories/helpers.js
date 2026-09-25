import { pool } from '../connection.js';

/** pg no acepta `undefined` como parámetro; lo normaliza a `null`. */
function bind(params = []) {
  return params.map((p) => (p === undefined ? null : p));
}

/** Convierte marcadores `?` (estilo SQLite) a `$1, $2, …` (pg). */
function toParams(sql, params = []) {
  if (!params.length) return sql;
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

/** Ejecuta un SELECT y devuelve todas las filas. */
export async function all(sql, params = []) {
  const { rows } = await pool.query(toParams(sql, params), bind(params));
  return rows;
}

/** Ejecuta un SELECT y devuelve la primera fila (o undefined). */
export async function get(sql, params = []) {
  const { rows } = await pool.query(toParams(sql, params), bind(params));
  return rows[0];
}

/** Ejecuta INSERT/UPDATE/DELETE. Devuelve { changes, lastInsertRowid }. */
export async function run(sql, params = []) {
  const res = await pool.query(toParams(sql, params), bind(params));
  return {
    changes: res.rowCount ?? 0,
    lastInsertRowid: res.rows?.[0]?.id ?? null,
  };
}

export function rowToJson(row) {
  return row ?? null;
}

export function rowsToJson(rows = []) {
  return rows ?? [];
}