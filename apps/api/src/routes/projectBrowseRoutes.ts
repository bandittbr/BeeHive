import type { Express } from 'express';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function safeReaddir(dirPath: string): { currentPath: string; directories: Array<{ name: string; path: string; isDir: boolean }> } {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const directories = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => ({
      name: e.name,
      path: join(dirPath, e.name),
      isDir: true,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { currentPath: dirPath, directories };
}

export function mountProjectBrowseRoutes(app: Express): void {
  app.get('/api/projects/browse', (_req, res) => {
    try {
      const requestedPath = (_req.query.path as string) || '';

      if (!requestedPath) {
        const roots = ['/app', '/root', '/home', '/tmp'];
        const available = roots.filter((p) => existsSync(p));
        if (available.length > 0) {
          res.json(safeReaddir(available[0]));
        } else {
          res.json({ currentPath: '/', directories: [] });
        }
        return;
      }

      const normalizedPath = requestedPath.replace(/\\/g, '/');

      if (!existsSync(normalizedPath)) {
        res.json({ currentPath: normalizedPath, directories: [] });
        return;
      }

      res.json(safeReaddir(normalizedPath));
    } catch {
      res.json({ currentPath: '/', directories: [] });
    }
  });
}
