/**
 * Rotas do Browser Manager — API REST para gerenciar perfis e instâncias de navegador.
 */

import type { Express } from 'express';
import type { DatabaseManager } from '@beehive/platform/server';
import { BrowserProfileStore } from '@beehive/platform/browser';
import { BrowserManager } from '@beehive/platform/browser';
import { BrowserFactory } from '@beehive/platform/browser';

let _browserManager: ReturnType<typeof createBrowserManager> | null = null;

function createBrowserManager(db: DatabaseManager) {
  const profileStore = new BrowserProfileStore(db);
  const factory = new BrowserFactory();
  const manager = new BrowserManager(factory);

  return { manager, profileStore };
}

export function mountBrowserRoutes(app: Express, db: DatabaseManager): void {
  // Inicializa gerenciador
  if (!_browserManager) {
    _browserManager = createBrowserManager(db);
  }

  const { manager, profileStore } = _browserManager!;

  // ===== Perfis =====

  // POST /api/browser/profiles — cria perfil
  app.post('/api/browser/profiles', async (req, res) => {
    try {
      const { name, browserType, userDataDir, proxy, viewportWidth, viewportHeight, userAgent } = req.body;

      if (!name || !userDataDir) {
        return res.status(400).json({ error: 'name e userDataDir são obrigatórios' });
      }

      const profile = profileStore.create({
        name,
        browserType,
        userDataDir,
        proxy,
        viewportWidth,
        viewportHeight,
        userAgent,
      });

      res.status(201).json(profile);
    } catch (err) {
      console.error('[browser] Erro ao criar perfil:', err);
      res.status(500).json({ error: 'Erro ao criar perfil' });
    }
  });

  // GET /api/browser/profiles — lista perfis
  app.get('/api/browser/profiles', async (_req, res) => {
    try {
      const profiles = profileStore.list();
      res.json(profiles);
    } catch (err) {
      console.error('[browser] Erro ao listar perfis:', err);
      res.status(500).json({ error: 'Erro ao listar perfis' });
    }
  });

  // GET /api/browser/profiles/:id — obtém perfil
  app.get('/api/browser/profiles/:id', async (req, res) => {
    try {
      const profile = profileStore.getById(req.params.id);
      if (!profile) {
        return res.status(404).json({ error: 'Perfil não encontrado' });
      }
      res.json(profile);
    } catch (err) {
      console.error('[browser] Erro ao obter perfil:', err);
      res.status(500).json({ error: 'Erro ao obter perfil' });
    }
  });

  // PATCH /api/browser/profiles/:id — atualiza perfil
  app.patch('/api/browser/profiles/:id', async (req, res) => {
    try {
      const { name, proxy, viewportWidth, viewportHeight, userAgent, cookies, localStorage, metadata } = req.body;

      const ok = profileStore.update(req.params.id, {
        name,
        proxy,
        viewportWidth,
        viewportHeight,
        userAgent,
        cookies,
        localStorage,
        metadata,
      });

      if (!ok) {
        return res.status(404).json({ error: 'Perfil não encontrado' });
      }

      const profile = profileStore.getById(req.params.id);
      res.json(profile);
    } catch (err) {
      console.error('[browser] Erro ao atualizar perfil:', err);
      res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
  });

  // DELETE /api/browser/profiles/:id — deleta perfil
  app.delete('/api/browser/profiles/:id', async (req, res) => {
    try {
      profileStore.delete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error('[browser] Erro ao deletar perfil:', err);
      res.status(500).json({ error: 'Erro ao deletar perfil' });
    }
  });

  // POST /api/browser/profiles/:id/cookies — atualiza cookies
  app.post('/api/browser/profiles/:id/cookies', async (req, res) => {
    try {
      const { cookies } = req.body;
      if (!Array.isArray(cookies)) {
        return res.status(400).json({ error: 'cookies deve ser um array' });
      }
      profileStore.updateCookies(req.params.id, cookies);
      res.json({ success: true });
    } catch (err) {
      console.error('[browser] Erro ao atualizar cookies:', err);
      res.status(500).json({ error: 'Erro ao atualizar cookies' });
    }
  });

  // POST /api/browser/profiles/:id/local-storage — atualiza localStorage
  app.post('/api/browser/profiles/:id/local-storage', async (req, res) => {
    try {
      const { storage } = req.body;
      if (!storage || typeof storage !== 'object') {
        return res.status(400).json({ error: 'storage deve ser um objeto' });
      }
      profileStore.updateLocalStorage(req.params.id, req.body.storage);
      res.json({ success: true });
    } catch (err) {
      console.error('[browser] Erro ao atualizar localStorage:', err);
      res.status(500).json({ error: 'Erro ao atualizar localStorage' });
    }
  });

  // ===== Instâncias (runtime) =====

  // POST /api/browser/instances — inicia instância
  app.post('/api/browser/instances', async (req, res) => {
    try {
      const { type, automation, config } = req.body;

      const instance = await manager.launch({
        type: type ?? 'chromium',
        automation: automation ?? 'playwright',
        config: {
          headless: true,
          viewport: { width: 1280, height: 720 },
          ...config,
        },
      });

      res.status(201).json({
        id: instance.id,
        type: instance.type,
        automation: instance.automation,
        state: instance.state,
        config: instance.config,
        debugUrl: instance.getDebugUrl(),
      });
    } catch (err) {
      console.error('[browser] Erro ao iniciar instância:', err);
      res.status(500).json({ error: 'Erro ao iniciar instância' });
    }
  });

  // GET /api/browser/instances — lista instâncias
  app.get('/api/browser/instances', async (_req, res) => {
    try {
      const instances = manager.listInstances().map((i) => ({
        id: i.id,
        type: i.type,
        automation: i.automation,
        state: i.state,
        config: i.config,
        debugUrl: i.getDebugUrl(),
        metrics: i.metrics(),
      }));
      res.json(instances);
    } catch (err) {
      console.error('[browser] Erro ao listar instâncias:', err);
      res.status(500).json({ error: 'Erro ao listar instâncias' });
    }
  });

  // GET /api/browser/instances/:id — obtém instância
  app.get('/api/browser/instances/:id', async (req, res) => {
    try {
      const instance = manager.getInstance(req.params.id);
      if (!instance) {
        return res.status(404).json({ error: 'Instância não encontrada' });
      }
      res.json({
        id: instance.id,
        type: instance.type,
        automation: instance.automation,
        state: instance.state,
        config: instance.config,
        debugUrl: instance.getDebugUrl(),
        metrics: instance.metrics(),
      });
    } catch (err) {
      console.error('[browser] Erro ao obter instância:', err);
      res.status(500).json({ error: 'Erro ao obter instância' });
    }
  });

  // POST /api/browser/instances/:id/tabs — abre nova aba
  app.post('/api/browser/instances/:id/tabs', async (req, res) => {
    try {
      const { url } = req.body;
      const instance = manager.getInstance(req.params.id);
      if (!instance) {
        return res.status(404).json({ error: 'Instância não encontrada' });
      }

      const tab = await instance.newTab(url);
      res.status(201).json({
        id: tab.id,
        url: tab.url,
        title: tab.title,
        state: tab.state,
      });
    } catch (err) {
      console.error('[browser] Erro ao abrir aba:', err);
      res.status(500).json({ error: 'Erro ao abrir aba' });
    }
  });

  // GET /api/browser/instances/:id/tabs — lista abas
  app.get('/api/browser/instances/:id/tabs', async (req, res) => {
    try {
      const instance = manager.getInstance(req.params.id);
      if (!instance) {
        return res.status(404).json({ error: 'Instância não encontrada' });
      }

      const tabs = await instance.tabs();
      res.json(
        tabs.map((t) => ({
          id: t.id,
          url: t.url,
          title: t.title,
          state: t.state,
        })),
      );
    } catch (err) {
      console.error('[browser] Erro ao listar abas:', err);
      res.status(500).json({ error: 'Erro ao listar abas' });
    }
  });

  // POST /api/browser/instances/:id/tabs/:tabId/navigate — navega aba
  app.post('/api/browser/instances/:id/tabs/:tabId/navigate', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'url é obrigatória' });
      }

      const instance = manager.getInstance(req.params.id);
      if (!instance) {
        return res.status(404).json({ error: 'Instância não encontrada' });
      }

      const tab = await instance.getTab(req.params.tabId);
      if (!tab) {
        return res.status(404).json({ error: 'Aba não encontrada' });
      }

      await tab.navigate(url);
      res.json({ success: true, url: tab.url, title: tab.title });
    } catch (err) {
      console.error('[browser] Erro ao navegar:', err);
      res.status(500).json({ error: 'Erro ao navegar' });
    }
  });

  // POST /api/browser/instances/:id/tabs/:tabId/action — ação na aba
  app.post('/api/browser/instances/:id/tabs/:tabId/action', async (req, res) => {
    try {
      const { action, selector, value } = req.body;
      const instance = manager.getInstance(req.params.id);
      if (!instance) {
        return res.status(404).json({ error: 'Instância não encontrada' });
      }

      const tab = await instance.getTab(req.params.tabId);
      if (!tab) {
        return res.status(404).json({ error: 'Aba não encontrada' });
      }

      let result: unknown;
      switch (action) {
        case 'click':
          await tab.click(selector);
          result = { success: true };
          break;
        case 'fill':
          await tab.fill(selector, value);
          result = { success: true };
          break;
        case 'waitForSelector':
          await tab.waitForSelector(selector);
          result = { success: true };
          break;
        case 'screenshot':
          const buf = await tab.screenshot(req.body.options);
          result = { success: true, screenshot: buf.toString('base64') };
          break;
        case 'evaluate':
          result = await tab.evaluate(req.body.script);
          break;
        case 'getContent':
          result = { content: await tab.getContent() };
          break;
        case 'getText':
          result = { text: await tab.getText() };
          break;
        default:
          return res.status(400).json({ error: `Ação desconhecida: ${action}` });
      }

      res.json(result);
    } catch (err) {
      console.error('[browser] Erro na ação:', err);
      res.status(500).json({ error: 'Erro na ação' });
    }
  });

  // DELETE /api/browser/instances/:id — para instância
  app.delete('/api/browser/instances/:id', async (req, res) => {
    try {
      await manager.stopInstance(req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error('[browser] Erro ao parar instância:', err);
      res.status(500).json({ error: 'Erro ao parar instância' });
    }
  });

  // POST /api/browser/instances/from-profile/:profileId — inicia instância a partir de perfil
  app.post('/api/browser/instances/from-profile/:profileId', async (req, res) => {
    try {
      const profile = profileStore.getById(req.params.profileId);
      if (!profile) {
        return res.status(404).json({ error: 'Perfil não encontrado' });
      }

      const instance = await manager.launch({
        type: 'chromium',
        automation: 'playwright',
        config: {
          headless: req.body.headless ?? true,
          viewport: { width: profile.viewportWidth, height: profile.viewportHeight },
          userDataDir: profile.userDataDir,
          proxy: profile.proxy || undefined,
          userAgent: profile.userAgent || undefined,
        },
      });

      // Marca perfil como usado
      profileStore.touch(profile.id);

      res.status(201).json({
        id: instance.id,
        type: instance.type,
        automation: instance.automation,
        state: instance.state,
        config: instance.config,
        debugUrl: instance.getDebugUrl(),
      });
    } catch (err) {
      console.error('[browser] Erro ao iniciar instância do perfil:', err);
      res.status(500).json({ error: 'Erro ao iniciar instância do perfil' });
    }
  });
}