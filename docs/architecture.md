# Arquitectura — Buscador Inteligente de Convocatorias

## Propósito

Sistema web para buscar convocatorias laborales (públicas y privadas), filtrar ofertas con
criterios duros configurados por el usuario, evaluar compatibilidad con IA, explicar el
resultado y generar un CV adaptado a una oferta **sin inventar información**.

## Visión general

```
                    FUENTES LABORALES
                           |
                           v
                      [ n8n ] Ingesta  (workflows JSON exportables)
                           |
                           v
                  POST /webhook/ingest
                           |
                           v
                     BACKEND (Express, API REST)
                           |
              +------------+------------+
              v            v            v
          Usuarios      Ofertas     Fuentes
              |            |           |
              v            v           v
           Perfil      ConfigFiltro  UserJobSource
              |            |           |
              +------+-----+           |
                     v                 |
               MOTOR DE MATCHING       |
                     |                 |
          +----------+-----------+     |
          v                      v     |
     Filtros duros          Evaluacion IA
     (sin gasto OpenAI)          |
          +-----------------+-----+
                              v
                        MatchResult
                     (score + justificacion)
                              |
              +---------------+---------------+
              v                               v
         Dashboard                        Notificacion (umbral)
              |
              v  (usuario solicita)
         GENERAR CV ADAPTADO
              |
              v
         cv-adaptation.service  ->  GeneratedCV
              |
              v
         Documento final (texto estructurado)
```

## Decisiones arquitectónicas relevantes

### 1. Base de datos: PostgreSQL (Supabase)

- El backend usa **PostgreSQL** vía el driver `pg` contra Supabase. Las tablas viven en el
  schema `convocatorias` para no mezclarse con otros proyectos del mismo proyecto Supabase.
- La conexión fija el `search_path` en **cada conexión nueva** del pool (evento `connect`):
  Supabase/Supavisor ignora el parámetro `options` de la URL de conexión, así que sin esto
  los INSERT/DROP con nombre corto caerían en `public`.
- Tipos usados: `citext` para emails únicos case-insensitive, `JSONB` para arrays
  (`ubicaciones_preferidas`, `brechas`, `fortalezas`, `criterios_evaluados`), `BOOLEAN`
  nativo y `TIMESTAMPTZ`. Los arrays/objetos se serializan con `JSON.stringify` antes de
  enviarse a columnas jsonb (el driver `pg` convierte arrays JS a literales de array de
  Postgres, no a JSON).
- Toda la persistencia pasa por una **capa de repositorios** (`backend/src/db/repositories`)
  con SQL crudo y API async (`all/get/run` que traducen `?` → `$1, $2…`). Ninguna ruta ni
  servicio accede a la base de datos directamente.
- El esquema se aplica con `backend/src/db/schema.sql` (ejecutado por `npm run migrate` y
  automáticamente al arrancar el servidor).

### 2. Backend: Express + ESM

- JavaScript moderno (ESM) para minimizar la cadena de herramientas del backend.
- Autenticación: JWT (`jsonwebtoken`) + hash de contraseñas con `bcryptjs` (implementación
  pura JS, sin binarios nativos).
- Validación de inputs y contratos de API con `zod`.
- CORS restringido a `FRONTEND_URL`. Helmet para headers de seguridad.
- Los errores se centralizan en un middleware: nunca se devuelven stack traces en producción.

### 3. IA de OpenAI encapsulada

- `src/services/openai.service.js` es el único punto de contacto con OpenAI.
- El modelo es configurable por entorno (`OPENAI_MODEL`).
- **Modo mock de fábrica:** si `OPENAI_API_KEY` no existe (o `OPENAI_USE_MOCK=true`), se usa
  un proveedor determinístico local que produce respuestas estructuradas del mismo formato.
  La aplicación **nunca se rompe** si OpenAI no está disponible.
- El frontend jamás contacta OpenAI; todo pasa por el backend.

### 4. Motor de matching en dos etapas (control de costos)

1. **Filtro duro determinístico** (`filter.service.js`): evalúa sueldo mínimo/máximo,
   penalizaciones, duración, ubicaciones, modalidad y tipo de contrato. Resultado `PASS` o
   `REJECT`. **No consume IA.**
2. **Evaluación IA** (`matching.service.js`): solo las ofertas que pasaron el filtro duro
   llegan a OpenAI. La IA devuelve sub-scores (educación, experiencia, habilidades,
   ubicación, contrato). El backend calcula el **porcentaje final** con pesos configurables
   (`SCORE_WEIGHTS` en `.env`) en lugar de confiar en que GPT invente el número.

### 5. Score final reproducible

El porcentaje final se calcula en el servidor con pesos configurables (formación 20%,
experiencia 25%, habilidades/funciones 25%, ubicación 10%, remuneración 10%, contrato 10%).
Esto permite reproducir el resultado y ajustar pesos sin tocar código.

### 6. CV adaptado sin inventar información

`cv-adaptation.service.js` implementa el principio **"adaptar el CV, no fabricar un
candidato"**. El prompt de IA ordena explícitamente no inventar empleos, empresas, cargos,
estudios, certificaciones, años ni herramientas. La generación es **bajo demanda** del
usuario (nunca automática), y cada resultado se guarda en `generated_cvs` (historial por
versión).

### 7. Notificaciones simulables

`notification.service.js` centraliza el envío (en MVP: registro en logs + marca `notified`).
La interfaz del servicio está preparada para Web Push API y, posteriormente, Firebase Cloud
Messaging.

### 8. Ingesta mediante webhook (punto de extensión para n8n)

`POST /webhook/ingest` recibe un objeto normalizado, lo valida y lo inserta deduplicando por
`source + external_id`. Los workflows de n8n (`n8n-workflows/*.json`) documentan el flujo
fuente → extracción → normalización → webhook. El scraping real aún **no** está activo: las
fuentes se marcan como `placeholder` y los workflows son ejemplos exportables.

## Flujo de autenticación

- `POST /auth/register` → `POST /auth/login` → JWT firmado con `JWT_SECRET`.
- Middleware `authenticate` valida el token en cada petición protegida.
- Roles futuros (admin, etc.) pueden agregarse con el mismo middleware sin cambios mayores.

## Migración a PostgreSQL / Supabase (implementada)

1. `schema.sql` fue reescrito en DDL de PostgreSQL bajo el schema `convocatorias`.
2. La capa de repositorios se reimplementó contra `pg` (async); rutas, servicios y
   middleware solo adaptaron su llamadas a `await`.
3. La conexión usa `DATABASE_URL` + `DATABASE_SCHEMA` (`.env`), con `search_path` fijado
   por conexión (ver decisión 1).
4. `npm run seed` / `db:reset` operan sobre Supabase directamente.

## Lo que NO está en el MVP (y por qué)

- Scraping universal / búsqueda indiscriminada en Google.
- Crawlers masivos, Redis, Elasticsearch, bases vectoriales, microservicios, Kubernetes.
- Firebase, pagos, multi-tenant avanzado, app móvil.
- Parser sofisticado de PDF/DOCX para CV (el MVP usa texto estructurado; el parser de
  documentos es un punto de extensión en `cv-text.parser.js`).

## Extensiones planificadas

scraping real vía n8n, más fuentes, Web Push / FCM, generación PDF/DOCX,
historial de postulaciones, seguimiento de procesos, cache de matchs, métricas nuevas.