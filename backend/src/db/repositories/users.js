import { all, get, run, rowsToJson, rowToJson } from './helpers.js';

export const usersRepository = {
  create({ email, passwordHash }) {
    const { lastInsertRowid } = run(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [email, passwordHash]
    );
    return this.findById(lastInsertRowid);
  },

  findByEmail(email) {
    return rowToJson(get('SELECT * FROM users WHERE email = ? COLLATE NOCASE', [email]));
  },

  findById(id) {
    return rowToJson(get('SELECT * FROM users WHERE id = ?', [id]));
  },

  list() {
    return rowsToJson(all('SELECT * FROM users ORDER BY id'));
  },
};