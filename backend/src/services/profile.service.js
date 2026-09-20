import { profilesRepository } from '../db/repositories/profiles.js';
import { HttpError } from '../utils/httpError.js';

export function getProfile(userId) {
  const profile = profilesRepository.findByUserId(userId);
  if (!profile) return null;
  return profile;
}

export function upsertProfile(userId, data) {
  return profilesRepository.upsert(userId, data);
}

export function setProfileCv(userId, { cv_texto }) {
  const existing = profilesRepository.findByUserId(userId);
  if (!existing) {
    throw new HttpError(400, 'Crea primero tu perfil antes de subir un CV');
  }
  return profilesRepository.upsert(userId, { ...existing, cv_texto });
}

export function requireProfile(userId) {
  const profile = profilesRepository.findByUserId(userId);
  if (!profile || !profile.nombre_completo || !profile.carrera) {
    throw new HttpError(400, 'Completa tu perfil profesional antes de continuar');
  }
  return profile;
}