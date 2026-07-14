/**
 * Schema SQLite para Browser Manager — perfis persistentes de navegador.
 *
 * Cada perfil guarda cookies, localStorage, cache e estado de login
 * para manter sessões vivas entre reinícios.
 */

export const BROWSER_SCHEMA = `
-- Perfis de navegador (um por identidade/sessão)
CREATE TABLE IF NOT EXISTS browser_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  browser_type TEXT NOT NULL DEFAULT 'chromium',
  user_data_dir TEXT NOT NULL,
  proxy TEXT DEFAULT '',
  viewport_width INTEGER DEFAULT 1280,
  viewport_height INTEGER DEFAULT 720,
  user_agent TEXT DEFAULT '',
  cookies TEXT DEFAULT '[]',
  local_storage TEXT DEFAULT '{}',
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_used_at TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_browser_profiles_name
  ON browser_profiles(name);

-- Histórico de navegação por perfil (opcional, para debugging)
CREATE TABLE IF NOT EXISTS browser_history (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES browser_profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT DEFAULT '',
  visited_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_browser_history_profile
  ON browser_history(profile_id, visited_at);
`;