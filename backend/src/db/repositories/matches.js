import { get, run, all, rowToJson, rowsToJson } from './helpers.js';

export const matchesRepository = {
  findByUserAndOffer(userId, offerId) {
    return get('SELECT * FROM match_results WHERE user_id = ? AND offer_id = ?', [userId, offerId]);
  },

  upsert(userId, offerId, data) {
    const existing = this.findByUserAndOffer(userId, offerId);
    if (existing) {
      run(
        `UPDATE match_results SET porcentaje_compatibilidad = ?, via_ia = ?, filtro_resultado = ?,
         justificacion_ia = ?, brechas = ?, fortalezas = ?, criterios_evaluados = ?,
         notificado = ?, updated_at = datetime('now')
         WHERE user_id = ? AND offer_id = ?`,
        [
          data.porcentaje_compatibilidad,
          data.via_ia ? 1 : 0,
          data.filtro_resultado || null,
          data.justificacion_ia || data.justificacion || null,
          data.brechasJson || JSON.stringify(data.brechas || []),
          data.fortalezasJson || JSON.stringify(data.fortalezas || []),
          data.criteriosJson || JSON.stringify(data.criterios || {}),
          data.notificado ? 1 : 0,
          userId,
          offerId,
        ]
      );
    } else {
      run(
        `INSERT INTO match_results
         (user_id, offer_id, porcentaje_compatibilidad, via_ia, filtro_resultado,
          justificacion_ia, brechas, fortalezas, criterios_evaluados, notificado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          offerId,
          data.porcentaje_compatibilidad,
          data.via_ia ? 1 : 0,
          data.filtro_resultado || null,
          data.justificacion_ia || data.justificacion || null,
          data.brechasJson || JSON.stringify(data.brechas || []),
          data.fortalezasJson || JSON.stringify(data.fortalezas || []),
          data.criteriosJson || JSON.stringify(data.criterios || {}),
          data.notificado ? 1 : 0,
        ]
      );
    }
    return this.findByUserAndOffer(userId, offerId);
  },

  markNotified(id) {
    run('UPDATE match_results SET notificado = 1, updated_at = datetime(\'now\') WHERE id = ?', [id]);
  },

  listForUser(userId) {
    return rowsToJson(all(
      `SELECT m.*, o.titulo, o.entidad, o.sueldo, o.ubicacion, o.modalidad, o.tipo_contrato,
              o.duracion, o.penalizacion, o.source_url, o.texto_completo, o.source_id,
              s.name AS source_name, s.type AS source_type, s.status AS source_status,
              p.nombre_completo, p.ubicacion_actual
       FROM match_results m
       JOIN job_offers o ON o.id = m.offer_id
       LEFT JOIN job_sources s ON s.id = o.source_id
       LEFT JOIN profiles p ON p.user_id = m.user_id
       WHERE m.user_id = ?
       ORDER BY m.porcentaje_compatibilidad DESC, m.updated_at DESC`,
      [userId]
    ));
  },

  findByIdForUser(userId, id) {
    return rowToJson(get(
      `SELECT m.*, o.titulo, o.entidad, o.sueldo, o.ubicacion, o.modalidad, o.tipo_contrato,
              o.duracion, o.penalizacion, o.source_url, o.texto_completo, o.source_id,
              s.name AS source_name, s.type AS source_type, s.status AS source_status
       FROM match_results m
       JOIN job_offers o ON o.id = m.offer_id
       LEFT JOIN job_sources s ON s.id = o.source_id
       WHERE m.user_id = ? AND m.id = ?`,
      [userId, id]
    ));
  },
};