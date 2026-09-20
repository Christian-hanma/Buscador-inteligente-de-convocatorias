import { sourcesRepository } from '../db/repositories/sources.js';
import { userSourcesRepository } from '../db/repositories/userSources.js';

export function listSources(userId) {
  return sourcesRepository.listActive().map((s) => ({
    ...s,
    selected: userSourcesRepository.enabledSourceIds(userId).includes(s.id),
  }));
}

export function getUserSources(userId) {
  return userSourcesRepository.forUser(userId);
}

export function updateUserSources(userId, sourceIds) {
  const allIds = sourcesRepository.listAll().map((s) => s.id);
  const valid = sourceIds.filter((id) => allIds.includes(id));
  userSourcesRepository.setEnabled(userId, valid);
  return getUserSources(userId);
}