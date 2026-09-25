import { all, get, run, rowsToJson, rowToJson } from './helpers.js';

export const usersRepository = {
  async create({ email, passwordHash }) {
    const { lastInsertRowid } = await run(
      'INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id',
      [email, passwordHash]
    );
    return this.findById(lastInsertRowid);
  },

  async findByEmail(email) {
    return rowToJson(await get('SELECT * FROM users WHERE email = ?', [email]));
  },

  async findById(id) {
    return rowToJson(await get('SELECT * FROM users WHERE id = ?', [id]));
  },

  async list() {
    return rowsToJson(await all('SELECT * FROM users ORDER BY id'));
  },
};