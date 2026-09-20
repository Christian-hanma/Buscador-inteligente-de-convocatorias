import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { evaluateOfferForUser, evaluateOffersForUser } from '../services/matching.service.js';
import { matchesRepository } from '../db/repositories/matches.js';
import { HttpError } from '../utils/httpError.js';

const router = Router();
router.use(authenticate);

const evaluateSchema = z.object({
  offer_id: z.number().int().positive().nullable().optional(),
  force: z.boolean().optional(),
});

router.post('/evaluate', validateBody(evaluateSchema), async (req, res) => {
  const { offer_id, force } = req.validated;
  if (offer_id) {
    const result = await evaluateOfferForUser(req.user.id, offer_id);
    return res.json(result);
  }
  const summary = await evaluateOffersForUser(req.user.id, { force: force === true });
  return res.json(summary);
});

router.get('/', (req, res) => {
  let matches = matchesRepository.listForUser(req.user.id);
  if (req.query.filtro === 'rejected') {
    matches = matches.filter((m) => m.filtro_resultado === 'REJECT');
  }
  res.json(matches);
});

router.get('/:id', (req, res) => {
  const match = matchesRepository.findByIdForUser(req.user.id, Number(req.params.id));
  if (!match) throw new HttpError(404, 'Match no encontrado');
  res.json(match);
});

export default router;