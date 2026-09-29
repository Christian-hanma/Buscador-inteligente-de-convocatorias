import { Router } from 'express';
import { env } from '../config/env.js';
import { ingestOffer } from '../services/ingestion.service.js';
import { ingestHtml } from '../services/ingest-html.service.js';
import { HttpError } from '../utils/httpError.js';

const router = Router();

function assertSecret(req) {
  const secret = req.headers['x-webhook-secret'];
  if (env.NODE_ENV !== 'test' && secret !== env.WEBHOOK_SECRET) {
    throw new HttpError(401, 'Secreto de webhook inválido');
  }
}

/**
 * POST /webhook/ingest
 * Punto de entrada para n8n. Requiere header: x-webhook-secret.
 * Acepta una oferta plana o una carga masiva { source, offers: [...] }.
 */
router.post('/ingest', async (req, res) => {
  assertSecret(req);
  const body = req.body ?? {};
  if (!body.offers || !Array.isArray(body.offers)) {
    const result = await ingestOffer(body);
    return res.status(result.created ? 201 : 200).json(result);
  }
  const results = [];
  let created = 0;
  let deduplicated = 0;
  for (const offer of body.offers) {
    try {
      const result = await ingestOffer({ source: body.source, ...offer });
      results.push({ external_id: offer.external_id, created: result.created });
      if (result.created) created += 1;
      else deduplicated += 1;
    } catch (err) {
      results.push({ external_id: offer.external_id, error: err.message });
    }
  }
  res.json({ source: body.source, total: body.offers.length, created, deduplicated, results });
});

/**
 * POST /webhook/ingest-html
 * n8n solo descarga la página y la envía aquí; el backend parsea y normaliza.
 * Body: { source: 'computrabajo'|'yaempleo', html: '...' }
 */
router.post('/ingest-html', async (req, res) => {
  assertSecret(req);
  const stats = await ingestHtml(req.body ?? {});
  res.status(stats.created ? 201 : 200).json(stats);
});

export default router;