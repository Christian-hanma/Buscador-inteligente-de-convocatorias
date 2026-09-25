import { get, run, all, rowsToJson, rowToJson } from './helpers.js';

export const cvsRepository = {
  async create({ userId, offerId, baseProfileId, content, version = 1, status = 'generated' }) {
    const { lastInsertRowid } = await run(
      `INSERT INTO generated_cvs (user_id, offer_id, base_profile_id, content, version, status)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      [userId, offerId, baseProfileId, content, version, status]
    );
    return this.findByIdForUser(userId, lastInsertRowid);
  },

  async findByUserAndOffer(userId, offerId) {
    return rowToJson(await get(
      'SELECT * FROM generated_cvs WHERE user_id = ? AND offer_id = ? ORDER BY version DESC LIMIT 1',
      [userId, offerId]
    ));
  },

  async nextVersion(userId, offerId) {
    const row = await get(
      'SELECT COALESCE(MAX(version), 0) AS v FROM generated_cvs WHERE user_id = ? AND offer_id = ?',
      [userId, offerId]
    );
    return row ? Number(row.v) + 1 : 1;
  },

  async listForUser(userId) {
    return rowsToJson(await all(
      `SELECT g.*, o.titulo, o.entidad, s.name AS source_name
       FROM generated_cvs g
       LEFT JOIN job_offers o ON o.id = g.offer_id
       LEFT JOIN job_sources s ON s.id = o.source_id
       WHERE g.user_id = ?
       ORDER BY g.created_at DESC`,
      [userId]
    ));
  },

  async findByIdForUser(userId, id) {
    return rowToJson(await get(
      `SELECT g.*, o.titulo, o.entidad, o.source_url, s.name AS source_name
       FROM generated_cvs g
       LEFT JOIN job_offers o ON o.id = g.offer_id
       LEFT JOIN job_sources s ON s.id = o.source_id
       WHERE g.user_id = ? AND g.id = ?`,
      [userId, id]
    ));
  },
};