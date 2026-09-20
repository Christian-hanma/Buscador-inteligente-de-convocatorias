# Ingesta de ofertas

Los `job_offers` llegan al sistema por **dos caminos**:

## 1. Webhook HTTP (recomendado, lo usa n8n)

`POST /api/webhook/ingest` con header `x-webhook-secret`.

- La fuente se identifica por `source_key` (columna `key` de `job_sources`, por ejemplo
  `talento-peru`, `empleos-peru`). Si `key` no existe → 404.
- Cada oferta del array `offers[]` se valida con zod (`ingestion.service.js`); las
  inválidas se ignoran y se acumulan en `skipped` (no rompen el lote).
- **Dedupe**: `(source_id, external_id)` único. Duplicados → `skipped`, no se duplica en BD.
- Lote con `external_id` para cada oferta permite re-envíos idempotentes.

Payload de oferta (campos opcionales marcados):

```json
{
  "source_key": "talento-peru",
  "raw": { "url": "https://..." },
  "offers": [{
    "external_id": "TU-123-2026",
    "titulo": "Especialista en Contabilidad (CAS)",
    "entidad": "Municipalidad de Lima",
    "ubicacion": "Lima",
    "sueldo": 3800,
    "modalidad": "presencial",
    "tipo_contrato": "cas",
    "duracion": 6,
    "penalizacion": false,
    "rubro": "Contabilidad",
    "departamento": "Lima",
    "disponible_candidato_usuario": true,
    "fecha_publicacion": "2026-09-01",
    "fecha_cierre": "2026-09-30",
    "source_url": "https://...",
    "texto_completo": "Descripción completa..."
  }]
}
```

## 2. Semilla de desarrollo (`npm run seed`)

Crea 6 ofertas demo con `status='active'` para probar el pipeline (matching, dashboard).

## Fuentes actuales (seed)

| key | Nombre | Método previsto | Estado |
| --- | --- | --- | --- |
| `servir-ofertas` | SERVIR · Ofertas de Empleo Público (app.servir.gob.pe) | N8N | placeholder |
| `empleos-peru` | Empleos Perú / MTPE (empleosperu.gob.pe) | N8N | placeholder |
| `poder-judicial` | Empleos Públicos del Poder Judicial | N8N | placeholder |
| `computrabajo` | Computrabajo | SCRAPING | placeholder |
| `indeed` | Indeed (pe.indeed.com) | SCRAPING | placeholder |
| `linkedin` | LinkedIn | SCRAPING | placeholder |
| `yaempleo` | Ya Empleo (www.yaempleo.net) | SCRAPING | placeholder |

Cada `job_source` tiene `status`:
- `placeholder` (hoy) — la fuente existe en BD pero no hay workflow real conectado.
- `integrada` — cuando un workflow n8n empuje datos reales.

> Nota SERVIR: el buscador de ofertas públicas de SERVIR (`DifusionOfertasExterno`) es una
> app JSF; las ofertas registradas en ella se difunden automáticamente en el portal
> **Empleos Perú** (`www.empleosperu.gob.pe`), por lo que conviene priorizar el parseo de
> Empleos Perú para no duplicar trabajo.

## Flujo completo

```
n8n (Schedule) → descarga portal → normaliza → POST /api/webhook/ingest
  → ingestion.service (zod + dedupe) → job_offers(status active)
  → POST /api/matches/evaluate (sin offer_id)  (dashboard: "Evaluar ofertas")
  → filter.service (filtro duro) → openai/mock (si PASS) → match_results → notificacion
```

Los workflows de borrador están en `n8n-workflows/`. Ver `docs/api.md` para las rutas.