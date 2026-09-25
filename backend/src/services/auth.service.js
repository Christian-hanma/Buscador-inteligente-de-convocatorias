import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { usersRepository } from '../db/repositories/users.js';
import { configsRepository } from '../db/repositories/configs.js';
import { sourcesRepository } from '../db/repositories/sources.js';
import { userSourcesRepository } from '../db/repositories/userSources.js';
import { HttpError } from '../utils/httpError.js';

export async function registerUser({ email, password }) {
  const existing = await usersRepository.findByEmail(email);
  if (existing) {
    throw new HttpError(409, 'Ya existe una cuenta con ese email');
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  const user = await usersRepository.create({ email, passwordHash });

  await configsRepository.createDefault(user.id);

  const defaults = (await sourcesRepository.listAll()).filter((s) => s.is_default === true);
  await userSourcesRepository.setEnabled(user.id, defaults.map((s) => s.id));

  return { user: publicUser(user), token: signToken(user) };
}

export async function loginUser({ email, password }) {
  const user = await usersRepository.findByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new HttpError(401, 'Credenciales inválidas');
  }
  return { user: publicUser(user), token: signToken(user) };
}

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.created_at,
  };
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}