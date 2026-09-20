# API del backend

Base URL: `http://localhost:4000/api` Â· Formato JSON Â· Auth: `Authorization: Bearer <JWT>` (excepto `auth/*` y `webhook/ingest`).

## AutenticaciÃ³n

| MÃ©todo | Ruta | Cuerpo | Respuesta |
| --- | --- | --- | --- |
| POST | `/auth/register` | `{email, password, nombres, apellidos}` | `{token, user}` |
| POST | `/auth/login` | `{email, password}` | `{token, user}` |
| GET | `/auth/me` | â€” | `{user}` |

`user` = `{id, email, createdAt}`. El nombre completo vive en el perfil.

## Perfil y configuraciÃ³n

| MÃ©todo | Ruta | Notas |
| --- | --- | --- |
| GET | `/profile` | Datos del perfil (tÃ­tulo profesional, experiencia, skills, CV baseâ€¦). |
| PUT | `/profile` | ActualizaciÃ³n parcial (solo campos enviados). `expected_salary` numÃ©rico, `ubicaciones[]` y `skills[]` como arrays. |
| GET | `/config` | `ConfigFiltro` del usuario. |
| PUT | `/config` | Guarda filtros; serializa arrays a JSON. |

`ConfigFiltro`: `sueldo_minimo`, `sueldo_maximo`, `radio_zona`, `ubicaciones_preferidas[]`, `duracion_min_meses`, `duracion_max_meses`, `modalidad`, `tipo_contrato`, `excluir_penalizaciones`, `umbral_notificacion`.

## Fuentes

| MÃ©todo | Ruta | Notas |
| --- | --- | --- |
| GET | `/sources` | Fuentes con flag `selected` segÃºn activaciÃ³n del usuario. |
| PUT | `/sources/user` | `{source_ids: number[]}` â†’ marca activaciÃ³n. |

## Ofertas y matches

| MÃ©todo | Ruta | Notas |
| --- | --- | --- |
| GET | `/offers` | Ofertas del usuario (de sus fuentes activas), con `match` embebido si existe. |
| GET | `/offers/:id` | Detalle con match. |
| POST | `/matches/evaluate` | `{offer_id}` opcional â†’ si viene, evalÃºa UNA oferta (filtro duro + IA); si no, evalÃºa TODAS las del usuario respetando matches existentes. Devuelve `{match, offer}` o `{total, evaluated[], rejected[], notified[], skipped}`. |
| GET | `/matches` | Todos los matches del usuario. |

`match` = `{id, offer_id, porcentaje_compatibilidad, nivel_compatibilidad, via_ia, filtro_resultado (PASS|REJECT), fortalezas[], brechas[], justificacion_ia, detectado_en, notificado, criterios_evaluados:{provider,model}}`.

## CV adaptados

| MÃ©todo | Ruta | Notas |
| --- | --- | --- |
| POST | `/cv-adaptations/generate` | `{offer_id}` â†’ `{cv}`. Requiere CV base en el perfil. Regla: **no inventar datos**. |
| GET | `/cv-adaptations` | Lista de CVs generados. |
| GET | `/cv-adaptations/:id` | Contenido markdown. |

## Webhook de ingesta (para n8n)

| MÃ©todo | Ruta | Headers | Notas |
| --- | --- | --- | --- |
| POST | `/webhook/ingest` | `x-webhook-secret` | Cuerpo `{source_key, offers[], raw}`. Devuelve `{created, skipped: n}`. 401 si el secreto no coincide; dedupe por `(source_id, external_id)` â†’ las duplicadas se reportan en `skipped` sin error. |

**Errores:** `{error: string}`, cÃ³digos 400 (validaciÃ³n), 401 (no autenticado / secreto invÃ¡lido), 404 (ruta u oferta inexistente), 409 (email ya registrado), 422 (zod).
