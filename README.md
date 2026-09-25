# Buscador Inteligente de Convocatorias

Sistema web que busca convocatorias laborales, filtra ofertas con condiciones configuradas
por el usuario, evalúa compatibilidad con IA y genera CVs adaptados a cada oferta
**sin inventar información**.

## Flujo principal

```
Registrate → Carga tu perfil y CV → Configura tus preferencias → Selecciona fuentes
   → El sistema recibe ofertas
   → descarta las que no cumplen tus condiciones (filtro duro, sin IA)
   → analiza las restantes con IA y calcula % de compatibilidad
   → te explica por qué y muestra brechas/fortalezas
   → cuando te interesa una oferta, genera un CV adaptado a partir de tu CV base
```

## Estructura

```
├── backend/        API REST (Node + Express + PostgreSQL / Supabase)
├── frontend/       SPA (React + Vite + TypeScript + Tailwind CSS)
├── n8n-workflows/  Workflows JSON de ejemplo para ingesta
├── docs/           Documentación (arquitectura, API, matching, CV, ingesta)
├── vercel.json     Rewrite /api/* → backend (deploy del frontend en Vercel)
└── README.md
```

## Requisitos

- Node.js **≥ 20** (proyecto ESM)
- Un proyecto **Supabase** (opcional para desarrollo local: se puede usar cualquier PostgreSQL)
- npm (cualquier versión moderna)

> **Nota Windows (esta máquina):** la variable de entorno `ComSpec` está corrupta y rompe
> los comandos `npm`/`vite` desde PowerShell. Corrige con:
> `$env:ComSpec = "C:\Windows\System32\cmd.exe"` antes de ejecutarlos, o usa
> `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" <cmd>`.

## Puesta en marcha rápida

### 1. Backend

```bash
cd backend
cp .env.example .env          # y pega tu DATABASE_URL de Supabase
npm install
npm run seed                  # migra el esquema + datos de prueba
npm run dev                   # arranca en http://localhost:4000
```

> **Base de datos:** el backend usa PostgreSQL (Supabase). Pon en `backend/.env` la cadena
> del **Session pooler** (puerto 5432, formato `aws-0-<region>.pooler.supabase.com`); la
> conexión directa `db.<ref>.supabase.co` solo expone IPv6 y falla en redes sin IPv6.
> Las tablas se crean en el schema `convocatorias` (no toca lo que ya exista en Supabase).
> Sin `OPENAI_API_KEY`, el sistema usa un **modo mock** determinístico para demostrar
> matching y CV adaptado sin costos.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                   # arranca en http://localhost:5173
```

Abrir http://localhost:5173 y entrar con el usuario de prueba:

```
Email:    prueba@demo.com
Password: Demo1234!
```

## Scripts útiles

```bash
cd backend
npm run dev        # servidor con recarga (node --watch)
npm run seed       # reset + crear esquema y datos de prueba
npm start          # servidor en producción
npm run db:reset   # solo borrar y recrear el esquema
```

## Despliegue (producción)

### Backend → Render

1. Conecta el repo de GitHub en **Render → New → Web Service**.
2. Type: **Node**, Build: `npm install`, Start: `npm start`.
3. En **Environment**, agrega:
   - `DATABASE_URL` = cadena **Session pooler** de Supabase (puerto 5432).
   - `DATABASE_SCHEMA=convocatorias`
   - `JWT_SECRET` (genera uno largo al azar)
   - `WEBHOOK_SECRET` (el mismo que usarán los workflows de n8n)
   - `OPENAI_API_KEY` (opcional; vacío = modo mock)
   - `FRONTEND_URL` = URL de tu frontend en Vercel
4. Despliega. En el primer arranque la app corre las migraciones automáticamente.

### Frontend → Vercel (ya conectado)

Edita `vercel.json` en la raíz y reemplaza el valor de `destination` por la URL que
Render te asigne, por ejemplo:

```json
{
  "rewrites": [{ "source": "/api/(.*)", "destination": "https://convocatorias-api.onrender.com/api/$1" }]
}
```

Re-despliega el frontend. Todo el tráfico `/api/*` se reenviará al backend.

### Ingesta (n8n)

Con el backend en producción, los workflows de `n8n-workflows/` deben apuntar a
`POST https://<backend>/api/webhook/ingest` con header `x-webhook-secret`.

## Documentación

- [docs/architecture.md](docs/architecture.md) — decisiones y arquitectura
- [docs/api.md](docs/api.md) — endpoints
- [docs/matching.md](docs/matching.md) — motor de matching y pesos
- [docs/cv-adaptation.md](docs/cv-adaptation.md) — generación de CV adaptado
- [docs/ingestion.md](docs/ingestion.md) — ingesta y n8n

## Estado actual (MVP)

- Autenticación JWT + onboarding en 7 pasos.
- Perfil, configuración de filtros y preferencias de fuentes.
- 6 ofertas de prueba que ejercitan todos los escenarios del motor.
- Filtro duro determinístico → matching IA → score → justificación → notificación por umbral.
- Generación de CV adaptado bajo demanda, con historial de versiones.
- Webhook de ingesta validado + workflows de n8n de ejemplo.
- Las fuentes reales de scraping aún no están activas: se marcan como `placeholder`.