import { all, get, run, rowsToJson } from './helpers.js';

export const sourcesRepository = {
  findById(id) {
    return get('SELECT * FROM job_sources WHERE id = ?', [id]);
  },

  listActive() {
    return rowsToJson(all('SELECT * FROM job_sources WHERE is_active = 1 ORDER BY id'));
  },

  listAll() {
    return rowsToJson(all('SELECT * FROM job_sources ORDER BY id'));
  },

  findByKey(key) {
    return get('SELECT * FROM job_sources WHERE key = ?', [key])
      ?? get('SELECT * FROM job_sources WHERE LOWER(name) = LOWER(?) OR LOWER(name) LIKE LOWER(?)',
        [key, `%${key}%`]);
  },

  create(data) {
    const cols = Object.keys(data);
    const { lastInsertRowid } = run(
      `INSERT INTO job_sources (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      Object.values(data)
    );
    return get('SELECT * FROM job_sources WHERE id = ?', [lastInsertRowid]);
  },
};