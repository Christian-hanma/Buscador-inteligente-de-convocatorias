import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { getConfig, upsertConfig } from '../services/config.service.js';

const router = Router();
router.use(authenticate);

const configSchema = z.object({
  sueldo_minimo: z.number().int().nonnegative().nullable().optional(),
  sueldo_maximo: z.number().int().nonnegative().nullable().optional(),
  radio_zona: z.number().int().nonnegative().nullable().optional(),
  ubicaciones_preferidas: z.array(z.string().max(200)).max(50).optional(),
  duracion_min_meses: z.number().int().nonnegative().nullable().optional(),
  duracion_max_meses: z.number().int().nonnegative().nullable().optional(),
  excluir_penalizaciones: z.boolean().optional(),
  modalidad: z.string().max(50).optional(),
  tipo_contrato: z.string().max(50).optional(),
  umbral_notificacion: z.number().int().min(0).max(100).optional(),
});

function shapeForDb(validated) {
  return {
    ...validated,
    ubicaciones_preferidas: validated.ubicaciones_preferidas
      ? JSON.stringify(validated.ubicaciones_preferidas)
      : undefined,
    excluir_penalizaciones: validated.excluir_penalizaciones === undefined
      ? undefined
      : validated.excluir_penalizaciones ? 1 : 0,
  };
}

router.get('/', (req, res) => {
  const config = getConfig(req.user.id);
  res.json({ ...config, ubicaciones_preferidas: JSON.parse(config.ubicaciones_preferidas || '[]') });
});

router.post('/', validateBody(configSchema), (req, res) => {
  const config = upsertConfig(req.user.id, shapeForDb(req.validated));
  res.status(201).json({ ...config, ubicaciones_preferidas: JSON.parse(config.ubicaciones_preferidas || '[]') });
});

router.put('/', validateBody(configSchema), (req, res) => {
  const config = upsertConfig(req.user.id, shapeForDb(req.validated));
  res.json({ ...config, ubicaciones_preferidas: JSON.parse(config.ubicaciones_preferidas || '[]') });
});

export default router;