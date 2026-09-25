import { matchesRepository } from '../db/repositories/matches.js';

/**
 * Notificaciones del MVP: simuladas (log + flag notificado).
 * Punto de extensión para Web Push API y posteriormente Firebase Cloud Messaging.
 * La interfaz se mantiene estable para no tocar a los callers al migrar.
 */
async function evaluateAndNotify({ user, config, offer, match }) {
  if (!config) {
    return { shouldNotify: false, notified: false, threshold: 70 };
  }
  const threshold = Number(config.umbral_notificacion) || 70;
  const shouldNotify =
    Number(match.porcentaje_compatibilidad) >= threshold && match.notificado === false;

  if (shouldNotify) {
    await matchesRepository.markNotified(match.id);
    console.log(
      `[notificacion:simulada] usuario=${user?.email} oferta=${offer?.id} "${offer?.titulo}" ` +
        `compatibilidad=${match.porcentaje_compatibilidad}% (umbral=${threshold}%)`
    );
    return { shouldNotify: true, notified: true, threshold };
  }
  return { shouldNotify: false, notified: false, threshold };
}

export const notificationService = { evaluateAndNotify };