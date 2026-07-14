import type { Express } from 'express';
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

export function mountProjectBrowseRoutes(app: Express): void {
  app.get('/api/projects/browse', (req, res) => {
    try {
      const requestedPath = (req.query.path as string) || homedir();
      const fullPath = resolve(requestedPath);

      const entries = readdirSync(fullPath, { withFileTypes: true });
      const directories = entries
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .map((e) => ({
          name: e.name,
          path: join(fullPath, e.name),
          isDir: true,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      res.json({ currentPath: fullPath, directories });
    } catch {
      res.json({ currentPath: req.query.path || '', directories: [] });
    }
  });
}
