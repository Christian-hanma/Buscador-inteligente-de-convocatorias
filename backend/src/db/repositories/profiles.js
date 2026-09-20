import { all, get, run, rowsToJson, rowToJson } from './helpers.js';

const PUBLIC_FIELDS = `id, user_id, nombre_completo, carrera, nivel_estudios, cv_texto,
  experiencia, ubicacion_actual, telefono, email_cv, linkedin, informacion_adicional,
  created_at, updated_at`;

export const profilesRepository = {
  findByUserId(userId) {
    return rowToJson(get(`SELECT ${PUBLIC_FIELDS} FROM profiles WHERE user_id = ?`, [userId]));
  },

  findById(id) {
    return rowToJson(get(`SELECT ${PUBLIC_FIELDS} FROM profiles WHERE id = ?`, [id]));
  },

  upsert(userId, data) {
    const fields = [
      'nombre_completo', 'carrera', 'nivel_estudios', 'cv_texto', 'experiencia',
      'ubicacion_actual', 'telefono', 'email_cv', 'linkedin', 'informacion_adicional',
    ];
    const existing = get('SELECT id FROM profiles WHERE user_id = ?', [userId]);
    if (existing) {
      const present = fields.filter((f) => f in data);
      if (present.length > 0) {
        const sets = present.map((f) => `${f} = ?`).join(', ');
        run(`UPDATE profiles SET ${sets}, updated_at = datetime('now') WHERE user_id = ?`,
          [...present.map((f) => data[f]), userId]);
      }
      return this.findByUserId(userId);
    }
    const columns = ['user_id', ...fields].filter((f) => f === 'user_id' || f in data);
    const placeholders = columns.map(() => '?').join(', ');
    const { lastInsertRowid } = run(
      `INSERT INTO profiles (${columns.join(', ')}) VALUES (${placeholders})`,
      [...columns.map((c) => (c === 'user_id' ? userId : data[c]))]
    );
    return this.findById(lastInsertRowid);
  },

  list() {
    return rowsToJson(all(`SELECT ${PUBLIC_FIELDS} FROM profiles ORDER BY id`));
  },
};