import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { offersRepository } from '../db/repositories/offers.js';
import { matchesRepository } from '../db/repositories/matches.js';
import { userSourcesRepository } from '../db/repositories/userSources.js';
import { serializeMatch } from '../services/matching.service.js';
import { HttpError } from '../utils/httpError.js';
import { activeOfferStatus } from '../utils/dates.js';

const router = Router();
router.use(authenticate);

async function withMatch(userId, offer) {
  const match = await matchesRepository.findByUserAndOffer(userId, offer.id);
  return { ...offer, match: match ? serializeMatch(match) : match ?? null };
}

router.get('/', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'active';
  const selectedIds = await userSourcesRepository.enabledSourceIds(req.user.id);
  const offers = (await offersRepository.listBySourceIds(selectedIds, 'all'))
    .map((offer) => ({ ...offer, status: activeOfferStatus(offer) }))
    .filter((offer) => status === 'all' || offer.status === status);
  res.json(await Promise.all(offers.map((offer) => withMatch(req.user.id, offer))));
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const offer = await offersRepository.findById(id);
  if (!offer) throw new HttpError(404, 'Oferta no encontrada');
  res.json(await withMatch(req.user.id, { ...offer, status: activeOfferStatus(offer) }));
});

export default router;
