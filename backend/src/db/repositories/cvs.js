import { get, run, all, rowsToJson, rowToJson } from './helpers.js';

export const cvsRepository = {
  create({ userId, offerId, baseProfileId, content, version = 1, status = 'generated' }) {
    const { lastInsertRowid } = run(
      `INSERT INTO generated_cvs (user_id, offer_id, base_profile_id, content, version, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, offerId, baseProfileId, content, version, status]
    );
    return this.findByIdForUser(userId, lastInsertRowid);
  },

  findByUserAndOffer(userId, offerId) {
    return rowToJson(get(
      'SELECT * FROM generated_cvs WHERE user_id = ? AND offer_id = ? ORDER BY version DESC LIMIT 1',
      [userId, offerId]
    ));
  },

  nextVersion(userId, offerId) {
    const row = get(
      'SELECT COALESCE(MAX(version), 0) AS v FROM generated_cvs WHERE user_id = ? AND offer_id = ?',
      [userId, offerId]
    );
    return row ? Number(row.v) + 1 : 1;
  },

  listForUser(userId) {
    return rowsToJson(all(
      `SELECT g.*, o.titulo, o.entidad, s.name AS source_name
       FROM generated_cvs g
       LEFT JOIN job_offers o ON o.id = g.offer_id
       LEFT JOIN job_sources s ON s.id = o.source_id
       WHERE g.user_id = ?
       ORDER BY g.created_at DESC`,
      [userId]
    ));
  },

  findByIdForUser(userId, id) {
    return rowToJson(get(
      `SELECT g.*, o.titulo, o.entidad, o.source_url, s.name AS source_name
       FROM generated_cvs g
       LEFT JOIN job_offers o ON o.id = g.offer_id
       LEFT JOIN job_sources s ON s.id = o.source_id
       WHERE g.user_id = ? AND g.id = ?`,
      [userId, id]
    ));
  },
};