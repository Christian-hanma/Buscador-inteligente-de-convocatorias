/** Parsea un campo JSON de texto (safe). Retorna el valor por defecto si falla. */
export function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
}

export function nowIso() {
  return new Date().toISOString();
}

export function clampInt(value, min, max, fallback = null) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}