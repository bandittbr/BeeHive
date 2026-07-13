/**
 * Schema SQLite para o módulo Cortes Youtube (Shorts).
 *
 * Tabelas para agentes, redes sociais, pipeline, clipes, publicação e métricas.
 */

export const SHORTS_SCHEMA = `
-- Agentes (criadores de conteúdo)
CREATE TABLE IF NOT EXISTS shorts_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  niche TEXT DEFAULT '',
  default_provider_id TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Redes sociais conectadas ao agent
CREATE TABLE IF NOT EXISTS shorts_agent_social (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES shorts_agents(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK(platform IN ('youtube', 'tiktok', 'instagram')),
  account_name TEXT DEFAULT '',
  access_token TEXT DEFAULT '',
  refresh_token TEXT DEFAULT '',
  token_expires_at TEXT DEFAULT '',
  connected_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_shorts_social_agent
  ON shorts_agent_social(agent_id);

-- Jobs do pipeline
CREATE TABLE IF NOT EXISTS shorts_pipeline_jobs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES shorts_agents(id) ON DELETE CASCADE,
  youtube_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK(status IN ('queued', 'downloading', 'transcribing', 'analyzing', 'cropping', 'generating_metadata', 'publishing', 'done', 'error')),
  progress INTEGER NOT NULL DEFAULT 0,
  num_clips INTEGER NOT NULL DEFAULT 3,
  provider_id TEXT DEFAULT '',
  language TEXT DEFAULT 'pt',
  error_message TEXT DEFAULT '',
  started_at TEXT DEFAULT '',
  completed_at TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shorts_jobs_agent
  ON shorts_pipeline_jobs(agent_id);

-- Clips gerados
CREATE TABLE IF NOT EXISTS shorts_pipeline_clips (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES shorts_pipeline_jobs(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  hashtags TEXT DEFAULT '[]',
  start_time REAL NOT NULL DEFAULT 0,
  end_time REAL NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  hook_sentence TEXT DEFAULT '',
  virality_reason TEXT DEFAULT '',
  clip_path TEXT DEFAULT '',
  thumbnail_path TEXT DEFAULT '',
  subtitle_path TEXT DEFAULT '',
  duration REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'generated'
    CHECK(status IN ('generated', 'published', 'error')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shorts_clips_job
  ON shorts_pipeline_clips(job_id);
CREATE INDEX IF NOT EXISTS idx_shorts_clips_agent
  ON shorts_pipeline_clips(agent_id);

-- Fila de publicação
CREATE TABLE IF NOT EXISTS shorts_publish_queue (
  id TEXT PRIMARY KEY,
  clip_id TEXT NOT NULL REFERENCES shorts_pipeline_clips(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  scheduled_at TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'publishing', 'published', 'error')),
  error_message TEXT DEFAULT '',
  published_at TEXT DEFAULT '',
  external_post_id TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shorts_queue_agent
  ON shorts_publish_queue(agent_id);

-- Métricas coletadas periodicamente
CREATE TABLE IF NOT EXISTS shorts_metrics (
  id TEXT PRIMARY KEY,
  clip_id TEXT DEFAULT '',
  agent_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  subscribers_gained INTEGER NOT NULL DEFAULT 0,
  collected_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shorts_metrics_agent
  ON shorts_metrics(agent_id);
`;
