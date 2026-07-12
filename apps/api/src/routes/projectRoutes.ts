/**
 * Rotas de Projetos — gerencia diretórios locais como projetos.
 *
 * Permite adicionar, listar, remover e navegar por projetos (pastas locais).
 * Os projetos são salvos no SQLite via DatabaseManager.
 */

import type { Express, Request, Response } from 'express';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { DatabaseManager } from '@beehive/platform';

interface ProjectRecord {
  id: string;
  name: string;
  path: string;
  description: string;
  created_at: number;
  last_accessed_at: number;
  color: string;
  icon: string;
  pinned: number;
  tags: string;
}

export function mountProjectRoutes(app: Express, db: DatabaseManager): void {
  // -----------------------------------------------------------------------
  // GET /api/projects — lista todos os projetos
  // -----------------------------------------------------------------------
  app.get('/api/projects', (_req: Request, res: Response) => {
    try {
      const rows = db.queryAll<ProjectRecord>(
        'SELECT * FROM projects ORDER BY last_accessed_at DESC',
      );
      const projects = rows.map(rowToProject);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar projetos' });
    }
  });

  // -----------------------------------------------------------------------
  // GET /api/projects/settings — configurações completas
  // -----------------------------------------------------------------------
  app.get('/api/projects/settings', (_req: Request, res: Response) => {
    try {
      const rows = db.queryAll<ProjectRecord>(
        'SELECT * FROM projects ORDER BY last_accessed_at DESC',
      );
      const settings = db.queryOne<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'active_project_id'",
      );
      const projects = rows.map(rowToProject);
      res.json({
        projects,
        activeProjectId: settings?.value ?? null,
        areas: [],
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao carregar configurações' });
    }
  });

  // -----------------------------------------------------------------------
  // POST /api/projects/settings — salva configurações
  // -----------------------------------------------------------------------
  app.post('/api/projects/settings', (req: Request, res: Response) => {
    try {
      const { activeProjectId } = req.body as { activeProjectId?: string | null };
      if (activeProjectId !== undefined) {
        db.execute(
          "INSERT OR REPLACE INTO settings (key, value) VALUES ('active_project_id', ?)",
          [activeProjectId ?? ''],
        );
      }
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
  });

  // -----------------------------------------------------------------------
  // GET /api/projects/:id — obtém um projeto
  // -----------------------------------------------------------------------
  app.get('/api/projects/:id', (req: Request, res: Response) => {
    try {
      const row = db.queryOne<ProjectRecord>(
        'SELECT * FROM projects WHERE id = ?',
        [req.params.id],
      );
      if (!row) {
        res.status(404).json({ error: 'Projeto não encontrado' });
        return;
      }
      res.json(rowToProject(row));
    } catch (error) {
      res.status(500).json({ error: 'Erro ao obter projeto' });
    }
  });

  // -----------------------------------------------------------------------
  // POST /api/projects — adiciona um projeto
  // -----------------------------------------------------------------------
  app.post('/api/projects', (req: Request, res: Response) => {
    try {
      const { path: projectPath, name } = req.body as { path?: string; name?: string };

      if (!projectPath) {
        res.status(400).json({ error: 'Caminho é obrigatório' });
        return;
      }

      const resolvedPath = resolve(projectPath);

      if (!existsSync(resolvedPath)) {
        res.status(400).json({ error: `Diretório não encontrado: ${resolvedPath}` });
        return;
      }

      const stat = statSync(resolvedPath);
      if (!stat.isDirectory()) {
        res.status(400).json({ error: 'O caminho deve ser um diretório' });
        return;
      }

      const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const folderName = name || resolvedPath.split(/[\\/]/).pop() || 'Projeto';
      const now = Date.now();

      db.execute(
        `INSERT INTO projects (id, name, path, description, created_at, last_accessed_at, color, icon, pinned, tags)
         VALUES (?, ?, ?, '', ?, ?, '', '📁', 0, '')`,
        [id, folderName, resolvedPath, now, now],
      );

      const project: ProjectRecord = {
        id,
        name: folderName,
        path: resolvedPath,
        description: '',
        created_at: now,
        last_accessed_at: now,
        color: '',
        icon: '📁',
        pinned: 0,
        tags: '',
      };

      res.json(rowToProject(project));
    } catch (error) {
      res.status(500).json({ error: 'Erro ao adicionar projeto' });
    }
  });

  // -----------------------------------------------------------------------
  // POST /api/projects/active — define projeto ativo
  // -----------------------------------------------------------------------
  app.post('/api/projects/active', (req: Request, res: Response) => {
    try {
      const { id } = req.body as { id?: string | null };

      if (id) {
        db.execute(
          "INSERT OR REPLACE INTO settings (key, value) VALUES ('active_project_id', ?)",
          [id],
        );
        db.execute(
          'UPDATE projects SET last_accessed_at = ? WHERE id = ?',
          [Date.now(), id],
        );
      } else {
        db.execute(
          "INSERT OR REPLACE INTO settings (key, value) VALUES ('active_project_id', '')",
        );
      }

      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao definir projeto ativo' });
    }
  });

  // -----------------------------------------------------------------------
  // POST /api/projects/:id — atualiza um projeto
  // -----------------------------------------------------------------------
  app.post('/api/projects/:id', (req: Request, res: Response) => {
    try {
      const { name, description, color, icon, pinned } = req.body as {
        name?: string;
        description?: string;
        color?: string;
        icon?: string;
        pinned?: boolean;
      };

      const updates: string[] = [];
      const params: unknown[] = [];

      if (name !== undefined) { updates.push('name = ?'); params.push(name); }
      if (description !== undefined) { updates.push('description = ?'); params.push(description); }
      if (color !== undefined) { updates.push('color = ?'); params.push(color); }
      if (icon !== undefined) { updates.push('icon = ?'); params.push(icon); }
      if (pinned !== undefined) { updates.push('pinned = ?'); params.push(pinned ? 1 : 0); }

      if (updates.length === 0) {
        res.status(400).json({ error: 'Nenhum campo para atualizar' });
        return;
      }

      params.push(req.params.id);
      db.execute(
        `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`,
        params,
      );

      const row = db.queryOne<ProjectRecord>(
        'SELECT * FROM projects WHERE id = ?',
        [req.params.id],
      );
      if (!row) {
        res.status(404).json({ error: 'Projeto não encontrado' });
        return;
      }

      res.json(rowToProject(row));
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar projeto' });
    }
  });

  // -----------------------------------------------------------------------
  // DELETE /api/projects/:id — remove um projeto
  // -----------------------------------------------------------------------
  app.delete('/api/projects/:id', (req: Request, res: Response) => {
    try {
      db.execute('DELETE FROM projects WHERE id = ?', [req.params.id]);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao remover projeto' });
    }
  });

  // -----------------------------------------------------------------------
  // GET /api/projects/:id/files — lista arquivos de um projeto
  // -----------------------------------------------------------------------
  app.get('/api/projects/:id/files', (req: Request, res: Response) => {
    try {
      const row = db.queryOne<ProjectRecord>(
        'SELECT * FROM projects WHERE id = ?',
        [req.params.id],
      );
      if (!row) {
        res.status(404).json({ error: 'Projeto não encontrado' });
        return;
      }

      const basePath = row.path;
      const subPath = req.query.path as string | undefined;
      const targetPath = subPath ? join(basePath, subPath) : basePath;

      if (!existsSync(targetPath)) {
        res.status(404).json({ error: `Diretório não encontrado: ${targetPath}` });
        return;
      }

      const entries = readdirSync(targetPath);
      const files = entries
        .filter((entry) => !entry.startsWith('.') && entry !== 'node_modules')
        .map((entry) => {
          const fullPath = join(targetPath, entry);
          try {
            const stats = statSync(fullPath);
            return {
              name: entry,
              path: subPath ? join(subPath, entry) : entry,
              type: stats.isDirectory() ? 'directory' : 'file' as const,
              size: stats.isFile() ? stats.size : undefined,
              modifiedAt: stats.mtimeMs,
            };
          } catch {
            return {
              name: entry,
              path: subPath ? join(subPath, entry) : entry,
              type: 'file' as const,
            };
          }
        })
        .sort((a, b) => {
          // Diretórios primeiro
          if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

      res.json(files);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar arquivos' });
    }
  });

  // -----------------------------------------------------------------------
  // GET /api/projects/:id/read — lê conteúdo de um arquivo
  // -----------------------------------------------------------------------
  app.get('/api/projects/:id/read', (req: Request, res: Response) => {
    try {
      const row = db.queryOne<ProjectRecord>(
        'SELECT * FROM projects WHERE id = ?',
        [req.params.id],
      );
      if (!row) {
        res.status(404).json({ error: 'Projeto não encontrado' });
        return;
      }

      const filePath = req.query.path as string;
      if (!filePath) {
        res.status(400).json({ error: 'Parâmetro path é obrigatório' });
        return;
      }

      const fullPath = join(row.path, filePath);

      if (!existsSync(fullPath)) {
        res.status(404).json({ error: `Arquivo não encontrado: ${fullPath}` });
        return;
      }

      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        res.status(400).json({ error: 'O caminho é um diretório' });
        return;
      }

      // Limite de 1MB para leitura
      if (stats.size > 1_048_576) {
        res.status(413).json({ error: 'Arquivo muito grande para leitura (máx 1MB)' });
        return;
      }

      const content = readFileSync(fullPath, 'utf-8');
      res.json({ content });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao ler arquivo' });
    }
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToProject(row: ProjectRecord) {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    description: row.description || undefined,
    createdAt: row.created_at,
    lastAccessedAt: row.last_accessed_at,
    color: row.color || undefined,
    icon: row.icon || '📁',
    pinned: row.pinned === 1,
    tags: row.tags ? row.tags.split(',').filter(Boolean) : undefined,
  };
}
