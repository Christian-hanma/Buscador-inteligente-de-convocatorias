import { all, get, run, rowsToJson } from './helpers.js';

export const userSourcesRepository = {
  setEnabled(userId, sourceIds = []) {
    run('DELETE FROM user_job_sources WHERE user_id = ?', [userId]);
    for (const sourceId of sourceIds) {
      run(
        'INSERT OR IGNORE INTO user_job_sources (user_id, source_id, enabled) VALUES (?, ?, 1)',
        [userId, sourceId]
      );
    }
  },

  enabledSourceIds(userId) {
    const rows = all('SELECT source_id FROM user_job_sources WHERE user_id = ? AND enabled = 1', [userId]);
    return rows.map((r) => r.source_id);
  },

  forUser(userId) {
    return rowsToJson(all(
      `SELECT ujs.*, js.name, js.type, js.status, js.ingestion_method, js.is_default
       FROM user_job_sources ujs
       JOIN job_sources js ON js.id = ujs.source_id
       WHERE ujs.user_id = ?
       ORDER BY js.id`,
      [userId]
    ));
  },

  listWithUserState(userId) {
    return rowsToJson(all(
      `SELECT js.*, COALESCE(ujs.enabled, 0) AS selected
       FROM job_sources js
       LEFT JOIN user_job_sources ujs
         ON ujs.source_id = js.id AND ujs.user_id = ?
       WHERE js.is_active = 1
       ORDER BY js.id`,
      [userId]
    ));
  },

  hasSelection(userId) {
    return get('SELECT 1 FROM user_job_sources WHERE user_id = ? LIMIT 1', [userId]) !== undefined;
  },
};