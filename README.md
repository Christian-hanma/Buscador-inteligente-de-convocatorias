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
├── backend/        API REST (Node + Express + SQLite vía node:sqlite)
├── frontend/       SPA (React + Vite + TypeScript + Tailwind CSS)
├── n8n-workflows/  Workflows JSON de ejemplo para ingesta
├── docs/           Documentación (arquitectura, API, matching, CV, ingesta)
└── README.md
```

## Requisitos

- Node.js **≥ 22.13** (se usa el módulo nativo `node:sqlite`)
- npm (cualquier versión moderna)

> **Nota Windows (esta máquina):** la variable de entorno `ComSpec` está corrupta y rompe
> los comandos `npm`/`vite` desde PowerShell. Corrige con:
> `$env:ComSpec = "C:\Windows\System32\cmd.exe"` antes de ejecutarlos, o usa
> `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" <cmd>`.

## Puesta en marcha rápida

### 1. Backend

```bash
cd backend
cp .env.example .env          # editar si se desea, no es obligatorio para prueba
npm install
npm run seed                  # crea esquema + datos de prueba
npm run dev                   # arranca en http://localhost:4000
```

> Si no hay `OPENAI_API_KEY`, el sistema usa un **modo mock** determinístico para poder
> demostrar matching y CV adaptado sin costos. Con una clave real, edita `.env`
> (`OPENAI_MODEL`, `OPENAI_API_KEY`).

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
```

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