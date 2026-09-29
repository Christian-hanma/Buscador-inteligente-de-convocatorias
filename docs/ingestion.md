# Ingesta de ofertas

Los `job_offers` llegan al sistema por **dos caminos**:

## 1. Webhook HTTP (recomendado, lo usa n8n)

`POST /api/webhook/ingest` con header `x-webhook-secret`.

- La fuente se identifica por `source` (columna `key` de `job_sources`). Si `key` no
  existe → 422.
- El payload es un objeto **plano** (una oferta por petición). Se valida con zod
  (`ingestion.service.js`); campos opcionales marcados.
- **Dedupe**: `(source_id, external_id)` único. Duplicados → respuesta `deduplicated:true`,
  no se duplica en BD. Re-envíos idempotentes.

Payload de oferta (campos opcionales marcados):

```json
{
  "source": "empleos-peru",
  "external_id": "TU-123-2026",
  "title": "Especialista en Contabilidad (CAS)",
  "company": "Municipalidad de Lima",
  "location": "Lima",
  "salary": 3800,
  "modality": "presencial",
  "contract_type": "CAS",
  "duration": 6,
  "penalization": false,
  "description": "Descripción completa...",
  "publication_date": "2026-09-01",
  "closing_date": "2026-09-30",
  "source_url": "https://..."
}
```

Nota: los workflow de borrador en `n8n-workflows/*.json` ya emiten este formato plano a la
URL de producción.

## 2. Webhook HTML (`POST /api/webhook/ingest-html`)

Flujo "n8n tonto, backend listo": n8n solo **descarga** la página y la envía aquí cruda;
el backend la parsea, normaliza y hace upsert con dedupe. Requiere `x-webhook-secret`.

```json
{ "source": "computrabajo", "html": "<!DOCTYPE html>..." }
```

Fuentes soportadas hoy (parsers en `ingest-html.service.js`):

- `computrabajo` → analiza `article[data-offers-grid-offer-item-container]` (20 por página: título, empresa, ubicación, salario, descripción corta).
- `yaempleo` → extrae los enlaces del listado `/posts` y descarga cada detalle (título, entidad, ubicación, salario, fecha de cierre, tipo CAS/728).

## 3. Semilla de desarrollo (`npm run seed`)

Crea 6 ofertas demo con `status='active'` para probar el pipeline (matching, dashboard).

## Fuentes actuales (seed)

| key | Nombre | Método | Estado |
| --- | --- | --- | --- |
| `computrabajo` | Computrabajo (pe.computrabajo.com/empleos-en-lima) | n8n GET → `/ingest-html` | ✅ integrada (workflow `ingesta-computrabajo.json`) |
| `yaempleo` | Ya Empleo (www.yaempleo.net/posts) | n8n GET → `/ingest-html` | ✅ integrada (workflow `ingesta-yaempleo.json`) |
| `empleos-peru` | Empleos Perú / MTPE | — | ⛔ pendiente — SPA cerrada (JS 404, requiere login) |
| `servir-ofertas` | SERVIR (app.servir.gob.pe) | — | ⛔ pendiente — anti-bot 403 + JSF/viewstate |
| `poder-judicial` | Empleos Públicos PJ | — | ⛔ bloqueada — anti-bot Imperva; alternativa: cubrir vía SERVIR |
| `indeed` | Indeed (pe.indeed.com) | — | ⛔ descartada — Cloudflare/captcha, robots lo prohíbe |
| `linkedin` | LinkedIn | — | ⚠️ opcional — guest API frágil + robots lo bloquea |

Cada `job_source` tiene `status`:
- `integrada` — hay workflow n8n empujando datos reales (dedupe por `(source_id, external_id)`).
- las demás: placeholder/pendientes hasta resolver acceso.

> Nota SERVIR/PJ: los convocatorias públicas se difunden simultáneamente en **Empleos Perú**
> y **Ya Empleo** (que ya está integrada), por lo que el empalme público está parcialmente cubierto.

## Flujo completo

```
n8n (Schedule) → descarga portal → normaliza → POST /api/webhook/ingest
  → ingestion.service (zod + dedupe) → job_offers(status active)
  → POST /api/matches/evaluate (sin offer_id)  (dashboard: "Evaluar ofertas")
  → filter.service (filtro duro) → openai/mock (si PASS) → match_results → notificacion
```

Los workflows de borrador están en `n8n-workflows/`. Ver `docs/api.md` para las rutas.