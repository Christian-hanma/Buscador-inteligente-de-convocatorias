import { all, get, run, rowsToJson, rowToJson } from './helpers.js';

const LIST_SQL = `
  SELECT o.*, s.name AS source_name, s.type AS source_type, s.status AS source_status
  FROM job_offers o
  LEFT JOIN job_sources s ON s.id = o.source_id
`;

export const offersRepository = {
  findById(id) {
    return rowToJson(get(`${LIST_SQL} WHERE o.id = ?`, [id]));
  },

  list() {
    return rowsToJson(all(`${LIST_SQL} ORDER BY o.created_at DESC, o.id DESC`));
  },

  listBySourceIds(sourceIds, status = 'active') {
    if (!sourceIds.length) return [];
    const placeholders = sourceIds.map(() => '?').join(', ');
    return rowsToJson(all(
      `${LIST_SQL} WHERE o.status = ? AND o.source_id IN (${placeholders}) ORDER BY o.created_at DESC`,
      [status, ...sourceIds]
    ));
  },

  listBySourceId(sourceId) {
    return rowsToJson(all(`${LIST_SQL} WHERE o.source_id = ? ORDER BY o.id`, [sourceId]));
  },

  /** Deduplicación por (source_id, external_id). */
  findDuplicate(sourceId, externalId) {
    return get('SELECT * FROM job_offers WHERE source_id = ? AND external_id = ?', [sourceId, externalId]);
  },

  upsert(data) {
    const existing = data.external_id
      ? this.findDuplicate(data.source_id, data.external_id)
      : undefined;
    if (existing) {
      run(
        `UPDATE job_offers SET titulo = ?, entidad = ?, sueldo = ?, ubicacion = ?, modalidad = ?,
         tipo_contrato = ?, duracion = ?, penalizacion = ?, fuente = ?, source_url = ?,
         fecha_publicacion = ?, fecha_cierre = ?, texto_completo = ?, status = ?,
         es_demo = ?, updated_at = datetime('now') WHERE id = ?`,
        [
          data.titulo, data.entidad, data.sueldo, data.ubicacion, data.modalidad,
          data.tipo_contrato, data.duracion, data.penalizacion, data.fuente, data.source_url,
          data.fecha_publicacion, data.fecha_cierre, data.texto_completo, data.status || 'active',
          data.es_demo ?? existing.es_demo, existing.id,
        ]
      );
      return { offer: this.findById(existing.id), updated: true };
    }
    const cols = [
      'source_id', 'external_id', 'titulo', 'entidad', 'sueldo', 'ubicacion', 'modalidad',
      'tipo_contrato', 'duracion', 'penalizacion', 'fuente', 'source_url',
      'fecha_publicacion', 'fecha_cierre', 'texto_completo', 'status', 'es_demo',
    ];
    const values = cols.map((c) => (data[c] === undefined ? 0 : data[c]));
    const { lastInsertRowid } = run(
      `INSERT INTO job_offers (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      values
    );
    return { offer: this.findById(lastInsertRowid), updated: false };
  },
};