# Workflows n8n (borradores iniciales)

Este directorio contiene los **primeros borradores** de los workflows de ingesta para n8n.
Estado actual: `placeholder` — se documenta la intención, pero **ningún flujo está conectado
todavía** a fuentes reales (las fuentes en la BD tienen `status = 'placeholder'`).

## Cómo se conecta n8n a este sistema

n8n no escribe directo en la BD. Los workflows terminan en un **webhook HTTP** del backend:

```
POST /api/webhook/ingest
Headers: x-webhook-secret: <WEBHOOK_SECRET del backend>
Body:    { "source_key": "talento-peru", "offers": [ ... ], "raw": { "url": "..." } }
```

- El header `x-webhook-secret` debe coincidir con `WEBHOOK_SECRET` del `.env` del backend.
- El backend valida cada oferta con zod, aplica dedupe por `(source_id, external_id)`
  y guarda en `job_offers` con `status = 'active'`.
- Los cambios toman efecto al ejecutar el endpoint `POST /api/matches/evaluate-all`
  (o al hacer clic en "Evaluar ofertas" desde el dashboard → `POST /api/matches/evaluate` sin offer_id).

## Flujo recomendado en n8n

```
[Schedule Trigger (diario 06:00)] → [HTTP Request: descargar página/JSON de la fuente]
  → [HTML Extract / código de parseo] → [Normalize: estandarizar a {source_key, offers[]}]
  → [HTTP Request: POST /api/webhook/ingest con x-webhook-secret]
  → [IF response.ok] → (éxito: log + resumen) / (error: HTTP Request para alerta)
```

## Importar en n8n

1. Crear instancia n8n (Docker o local).
2. Settings → Import workflow → elegir uno de los archivos `.json` de este directorio.
3. Configurar en el nodo HTTP Request la URL del backend y el header `x-webhook-secret`.
4. Ejecutar en modo test y validar que lleguen ofertas a `GET /api/offers`.

## Inventario

| Archivo | Fuente objetivo | Método | Estado |
| --- | --- | --- | --- |
| `ingesta-talento-peru.json` | SERVIR / Talento Perú (ofertas públicas) | N8N | placeholder |
| `ingesta-empleos-peru.json` | Empleos Perú / MTPE (bolsas públicas) | N8N | placeholder |

## Notas de integración (validar antes de activar)

- **SERVIR / Talento Perú (`app.servir.gob.pe/DifusionOfertasExterno`)** usa JSF
  (JavaServer Faces). Requiere manejar el `ViewState` y enviar búsquedas por POST;
  en n8n puede implementarse con peticiones simuladas + `HTML Extract`, o exportando
  reportes a Excel/CSV si el portal los ofrece. Las ofertas registradas ahí también se
  difunden automáticamente en **Empleos Perú** (`www.empleosperu.gob.pe`), así que se
  puede elegir la fuente más fácil de parsear.
- **Ya Empleo (`www.yaempleo.net`)**: portal tipo bolsa/agregador privado; parseo por
  `HTML Extract` con selectores que deben validarse contra su HTML real. Respetar sus
  términos de uso y frecuencia de consulta.

> **Nota honesta:** el scraping masivo no está implementado ni se recomienda hacer de
> forma agresiva. Los workflows son la base para integrar fuentes de publicación oficial;
> antes de activarlos hay que validar términos de uso de cada portal y el formato real de
> sus páginas.