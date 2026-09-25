import { all, get, run, rowsToJson } from './helpers.js';

export const sourcesRepository = {
  async findById(id) {
    return get('SELECT * FROM job_sources WHERE id = ?', [id]);
  },

  async listActive() {
    return rowsToJson(await all('SELECT * FROM job_sources WHERE is_active = true ORDER BY id'));
  },

  async listAll() {
    return rowsToJson(await all('SELECT * FROM job_sources ORDER BY id'));
  },

  async findByKey(key) {
    return get('SELECT * FROM job_sources WHERE key = ?', [key])
      ?? await get('SELECT * FROM job_sources WHERE LOWER(name) = LOWER(?) OR LOWER(name) LIKE LOWER(?)',
        [key, `%${key}%`]);
  },

  async create(data) {
    const cols = Object.keys(data);
    const { lastInsertRowid } = await run(
      `INSERT INTO job_sources (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) RETURNING id`,
      Object.values(data)
    );
    return get('SELECT * FROM job_sources WHERE id = ?', [lastInsertRowid]);
  },
};