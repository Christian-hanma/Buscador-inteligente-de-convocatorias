import { Router } from 'express';
import { env } from '../config/env.js';
import { ingestOffer } from '../services/ingestion.service.js';
import { HttpError } from '../utils/httpError.js';

const router = Router();

/**
 * POST /webhook/ingest
 * Punto de entrada para n8n. Requiere header: x-webhook-secret.
 */
router.post('/ingest', async (req, res) => {
  const secret = req.headers['x-webhook-secret'];
  if (env.NODE_ENV !== 'test' && secret !== env.WEBHOOK_SECRET) {
    throw new HttpError(401, 'Secreto de webhook inválido');
  }
  const result = await ingestOffer(req.body);
  res.status(result.created ? 201 : 200).json(result);
});

export default router;