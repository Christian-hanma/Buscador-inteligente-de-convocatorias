-- ============================================================
-- Buscador Inteligente de Convocatorias — Schema PostgreSQL (Supabase)
-- Todas las tablas viven en el schema `convocatorias` para no
-- mezclarse con otros proyectos del mismo proyecto Supabase.
-- La conexión (backend/src/db/connection.js) fija search_path a
-- `convocatorias, public` vía parámetro `options` de la URL.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS convocatorias;

SET search_path = convocatorias, public;

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         CITEXT   NOT NULL UNIQUE,
  password_hash TEXT     NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  nombre_completo       TEXT,
  carrera               TEXT,
  nivel_estudios        TEXT,
  cv_texto              TEXT,
  experiencia           TEXT,
  ubicacion_actual      TEXT,
  telefono              TEXT,
  email_cv              TEXT,
  linkedin              TEXT,
  informacion_adicional TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS config_filtros (
  id                     SERIAL PRIMARY KEY,
  user_id                INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  sueldo_minimo          INTEGER,
  sueldo_maximo          INTEGER,
  radio_zona             INTEGER,
  ubicaciones_preferidas JSONB NOT NULL DEFAULT '[]'::jsonb,
  duracion_min_meses     INTEGER,
  duracion_max_meses     INTEGER,
  excluir_penalizaciones BOOLEAN NOT NULL DEFAULT false,
  modalidad              TEXT,
  tipo_contrato          TEXT,
  umbral_notificacion    INTEGER NOT NULL DEFAULT 70,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_sources (
  id               SERIAL PRIMARY KEY,
  key              CITEXT  NOT NULL UNIQUE,
  name             TEXT    NOT NULL,
  description      TEXT,
  type             TEXT    NOT NULL DEFAULT 'public',
  base_url         TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  is_default       BOOLEAN NOT NULL DEFAULT false,
  ingestion_method TEXT    NOT NULL DEFAULT 'N8N',
  status           TEXT    NOT NULL DEFAULT 'placeholder',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_job_sources (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_id  INTEGER NOT NULL REFERENCES job_sources(id) ON DELETE CASCADE,
  enabled    BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_id)
);

CREATE TABLE IF NOT EXISTS job_offers (
  id               SERIAL PRIMARY KEY,
  source_id        INTEGER REFERENCES job_sources(id) ON DELETE SET NULL,
  external_id      TEXT,
  titulo           TEXT NOT NULL,
  entidad          TEXT,
  sueldo           INTEGER,
  ubicacion        TEXT,
  modalidad        TEXT,
  tipo_contrato    TEXT,
  duracion         INTEGER,
  penalizacion     BOOLEAN NOT NULL DEFAULT false,
  fuente           TEXT,
  source_url       TEXT,
  fecha_publicacion TEXT,
  fecha_cierre     TEXT,
  texto_completo   TEXT,
  status           TEXT NOT NULL DEFAULT 'active',
  es_demo          BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_id)
);

CREATE TABLE IF NOT EXISTS match_results (
  id                        SERIAL PRIMARY KEY,
  user_id                   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer_id                  INTEGER NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
  porcentaje_compatibilidad INTEGER NOT NULL DEFAULT 0,
  via_ia                    BOOLEAN NOT NULL DEFAULT false,
  filtro_resultado          TEXT,
  justificacion_ia          TEXT,
  brechas                   JSONB NOT NULL DEFAULT '[]'::jsonb,
  fortalezas                JSONB NOT NULL DEFAULT '[]'::jsonb,
  criterios_evaluados       JSONB NOT NULL DEFAULT '{}'::jsonb,
  notificado                BOOLEAN NOT NULL DEFAULT false,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, offer_id)
);

CREATE TABLE IF NOT EXISTS generated_cvs (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer_id        INTEGER REFERENCES job_offers(id) ON DELETE SET NULL,
  base_profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  version         INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'generated',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_offers_status  ON job_offers(status);
CREATE INDEX IF NOT EXISTS idx_job_offers_source  ON job_offers(source_id);
CREATE INDEX IF NOT EXISTS idx_matches_user       ON match_results(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_offer      ON match_results(offer_id);
CREATE INDEX IF NOT EXISTS idx_user_sources_user  ON user_job_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_cvs_user           ON generated_cvs(user_id);