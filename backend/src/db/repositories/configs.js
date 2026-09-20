import { get, run, rowToJson } from './helpers.js';

export const configsRepository = {
  findByUserId(userId) {
    return rowToJson(get('SELECT * FROM config_filtros WHERE user_id = ?', [userId]));
  },

  createDefault(userId) {
    const { lastInsertRowid } = run(
      `INSERT INTO config_filtros (user_id) VALUES (?)`,
      [userId]
    );
    return rowToJson(get('SELECT * FROM config_filtros WHERE id = ?', [lastInsertRowid]));
  },

  upsert(userId, data) {
    const existing = get('SELECT id FROM config_filtros WHERE user_id = ?', [userId]);
    if (!existing) {
      this.createDefault(userId);
    }
    const allowed = [
      'sueldo_minimo', 'sueldo_maximo', 'radio_zona', 'ubicaciones_preferidas',
      'duracion_min_meses', 'duracion_max_meses', 'excluir_penalizaciones',
      'modalidad', 'tipo_contrato', 'umbral_notificacion',
    ];
    const present = allowed.filter((f) => f in data);
    if (present.length > 0) {
      const sets = present.map((f) => `${f} = ?`).join(', ');
      const values = present.map((f) => {
        const value = data[f];
        return Array.isArray(value) || (value !== null && typeof value === 'object')
          ? JSON.stringify(value)
          : value;
      });
      run(
        `UPDATE config_filtros SET ${sets}, updated_at = datetime('now') WHERE user_id = ?`,
        [...values, userId]
      );
    }
    return this.findByUserId(userId);
  },
};