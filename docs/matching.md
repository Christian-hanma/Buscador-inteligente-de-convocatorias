# Motor de matching

El cálculo de compatibilidad entre el perfil del usuario y una oferta usa **dos etapas**:

## 1. Filtro duro (sin IA)

`backend/src/services/filter.service.js` — evalúa reglas deterministas sobre `config_filtros`:

- **PASS** si hay al menos una condición de distancia habilitada POR FUEGO.
  *Espejo de reglas de negocio*: años mínimos/máximos solo si `min/max > 0`, modalidad/contrato solo si no son `any`, penalización solo si `excluir_penalizaciones` está marcado.
- **REJECT** si falla cualquier condición. El resultado se guarda con el motivo en
  `match_results.filtro_resultado = 'REJECT'` y **no se llama a OpenAI** (ahorro de costo).

Condiciones evaluadas (todas opcionales según la config):
`duracion min/max meses`, `sueldo min/max`, `penalización`, `modalidad`, `tipo de contrato`.
La ubicación **no** descarta: entra como brecha/puntaje soft en la etapa 2.

> Nota de diseño: en el seed el sueldo máximo es distinto. Si un usuario configura
> `sueldo_maximo`, ofertas por encima se REJECTan; de lo contrario no se exige.

## 2. Evaluación con IA

`backend/src/services/matching.service.js` → `openai.service.js`.

- Sin `OPENAI_API_KEY` (o con `OPENAI_USE_MOCK=true`) el sistema usa el **mock
  determinista** (`services/ai/mock.provider.js`) para que el MVP funcione sin pagos.
  Los matches generados con mock se marcan `via_ia = 0`.
- Con clave, se envía el perfil + `config_filtros` + oferta con este prompt (resumen):
  1. contexto del rol y regla de **no inventar**;
  2. respuesta JSON estricto: `{porcentaje, nivel, fortalezas[], brechas[], justificacion}`;
  3. petición de `fallback` si la oferta no aplica.
- Se exige `respuesta_valida` para actualizar notificación; si el LLM devuelve basura o
  tarda más de `OPENAI_TIMEOUT_MS` (default 30 s) → fallback a mock, nunca error 500.

### Puntaje ponderado

`SCORE_WEIGHTS_JSON` (default): education `0.20`, experience `0.25`, skills `0.25`,
location `0.10`, remuneration `0.10`, contract `0.10` = 1.0.

Reglas de ponderación (en el proveedor real como guía, en grab deben ser deterministas):

- **location**: 100% si coincide con `ubicaciones_preferidas`; 70% si otro distrito de la
  misma ciudad-región (p. ej. "Lima" vs "Lima / Callao"); 50% si misma departamento;
  menor a 50% si otra región → aparece como brecha ("Estás a X km").
- **skills**: 100% si todas las requeridas del usuario; proporcional a las coincidentes.
- **remuneration**: penaliza cuando el `sueldo` está fuera del rango configurado.
- **contract**: valora `cas`/`728` clavados al tipo preferido.

## Notificación

Al guardar un match con `porcentaje_compatibilidad >= umbral_notificacion` y sin match
previo, se marca `notificado = 1` y `notification.service.js` registra la notificación
(log en `backend/logs/` + futuro push Web/FCM). Las notificaciones son **simuladas**: no se
envían emails.

## Re-evaluación

`POST /matches/evaluate-all` recorre las ofertas activas de las fuentes del usuario.
Los matches ya existentes **no se recalculan** (se cuentan en `skipped`) salvo que se
borren de `match_results`. Para forzar recálculo de una oferta se usa
`POST /matches/evaluate`.

## Fuerza bruta de prueba de concepto

El seed deja dos matches REJECT que demuestran el filtro duro sin consumir IA:
- Oferta 3: sueldo S/2000 < mínimo S/3000 del demo → REJECT.
- Oferta 4: penalización activada + 24 meses de servicio → REJECT.
- Oferta 5: ubicación correcta región Cusco, pero con brecha → 80% (soft, no descartada).
- Oferta 6: alto puntaje en skills pero que exige colegiatura/años → 82% (brecha fuerte).