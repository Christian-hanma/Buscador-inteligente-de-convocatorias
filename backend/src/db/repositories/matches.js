import { get, run, all, rowToJson, rowsToJson } from './helpers.js';

export const matchesRepository = {
  async findByUserAndOffer(userId, offerId) {
    return get('SELECT * FROM match_results WHERE user_id = ? AND offer_id = ?', [userId, offerId]);
  },

  async upsert(userId, offerId, data) {
    const brechas = Array.isArray(data.brechas) ? data.brechas : data.brechasJson || [];
    const fortalezas = Array.isArray(data.fortalezas) ? data.fortalezas : data.fortalezasJson || [];
    const criterios = data.criterios && typeof data.criterios === 'object' && !Array.isArray(data.criterios)
      ? data.criterios
      : data.criteriosJson || {};
    await run(
      `INSERT INTO match_results
         (user_id, offer_id, porcentaje_compatibilidad, via_ia, filtro_resultado,
          justificacion_ia, brechas, fortalezas, criterios_evaluados, notificado)
       VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?::jsonb, ?)
       ON CONFLICT (user_id, offer_id) DO UPDATE SET
         porcentaje_compatibilidad = EXCLUDED.porcentaje_compatibilidad,
         via_ia = EXCLUDED.via_ia,
         filtro_resultado = EXCLUDED.filtro_resultado,
         justificacion_ia = EXCLUDED.justificacion_ia,
         brechas = EXCLUDED.brechas,
         fortalezas = EXCLUDED.fortalezas,
         criterios_evaluados = EXCLUDED.criterios_evaluados,
         notificado = EXCLUDED.notificado,
         updated_at = now()`,
      [
        userId,
        offerId,
        data.porcentaje_compatibilidad,
        data.via_ia === true,
        data.filtro_resultado || null,
        data.justificacion_ia || data.justificacion || null,
        JSON.stringify(brechas),
        JSON.stringify(fortalezas),
        JSON.stringify(criterios),
        data.notificado === true,
      ]
    );
    return this.findByUserAndOffer(userId, offerId);
  },

  async markNotified(id) {
    await run("UPDATE match_results SET notificado = true, updated_at = now() WHERE id = ?", [id]);
  },

  async listForUser(userId) {
    return rowsToJson(await all(
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

  async findByIdForUser(userId, id) {
    return rowToJson(await get(
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