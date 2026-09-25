import { all, get, run, rowsToJson, rowToJson } from './helpers.js';

const PUBLIC_FIELDS = `id, user_id, nombre_completo, carrera, nivel_estudios, cv_texto,
  experiencia, ubicacion_actual, telefono, email_cv, linkedin, informacion_adicional,
  created_at, updated_at`;

export const profilesRepository = {
  async findByUserId(userId) {
    return rowToJson(await get(`SELECT ${PUBLIC_FIELDS} FROM profiles WHERE user_id = ?`, [userId]));
  },

  async findById(id) {
    return rowToJson(await get(`SELECT ${PUBLIC_FIELDS} FROM profiles WHERE id = ?`, [id]));
  },

  async upsert(userId, data) {
    const fields = [
      'nombre_completo', 'carrera', 'nivel_estudios', 'cv_texto', 'experiencia',
      'ubicacion_actual', 'telefono', 'email_cv', 'linkedin', 'informacion_adicional',
    ];
    const existing = await get('SELECT id FROM profiles WHERE user_id = ?', [userId]);
    if (existing) {
      const present = fields.filter((f) => f in data);
      if (present.length > 0) {
        const sets = present.map((f) => `${f} = ?`).join(', ');
        await run(`UPDATE profiles SET ${sets}, updated_at = now() WHERE user_id = ?`,
          [...present.map((f) => data[f]), userId]);
      }
      return this.findByUserId(userId);
    }
    const columns = ['user_id', ...fields].filter((f) => f === 'user_id' || f in data);
    const placeholders = columns.map(() => '?').join(', ');
    const { lastInsertRowid } = await run(
      `INSERT INTO profiles (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`,
      [...columns.map((c) => (c === 'user_id' ? userId : data[c]))]
    );
    return this.findById(lastInsertRowid);
  },

  async list() {
    return rowsToJson(await all(`SELECT ${PUBLIC_FIELDS} FROM profiles ORDER BY id`));
  },
};