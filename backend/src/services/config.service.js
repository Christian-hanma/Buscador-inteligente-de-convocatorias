import { configsRepository } from '../db/repositories/configs.js';

export async function getConfig(userId) {
  return configsRepository.findByUserId(userId) || configsRepository.createDefault(userId);
}

export async function upsertConfig(userId, data) {
  return configsRepository.upsert(userId, data);
}