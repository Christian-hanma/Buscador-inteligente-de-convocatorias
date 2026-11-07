# Motor de matching

El cálculo de compatibilidad entre el perfil del usuario y una oferta usa **dos etapas**:

## 1. Filtro duro (sin IA)

`backend/src/services/filter.service.js` — evalúa reglas deterministas sobre `config_filtros`:

- **PASS** si la oferta cumple todas las condiciones configuradas y publica los datos necesarios para comprobarlas.
- **REJECT** si falla cualquier condición. El resultado se guarda con el motivo en
  `match_results.filtro_resultado = 'REJECT'` y **no se llama a OpenAI** (ahorro de costo).

Condiciones evaluadas (opcionales según la configuración):
`duración min/max`, `sueldo min/max`, `penalización`, `modalidad`, `tipo de contrato` y
departamentos preferidos. Los valores de contrato y modalidad se comparan normalizados
(por ejemplo, `728` equivale a `D.L. 728`). Si se define una condición y la oferta no publica
el dato necesario para comprobarla, la oferta se rechaza con ese motivo.

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

`POST /matches/evaluate` recorre las ofertas vigentes de las fuentes elegidas. Los resultados
se reutilizan mientras la configuración guardada siga igual; al cambiarla, las ofertas se
recalculan con las preferencias nuevas. Las convocatorias con fecha de cierre vencida se
excluyen de la evaluación y del dashboard.

## Datos de demostración

Las ofertas sembradas son ejemplos estáticos y pueden tener cierres pasados. El filtro de
vigencia las excluye una vez vencidas; para revisar coincidencias actuales, ejecuta una nueva
búsqueda en las fuentes integradas.
