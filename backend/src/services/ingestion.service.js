import { z } from 'zod';
import { sourcesRepository } from '../db/repositories/sources.js';
import { offersRepository } from '../db/repositories/offers.js';
import { HttpError } from '../utils/httpError.js';

/** Contrato normalizado aceptado por POST /webhook/ingest (lo produce n8n). */
export const ingestSchema = z.object({
  source: z.string().min(1).max(100),
  external_id: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  company: z.string().max(500).optional().nullable(),
  salary: z.number().int().nonnegative().nullable().optional(),
  location: z.string().max(500).optional().nullable(),
  duration: z.number().int().nonnegative().nullable().optional(),
  modality: z.string().max(100).optional().nullable(),
  contract_type: z.string().max(100).optional().nullable(),
  penalization: z.boolean().optional().nullable(),
  description: z.string().max(200000).optional().nullable(),
  publication_date: z.string().max(100).optional().nullable(),
  closing_date: z.string().max(100).optional().nullable(),
  source_url: z.string().url().optional().nullable().or(z.literal('')).nullable(),
});

function toUnixOrNull(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? iso : new Date(t).toISOString().slice(0, 10);
}

export async function ingestOffer(payload) {
  const parsed = ingestSchema.safeParse(payload ?? {});
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new HttpError(422, 'Formato de ingesta inválido', details);
  }

  const data = parsed.data;
  const source = await sourcesRepository.findByKey(data.source);
  if (!source) {
    throw new HttpError(422, `Fuente desconocida: "${data.source}". Debe estar registrada en job_sources.`);
  }

  const result = await offersRepository.upsert({
    source_id: source.id,
    external_id: data.external_id,
    titulo: data.title,
    entidad: data.company,
    sueldo: data.salary,
    ubicacion: data.location,
    modalidad: data.modality,
    tipo_contrato: data.contract_type,
    duracion: data.duration,
    penalizacion: data.penalization === true,
    fuente: source.name,
    source_url: data.source_url || null,
    fecha_publicacion: toUnixOrNull(data.publication_date),
    fecha_cierre: toUnixOrNull(data.closing_date),
    texto_completo: data.description,
    status: 'active',
  });

  return {
    offer: result.offer,
    created: !result.updated,
    deduplicated: result.updated,
  };
}