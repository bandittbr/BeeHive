/**
 * BrowserProfileStore — persistência de perfis de navegador no SQLite.
 *
 * Gerencia CRUD de perfis (cookies, localStorage, userDataDir, proxy, etc.)
 * para manter sessões vivas entre reinícios.
 */

import type { DatabaseManager } from '../database/DatabaseManager';
import type { BrowserType } from './types';

export interface BrowserProfile {
  id: string;
  name: string;
  browserType: BrowserType;
  userDataDir: string;
  proxy: string;
  viewportWidth: number;
  viewportHeight: number;
  userAgent: string;
  cookies: string;       // JSON array
  localStorage: string;  // JSON object
  metadata: string;      // JSON object
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
}

export interface BrowserProfileInput {
  name: string;
  browserType?: 'chromium' | 'firefox' | 'chrome';
  userDataDir: string;
  proxy?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  userAgent?: string;
}

export class BrowserProfileStore {
  constructor(private readonly dbManager: DatabaseManager) {}

  /** Cria um novo perfil de navegador. */
create(input: {
    name: string;
    browserType?: 'chromium' | 'firefox' | 'chrome';
    userDataDir: string;
    proxy?: string;
    viewportWidth?: number;
    viewportHeight?: number;
    userAgent?: string;
  }): BrowserProfile {
    const id = `bp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const _now = new Date().toISOString();
    const _viewportWidth = input.viewportWidth ?? 1280;
    const _viewportHeight = input.viewportHeight ?? 720;
    const _browserType = input.browserType ?? 'chromium';

    this.dbManager.execute(
      `INSERT INTO browser_profiles (
        id, name, browser_type, user_data_dir, proxy,
        viewport_width, viewport_height, user_agent,
        cookies, local_storage, metadata,
        created_at, updated_at, last_used_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        _browserType,
        input.userDataDir,
        input.proxy ?? '',
        _viewportWidth,
        _viewportHeight,
        input.userAgent ?? '',
        '[]',
        '{}',
        '{}',
        _now,
        _now,
        '',
      ],
    );

    return this.getById(id)!;
  }

  /** Obtém perfil por ID. */
  getById(id: string): BrowserProfile | undefined {
    return this.dbManager.queryOne<BrowserProfile>(
      'SELECT * FROM browser_profiles WHERE id = ?',
      [id],
    );
  }

  /** Obtém perfil por nome. */
  getByName(name: string): BrowserProfile | undefined {
    return this.dbManager.queryOne<BrowserProfile>(
      'SELECT * FROM browser_profiles WHERE name = ?',
      [name],
    );
  }

  /** Lista todos os perfis. */
  list(): BrowserProfile[] {
    return this.dbManager.queryAll<BrowserProfile>(
      'SELECT * FROM browser_profiles ORDER BY created_at DESC',
    );
  }

  /** Atualiza campos do perfil. */
  update(
    id: string,
    patch: Partial<Pick<BrowserProfile, 'name' | 'proxy' | 'viewportWidth' | 'viewportHeight' | 'userAgent' | 'cookies' | 'localStorage' | 'metadata'>>
  ): boolean {
    const sets: string[] = [];
    const params: unknown[] = [];

    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) {
        const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        sets.push(`${col} = ?`);
        params.push(value);
      }
    }

    if (sets.length === 0) return false;

    sets.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    this.dbManager.execute(
      `UPDATE browser_profiles SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );

    return true;
  }

  /** Atualiza cookies do perfil (JSON array). */
  updateCookies(id: string, cookies: unknown[]): void {
    this.dbManager.execute(
      'UPDATE browser_profiles SET cookies = ?, updated_at = ?, last_used_at = ? WHERE id = ?',
      [JSON.stringify(cookies), new Date().toISOString(), new Date().toISOString(), id],
    );
  }

  /** Atualiza localStorage do perfil (JSON object). */
  updateLocalStorage(id: string, storage: Record<string, string>): void {
    this.dbManager.execute(
      'UPDATE browser_profiles SET local_storage = ?, updated_at = ?, last_used_at = ? WHERE id = ?',
      [JSON.stringify(storage), new Date().toISOString(), new Date().toISOString(), id],
    );
  }

  /** Marca perfil como usado recentemente. */
  touch(id: string): void {
    this.dbManager.execute(
      'UPDATE browser_profiles SET last_used_at = ? WHERE id = ?',
      [new Date().toISOString(), id],
    );
  }

  /** Deleta um perfil. */
  delete(id: string): void {
    this.dbManager.execute('DELETE FROM browser_profiles WHERE id = ?', [id]);
  }

  /** Converte perfil salvo para BrowserConfig do runtime. */
  toBrowserConfig(profile: {
    user_data_dir: string;
    proxy: string;
    viewport_width: number;
    viewport_height: number;
    user_agent: string;
  }) {
    return {
      userDataDir: profile.user_data_dir,
      proxy: profile.proxy,
      viewport: {
        width: profile.viewport_width,
        height: profile.viewport_height,
      },
      userAgent: profile.user_agent || '',
    };
  }
}