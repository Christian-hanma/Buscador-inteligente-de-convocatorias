-- ============================================================
-- Buscador Inteligente de Convocatorias — Schema SQLite
-- Este esquema es el origen de verdad del MVP. Para migrar a
-- PostgreSQL/Supabase se traslada 1:1 (ver docs/architecture.md).
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  nombre_completo    TEXT,
  carrera            TEXT,
  nivel_estudios     TEXT,
  cv_texto           TEXT,
  experiencia        TEXT,
  ubicacion_actual   TEXT,
  telefono           TEXT,
  email_cv           TEXT,
  linkedin           TEXT,
  informacion_adicional TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS config_filtros (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id               INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  sueldo_minimo         INTEGER,
  sueldo_maximo         INTEGER,
  radio_zona            INTEGER,
  ubicaciones_preferidas TEXT NOT NULL DEFAULT '[]',
  duracion_min_meses    INTEGER,
  duracion_max_meses    INTEGER,
  excluir_penalizaciones INTEGER NOT NULL DEFAULT 0,
  modalidad             TEXT,
  tipo_contrato         TEXT,
  umbral_notificacion   INTEGER NOT NULL DEFAULT 70,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS job_sources (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  key              TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  description      TEXT,
  type             TEXT NOT NULL DEFAULT 'public',
  base_url         TEXT,
  is_active        INTEGER NOT NULL DEFAULT 1,
  is_default       INTEGER NOT NULL DEFAULT 0,
  ingestion_method TEXT NOT NULL DEFAULT 'N8N',
  status           TEXT NOT NULL DEFAULT 'placeholder',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_job_sources (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_id  INTEGER NOT NULL REFERENCES job_sources(id) ON DELETE CASCADE,
  enabled    INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, source_id)
);

CREATE TABLE IF NOT EXISTS job_offers (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id        INTEGER REFERENCES job_sources(id) ON DELETE SET NULL,
  external_id      TEXT,
  titulo           TEXT NOT NULL,
  entidad          TEXT,
  sueldo           INTEGER,
  ubicacion        TEXT,
  modalidad        TEXT,
  tipo_contrato    TEXT,
  duracion         INTEGER,
  penalizacion     INTEGER NOT NULL DEFAULT 0,
  fuente           TEXT,
  source_url       TEXT,
  fecha_publicacion TEXT,
  fecha_cierre     TEXT,
  texto_completo   TEXT,
  status           TEXT NOT NULL DEFAULT 'active',
  es_demo          INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_id, external_id)
);

CREATE TABLE IF NOT EXISTS match_results (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer_id              INTEGER NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
  porcentaje_compatibilidad INTEGER NOT NULL DEFAULT 0,
  via_ia                INTEGER NOT NULL DEFAULT 0,
  filtro_resultado      TEXT,
  justificacion_ia      TEXT,
  brechas               TEXT,
  fortalezas            TEXT,
  criterios_evaluados   TEXT,
  notificado            INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, offer_id)
);

CREATE TABLE IF NOT EXISTS generated_cvs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer_id        INTEGER REFERENCES job_offers(id) ON DELETE SET NULL,
  base_profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  version         INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'generated',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_job_offers_status  ON job_offers(status);
CREATE INDEX IF NOT EXISTS idx_job_offers_source  ON job_offers(source_id);
CREATE INDEX IF NOT EXISTS idx_matches_user       ON match_results(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_offer      ON match_results(offer_id);
CREATE INDEX IF NOT EXISTS idx_user_sources_user  ON user_job_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_cvs_user           ON generated_cvs(user_id);