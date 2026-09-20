import { configsRepository } from '../db/repositories/configs.js';

export function getConfig(userId) {
  return configsRepository.findByUserId(userId) || configsRepository.createDefault(userId);
}

export function upsertConfig(userId, data) {
  return configsRepository.upsert(userId, data);
}