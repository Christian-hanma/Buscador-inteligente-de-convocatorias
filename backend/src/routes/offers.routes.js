import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { offersRepository } from '../db/repositories/offers.js';
import { matchesRepository } from '../db/repositories/matches.js';
import { serializeMatch } from '../services/matching.service.js';
import { HttpError } from '../utils/httpError.js';

const router = Router();
router.use(authenticate);

function withMatch(userId, offer) {
  const match = matchesRepository.findByUserAndOffer(userId, offer.id);
  return { ...offer, match: match ? serializeMatch(match) : match ?? null };
}

router.get('/', (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const offers = offersRepository.list().filter(
    (o) => !status || o.status === status
  );
  res.json(offers.map((o) => withMatch(req.user.id, o)));
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const offer = offersRepository.findById(id);
  if (!offer) throw new HttpError(404, 'Oferta no encontrada');
  res.json(withMatch(req.user.id, offer));
});

export default router;