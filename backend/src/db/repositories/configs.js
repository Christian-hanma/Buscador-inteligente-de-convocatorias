import { get, run, rowToJson } from './helpers.js';

export const configsRepository = {
  async findByUserId(userId) {
    return rowToJson(await get('SELECT * FROM config_filtros WHERE user_id = ?', [userId]));
  },

  async createDefault(userId) {
    const { lastInsertRowid } = await run(
      `INSERT INTO config_filtros (user_id) VALUES (?) RETURNING id`,
      [userId]
    );
    return rowToJson(await get('SELECT * FROM config_filtros WHERE id = ?', [lastInsertRowid]));
  },

  async upsert(userId, data) {
    const existing = await get('SELECT id FROM config_filtros WHERE user_id = ?', [userId]);
    if (!existing) {
      await this.createDefault(userId);
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
      await run(
        `UPDATE config_filtros SET ${sets}, updated_at = now() WHERE user_id = ?`,
        [...values, userId]
      );
    }
    return this.findByUserId(userId);
  },
};