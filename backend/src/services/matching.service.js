import { evaluateHardFilters } from './filter.service.js';
import { evaluateCompatibility } from './openai.service.js';
import { computeFinalScore, getScoreWeights } from '../config/score.js';
import { configsRepository } from '../db/repositories/configs.js';
import { offersRepository } from '../db/repositories/offers.js';
import { matchesRepository } from '../db/repositories/matches.js';
import { profilesRepository } from '../db/repositories/profiles.js';
import { usersRepository } from '../db/repositories/users.js';
import { userSourcesRepository } from '../db/repositories/userSources.js';
import { notificationService } from './notification.service.js';
import { HttpError } from '../utils/httpError.js';
import { parseJson } from '../utils/index.js';

function serializeMatch(match) {
  if (!match) return match;
  return {
    ...match,
    brechas: parseJson(match.brechas, []),
    fortalezas: parseJson(match.fortalezas, []),
    criterios_evaluados: parseJson(match.criterios_evaluados, {}),
    via_ia: match.via_ia === true,
    notificado: match.notificado === true,
    penalizacion: match.penalizacion === true,
  };
}

function serializeOffer(offer) {
  return { ...offer, penalizacion: offer.penalizacion === true };
}

/**
 * Evalúa UNA oferta para un usuario:
 *   1) filtro duro determinístico (sin IA)
 *   2) si pasa, evaluación IA (o mock) + score ponderado en el servidor
 *   3) notificación por umbral
 */
export async function evaluateOfferForUser(userId, offerId) {
  const profile = await profilesRepository.findByUserId(userId);
  if (!profile) {
    throw new HttpError(400, 'Completa tu perfil profesional antes de evaluar ofertas');
  }
  const config = await configsRepository.findByUserId(userId) || await configsRepository.createDefault(userId);
  const offer = await offersRepository.findById(offerId);
  if (!offer) throw new HttpError(404, 'Oferta no encontrada');

  const user = await usersRepository.findById(userId);

  const hard = evaluateHardFilters({ config, offer });
  if (hard.result === 'REJECT') {
    const match = await matchesRepository.upsert(userId, offerId, {
      porcentaje_compatibilidad: 0,
      via_ia: false,
      filtro_resultado: 'REJECT',
      justificacion_ia: 'Descartada por filtros duros. No se utilizó IA.',
      brechas: hard.reasons,
      fortalezas: [],
      criterios: { filtros_duros: hard.reasons, provider: 'deterministico' },
      notificado: false,
    });
    return { match: serializeMatch(match), notification: null, offer: serializeOffer(offer) };
  }

  const aiResult = await evaluateCompatibility({ profile, config, offer });
  const weights = getScoreWeights();
  const subscores = {
    education: aiResult.education_score,
    experience: aiResult.experience_score,
    skills: aiResult.skills_score,
    location: aiResult.location_score,
    remuneration: aiResult.remuneration_score,
    contract: aiResult.contract_score,
  };
  const finalScore = computeFinalScore(subscores, weights);

  const match = await matchesRepository.upsert(userId, offerId, {
    porcentaje_compatibilidad: finalScore,
    via_ia: aiResult.provider === 'openai',
    filtro_resultado: 'PASS',
    justificacion_ia: aiResult.overall_analysis,
    brechas: aiResult.gaps,
    fortalezas: aiResult.strengths,
    criterios: { weights, subscores, provider: aiResult.provider, model: aiResult.model },
    notificado: false,
  });

  const notification = await notificationService.evaluateAndNotify({ user, config, offer, match });

  return { match: serializeMatch(match), notification, offer: serializeOffer(offer) };
}

/**
 * Evalúa todas las ofertas activas de las fuentes habilitadas del usuario.
 * Con force=false solo evalúa las que aún no tienen resultado (control de costos).
 */
export async function evaluateOffersForUser(userId, { force = false } = {}) {
  const selectedIds = await userSourcesRepository.enabledSourceIds(userId);
  if (!selectedIds.length) {
    throw new HttpError(400, 'Selecciona al menos una fuente laboral para evaluar ofertas');
  }
  const offers = await offersRepository.listBySourceIds(selectedIds);
  if (!offers.length) {
    return { total: 0, evaluated: [], rejected: [], notified: [] };
  }

  const results = [];
  const rejected = [];
  const notified = [];
  let skipped = 0;

  for (const offer of offers) {
    if (!force) {
      const existing = await matchesRepository.findByUserAndOffer(userId, offer.id);
      if (existing) {
        skipped += 1;
        continue;
      }
    }
    const result = await evaluateOfferForUser(userId, offer.id);
    results.push(result);
    if (result.match.filtro_resultado === 'REJECT') rejected.push(result);
    if (result.notification?.notified) notified.push(result.match);
  }

  return { total: offers.length, evaluated: results, rejected, notified, skipped };
}

export { serializeMatch };