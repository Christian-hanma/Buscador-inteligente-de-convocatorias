import { Router } from 'express';
import { z } from 'zod';
import { registerUser, loginUser, publicUser } from '../services/auth.service.js';
import { validateBody } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { usersRepository } from '../db/repositories/users.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Email inválido').max(254),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(200),
});

const loginSchema = z.object({
  email: z.string().email('Email inválido').max(254),
  password: z.string().min(1, 'Contraseña requerida').max(200),
});

router.post('/register', validateBody(registerSchema), (req, res) => {
  const result = registerUser(req.validated);
  res.status(201).json(result);
});

router.post('/login', validateBody(loginSchema), (req, res) => {
  const result = loginUser(req.validated);
  res.json(result);
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: publicUser(usersRepository.findById(req.user.id)) });
});

export default router;