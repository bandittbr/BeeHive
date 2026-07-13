import { BasePlugin } from '../BasePlugin';
import { BrowserManager } from '../../browser/BrowserManager';
import type { PluginContext, PluginManifest } from '../types';

export interface BrowserPluginConfig {
  /** Navegador padrão: chrome, chromium, firefox, obscura */
  defaultBrowser?: string;
  /** Modo de automação: playwright, cdp */
  automationMode?: string;
  /** Porta para depuração remota */
  remoteDebugPort?: number;
  /** Headless mode */
  headless?: boolean;
}

/**
 * Browser Plugin — gerenciador de navegadores.
 *
 * Permite trocar de navegador sem alterar os agentes. Suporta Chrome,
 * Chromium, Obscura e Firefox com automação via Playwright ou CDP.
 *
 * Integra o BrowserManager ao Kernel, registrando comandos e serviços
 * para que agentes e outros plugins possam controlar navegadores.
 */
export class BrowserPlugin extends BasePlugin {
  readonly manifest: PluginManifest = {
    id: 'browser',
    name: 'Browser Manager',
    version: '1.0.0',
    description: 'Gerenciador de navegadores (Chrome, Chromium, Obscura, Firefox)',
    permissions: ['browser.control', 'process.exec'],
    dependencies: ['playwright'],
    commands: [
      'browser.launch',
      'browser.close',
      'browser.navigate',
      'browser.screenshot',
      'browser.list',
      'browser.tabs',
    ],
    events: [
      'browser.launched',
      'browser.closed',
      'browser.navigated',
      'browser.tab.created',
      'browser.tab.closed',
    ],
  };

  private manager: BrowserManager | null = null;

  get browserManager(): BrowserManager {
    if (!this.manager) {
      throw new Error('BrowserManager não inicializado');
    }
    return this.manager;
  }

  protected async onActivate(context: PluginContext): Promise<void> {
    const config = this.config as BrowserPluginConfig;
    this.manager = new BrowserManager();

    // Registra o BrowserManager como serviço no Kernel
    const kernelService = context.getService<{ registerService: (id: string, svc: any) => void }>('kernel');
    if (kernelService?.registerService) {
      kernelService.registerService('browser.manager', this.manager);
    }

    // Registra comandos
    context.registerCommand('browser.launch', async (payload: any) => {
      const instance = await this.manager!.launch({
        type: payload?.type ?? config.defaultBrowser ?? 'chromium',
        automation: payload?.automation ?? (config.automationMode as any) ?? 'playwright',
        config: {
          headless: payload?.headless ?? config.headless ?? true,
          cdpPort: payload?.cdpPort ?? config.remoteDebugPort ?? 9222,
        },
      });
      context.emit('browser.launched', { instanceId: instance.id, type: instance.type });
      return { instanceId: instance.id };
    });

    context.registerCommand('browser.close', async (payload: any) => {
      await this.manager!.stopInstance(payload?.instanceId);
      context.emit('browser.closed', { instanceId: payload?.instanceId });
    });

    context.registerCommand('browser.list', async () => {
      return this.manager!.snapshots();
    });

    context.registerCommand('browser.tabs', async (payload: any) => {
      const instance = this.manager!.getInstance(payload?.instanceId);
      if (!instance) throw new Error('Instância não encontrada');
      const tabs = await instance.tabs();
      return tabs.map((t) => ({ id: t.id, url: t.url, title: t.title, state: t.state }));
    });

    context.registerCommand('browser.navigate', async (payload: any) => {
      const instance = this.manager!.getInstance(payload?.instanceId);
      if (!instance) throw new Error('Instância não encontrada');
      const tab = payload?.tabId
        ? await instance.getTab(payload.tabId)
        : (await instance.tabs())[0];
      if (!tab) throw new Error('Nenhuma aba disponível');
      await tab.navigate(payload.url);
      context.emit('browser.navigated', { url: payload.url, tabId: tab.id });
    });

    context.registerCommand('browser.screenshot', async (payload: any) => {
      const instance = this.manager!.getInstance(payload?.instanceId);
      if (!instance) throw new Error('Instância não encontrada');
      const tab = payload?.tabId
        ? await instance.getTab(payload.tabId)
        : (await instance.tabs())[0];
      if (!tab) throw new Error('Nenhuma aba disponível');
      const buffer = await tab.screenshot(payload?.options);
      return buffer.toString('base64');
    });

    context.log('info', 'Browser Manager ativado', {
      defaultBrowser: config.defaultBrowser ?? 'chromium',
      automationMode: config.automationMode ?? 'playwright',
    });
  }

  protected async onDeactivate(context: PluginContext): Promise<void> {
    if (this.manager) {
      await this.manager.stopAll();
      this.manager = null;
    }
    context.log('info', 'Browser Manager desativado');
  }
}
