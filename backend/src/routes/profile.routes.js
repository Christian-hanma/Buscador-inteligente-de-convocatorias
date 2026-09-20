import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { getProfile, upsertProfile, setProfileCv } from '../services/profile.service.js';

const router = Router();
router.use(authenticate);

const profileSchema = z.object({
  nombre_completo: z.string().max(200).optional(),
  carrera: z.string().max(300).optional(),
  nivel_estudios: z.string().max(100).optional(),
  cv_texto: z.string().max(50000).optional(),
  experiencia: z.string().max(20000).optional(),
  ubicacion_actual: z.string().max(200).optional(),
  telefono: z.string().max(30).optional(),
  email_cv: z.string().email().max(254).optional().or(z.literal('')),
  linkedin: z.string().max(300).optional(),
  informacion_adicional: z.string().max(10000).optional(),
});

const cvSchema = z.object({
  cv_texto: z.string().min(1, 'El texto del CV no puede estar vacío').max(50000),
});

router.get('/', (req, res) => {
  res.json(getProfile(req.user.id));
});

router.post('/', validateBody(profileSchema), (req, res) => {
  const profile = upsertProfile(req.user.id, req.validated);
  res.status(201).json(profile);
});

router.put('/', validateBody(profileSchema), (req, res) => {
  const profile = upsertProfile(req.user.id, req.validated);
  res.json(profile);
});

router.post('/cv', validateBody(cvSchema), (req, res) => {
  const profile = setProfileCv(req.user.id, req.validated);
  res.json(profile);
});

router.get('/cv', (req, res) => {
  const profile = getProfile(req.user.id);
  res.json({ cv_texto: profile?.cv_texto || '' });
});

export default router;