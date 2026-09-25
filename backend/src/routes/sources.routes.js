import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { listSources, updateUserSources, getUserSources } from '../services/sources.service.js';

const router = Router();
router.use(authenticate);

const updateSchema = z.object({
  source_ids: z.array(z.number().int().positive()).max(100),
});

router.get('/', async (req, res) => {
  res.json(await listSources(req.user.id));
});

router.get('/user', async (req, res) => {
  res.json(await getUserSources(req.user.id));
});

router.put('/user', validateBody(updateSchema), async (req, res) => {
  res.json(await updateUserSources(req.user.id, req.validated.source_ids));
});

export default router;