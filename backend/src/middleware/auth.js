import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { usersRepository } from '../db/repositories/users.js';
import { HttpError } from '../utils/httpError.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    throw new HttpError(401, 'Token requerido');
  }
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Token inválido o expirado');
  }
  const user = await usersRepository.findById(payload.sub);
  if (!user) {
    throw new HttpError(401, 'Usuario no existe');
  }
  req.user = { id: user.id, email: user.email };
  next();
}