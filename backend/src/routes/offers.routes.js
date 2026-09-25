import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { offersRepository } from '../db/repositories/offers.js';
import { matchesRepository } from '../db/repositories/matches.js';
import { serializeMatch } from '../services/matching.service.js';
import { HttpError } from '../utils/httpError.js';

const router = Router();
router.use(authenticate);

async function withMatch(userId, offer) {
  const match = await matchesRepository.findByUserAndOffer(userId, offer.id);
  return { ...offer, match: match ? serializeMatch(match) : match ?? null };
}

router.get('/', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const offers = (await offersRepository.list()).filter(
    (o) => !status || o.status === status
  );
  res.json(await Promise.all(offers.map((o) => withMatch(req.user.id, o))));
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const offer = await offersRepository.findById(id);
  if (!offer) throw new HttpError(404, 'Oferta no encontrada');
  res.json(await withMatch(req.user.id, offer));
});

export default router;