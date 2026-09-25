import { all, get, run, rowsToJson, rowToJson } from './helpers.js';

const LIST_SQL = `
  SELECT o.*, s.name AS source_name, s.type AS source_type, s.status AS source_status
  FROM job_offers o
  LEFT JOIN job_sources s ON s.id = o.source_id
`;

const COLS = [
  'source_id', 'external_id', 'titulo', 'entidad', 'sueldo', 'ubicacion', 'modalidad',
  'tipo_contrato', 'duracion', 'penalizacion', 'fuente', 'source_url',
  'fecha_publicacion', 'fecha_cierre', 'texto_completo', 'status', 'es_demo',
];

function upsertValues(data) {
  return COLS.map((c) => {
    if (c === 'penalizacion' || c === 'es_demo') return data[c] === undefined ? false : data[c];
    if (c === 'status') return data.status || 'active';
    return data[c] === undefined ? null : data[c];
  });
}

export const offersRepository = {
  async findById(id) {
    return rowToJson(await get(`${LIST_SQL} WHERE o.id = ?`, [id]));
  },

  async list() {
    return rowsToJson(await all(`${LIST_SQL} ORDER BY o.created_at DESC, o.id DESC`));
  },

  async listBySourceIds(sourceIds, status = 'active') {
    if (!sourceIds.length) return [];
    const placeholders = sourceIds.map(() => '?').join(', ');
    return rowsToJson(await all(
      `${LIST_SQL} WHERE o.status = ? AND o.source_id IN (${placeholders}) ORDER BY o.created_at DESC`,
      [status, ...sourceIds]
    ));
  },

  async listBySourceId(sourceId) {
    return rowsToJson(await all(`${LIST_SQL} WHERE o.source_id = ? ORDER BY o.id`, [sourceId]));
  },

  /** Deduplicación por (source_id, external_id). */
  async findDuplicate(sourceId, externalId) {
    return get('SELECT * FROM job_offers WHERE source_id = ? AND external_id = ?', [sourceId, externalId]);
  },

  async upsert(data) {
    const updates = COLS.filter((c) => c !== 'source_id' && c !== 'external_id')
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(', ');
    const placeholders = COLS.map(() => '?').join(', ');
    const row = await get(
      `INSERT INTO job_offers (${COLS.join(', ')}) VALUES (${placeholders})
       ON CONFLICT (source_id, external_id) DO UPDATE SET ${updates}, updated_at = now()
       RETURNING id, (xmax = 0) AS inserted`,
      upsertValues(data)
    );
    const offer = await this.findById(row.id);
    return { offer, updated: row.inserted === false };
  },
};