import { sourcesRepository } from '../db/repositories/sources.js';
import { userSourcesRepository } from '../db/repositories/userSources.js';

export async function listSources(userId) {
  const active = await sourcesRepository.listActive();
  const selected = await userSourcesRepository.enabledSourceIds(userId);
  return active.map((s) => ({
    ...s,
    selected: selected.includes(s.id),
  }));
}

export async function getUserSources(userId) {
  return userSourcesRepository.forUser(userId);
}

export async function updateUserSources(userId, sourceIds) {
  const allIds = (await sourcesRepository.listAll()).map((s) => s.id);
  const valid = sourceIds.filter((id) => allIds.includes(id));
  await userSourcesRepository.setEnabled(userId, valid);
  return getUserSources(userId);
}