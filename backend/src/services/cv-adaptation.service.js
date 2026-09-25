import { profilesRepository } from '../db/repositories/profiles.js';
import { offersRepository } from '../db/repositories/offers.js';
import { cvsRepository } from '../db/repositories/cvs.js';
import { adaptCv } from './openai.service.js';
import { HttpError } from '../utils/httpError.js';

/**
 * Genera un CV adaptado SOLO bajo demanda del usuario.
 * Usa el CV base del perfil + la oferta concreta. Nunca inventa información.
 */
export async function generateAdaptedCv(userId, offerId) {
  const profile = await profilesRepository.findByUserId(userId);
  if (!profile) {
    throw new HttpError(400, 'Completa tu perfil antes de generar un CV');
  }
  if (!profile.cv_texto || !profile.cv_texto.trim()) {
    throw new HttpError(400, 'Sube tu CV base antes de generar un CV adaptado');
  }
  const offer = await offersRepository.findById(offerId);
  if (!offer) throw new HttpError(404, 'Oferta no encontrada');

  const result = await adaptCv({ profile, offer });
  const version = await cvsRepository.nextVersion(userId, offerId);
  const generated = await cvsRepository.create({
    userId,
    offerId,
    baseProfileId: profile.id,
    content: result.content,
    version,
    status: 'generated',
  });

  return { cv: generated, provider: result.provider, model: result.model };
}

export async function listCvs(userId) {
  return cvsRepository.listForUser(userId);
}

export async function getCv(userId, id) {
  const cv = await cvsRepository.findByIdForUser(userId, id);
  if (!cv) throw new HttpError(404, 'CV generado no encontrado');
  return cv;
}