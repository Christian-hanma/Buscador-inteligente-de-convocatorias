import { db } from '../connection.js';

function bind(params = []) {
  return params.map((p) => {
    if (p === undefined) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    return p;
  });
}

export function all(sql, params = []) {
  return db.prepare(sql).all(...bind(params));
}

export function get(sql, params = []) {
  return db.prepare(sql).get(...bind(params));
}

export function run(sql, params = []) {
  const result = db.prepare(sql).run(...bind(params));
  return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) };
}

/** Convierte filas de SQLite a objetos planos (JSON limpio para la API). */
export function rowToJson(row) {
  if (row === undefined || row === null) return row;
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = value;
  }
  return out;
}

export function rowsToJson(rows = []) {
  return rows.map(rowToJson);
}