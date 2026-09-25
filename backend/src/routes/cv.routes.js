import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { generateAdaptedCv, listCvs, getCv } from '../services/cv-adaptation.service.js';

const router = Router();
router.use(authenticate);

const generateSchema = z.object({
  offer_id: z.number().int().positive(),
});

router.post('/generate', validateBody(generateSchema), async (req, res) => {
  const result = await generateAdaptedCv(req.user.id, req.validated.offer_id);
  res.status(201).json(result);
});

router.get('/', async (req, res) => {
  res.json(await listCvs(req.user.id));
});

router.get('/:id', async (req, res) => {
  res.json(await getCv(req.user.id, Number(req.params.id)));
});

export default router;