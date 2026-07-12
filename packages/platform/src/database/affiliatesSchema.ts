/**
 * Schema SQLite para o módulo Afiliados.
 *
 * Tabelas para discovery rules, configurações de automação,
 * produtos, conteúdo gerado e publicações.
 */

export const AFFILIATES_SCHEMA = `
-- Regras de discovery (nichos/categorias para busca de produtos)
CREATE TABLE IF NOT EXISTS discovery_rules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  category TEXT NOT NULL,
  min_price REAL NOT NULL DEFAULT 0,
  max_price REAL NOT NULL DEFAULT 10000,
  min_commission_rate REAL NOT NULL DEFAULT 5,
  min_rating REAL NOT NULL DEFAULT 0,
  affiliate_providers TEXT NOT NULL DEFAULT 'mercado_livre',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- Configurações de automação (kill switch, cadência, etc.)
CREATE TABLE IF NOT EXISTS automation_settings (
  tenant_id TEXT PRIMARY KEY,
  posts_per_day INTEGER NOT NULL DEFAULT 5,
  video_enabled INTEGER NOT NULL DEFAULT 0,
  kill_switch_active INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

-- Produtos descobertos
CREATE TABLE IF NOT EXISTS affiliate_products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  affiliate_provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  price REAL NOT NULL,
  original_price REAL NOT NULL,
  commission_rate REAL NOT NULL,
  rating REAL NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  affiliate_link TEXT NOT NULL DEFAULT '',
  quality_score REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'descoberto',
  discovered_at TEXT NOT NULL
);

-- Conteúdo gerado (legendas, imagens, vídeos)
CREATE TABLE IF NOT EXISTS affiliate_content (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  product_id TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  hashtags TEXT NOT NULL DEFAULT '[]',
  media_type TEXT NOT NULL DEFAULT 'imagem',
  media_urls TEXT NOT NULL DEFAULT '[]',
  ai_provider_used TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'gerado',
  created_at TEXT NOT NULL,
  published_at TEXT
);

-- Publicações em redes sociais
CREATE TABLE IF NOT EXISTS affiliate_publications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  content_id TEXT NOT NULL,
  social_provider TEXT NOT NULL,
  external_post_id TEXT,
  published_at TEXT,
  status TEXT NOT NULL DEFAULT 'publicado',
  error_message TEXT
);

-- Métricas de engajamento
CREATE TABLE IF NOT EXISTS affiliate_metrics (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  publication_id TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  reach INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL
);

-- Logs de auditoria
CREATE TABLE IF NOT EXISTS affiliate_audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  event TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
`;
