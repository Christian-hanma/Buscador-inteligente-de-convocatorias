import { all, get, run, rowsToJson } from './helpers.js';

export const userSourcesRepository = {
  async setEnabled(userId, sourceIds = []) {
    await run('DELETE FROM user_job_sources WHERE user_id = ?', [userId]);
    for (const sourceId of sourceIds) {
      await run(
        `INSERT INTO user_job_sources (user_id, source_id, enabled) VALUES (?, ?, true)
         ON CONFLICT (user_id, source_id) DO NOTHING`,
        [userId, sourceId]
      );
    }
  },

  async enabledSourceIds(userId) {
    const rows = await all(
      'SELECT source_id FROM user_job_sources WHERE user_id = ? AND enabled = true',
      [userId]
    );
    return rows.map((r) => r.source_id);
  },

  async forUser(userId) {
    return rowsToJson(await all(
      `SELECT ujs.*, js.name, js.type, js.status, js.ingestion_method, js.is_default
       FROM user_job_sources ujs
       JOIN job_sources js ON js.id = ujs.source_id
       WHERE ujs.user_id = ?
       ORDER BY js.id`,
      [userId]
    ));
  },

  async listWithUserState(userId) {
    return rowsToJson(await all(
      `SELECT js.*, COALESCE(ujs.enabled, false) AS selected
       FROM job_sources js
       LEFT JOIN user_job_sources ujs
         ON ujs.source_id = js.id AND ujs.user_id = ?
       WHERE js.is_active = true
       ORDER BY js.id`,
      [userId]
    ));
  },

  async hasSelection(userId) {
    return (await get('SELECT 1 FROM user_job_sources WHERE user_id = ? LIMIT 1', [userId])) !== undefined;
  },
};