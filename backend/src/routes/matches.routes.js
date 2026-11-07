import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { evaluateOfferForUser, evaluateOffersForUser } from '../services/matching.service.js';
import { matchesRepository } from '../db/repositories/matches.js';
import { HttpError } from '../utils/httpError.js';
import { userSourcesRepository } from '../db/repositories/userSources.js';
import { sourcesRepository } from '../db/repositories/sources.js';
import { searchIntegratedSource } from '../services/ingest-html.service.js';

const router = Router();
router.use(authenticate);

// Consulta directamente las fuentes elegidas y evalúa las ofertas nuevas.
router.post('/search', async (req, res) => {
  const selectedIds = await userSourcesRepository.enabledSourceIds(req.user.id);
  if (!selectedIds.length) throw new HttpError(400, 'Selecciona al menos una fuente laboral antes de buscar.');

  const selectedSources = await Promise.all(selectedIds.map((id) => sourcesRepository.findById(id)));
  const searchable = selectedSources.filter((source) => source && ['computrabajo', 'yaempleo'].includes(source.key));
  if (!searchable.length) {
    throw new HttpError(400, 'Las fuentes seleccionadas aún no admiten búsqueda automática. Selecciona Computrabajo o Ya Empleo en Fuentes.');
  }
  const ingestions = await Promise.all(searchable.map((source) => searchIntegratedSource(source.key)));

  const summary = await evaluateOffersForUser(req.user.id);
  res.json({ ingestions, evaluated: summary.evaluated?.length ?? 0, skipped: summary.skipped ?? 0, matches: summary });
});

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

router.get('/', async (req, res) => {
  let matches = await matchesRepository.listForUser(req.user.id);
  if (req.query.filtro === 'rejected') {
    matches = matches.filter((m) => m.filtro_resultado === 'REJECT');
  }
  res.json(matches);
});

router.get('/:id', async (req, res) => {
  const match = await matchesRepository.findByIdForUser(req.user.id, Number(req.params.id));
  if (!match) throw new HttpError(404, 'Match no encontrado');
  res.json(match);
});

export default router;
