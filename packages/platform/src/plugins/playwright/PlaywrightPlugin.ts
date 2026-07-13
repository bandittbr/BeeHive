import { BasePlugin } from '../BasePlugin';
import type { PluginContext, PluginManifest } from '../types';

export interface PlaywrightConfig {
  /** Timeout padrão para operações (ms) */
  defaultTimeout?: number;
  /** Caminho para o executável do Chromium */
  chromiumPath?: string;
  /** Headless mode */
  headless?: boolean;
}

/**
 * Playwright Plugin — automação de navegador via Playwright.
 *
 * Permite controlar navegadores (Chromium, Firefox, WebKit) para automação
 * de páginas web, testes e scraping.
 */
export class PlaywrightPlugin extends BasePlugin {
  readonly manifest: PluginManifest = {
    id: 'playwright',
    name: 'Playwright',
    version: '1.0.0',
    description: 'Automação de navegador via Playwright',
    permissions: ['browser.control', 'network.http'],
    dependencies: [],
    commands: ['playwright.launch', 'playwright.page', 'playwright.screenshot'],
    events: ['playwright.page.created', 'playwright.page.closed'],
  };

  protected async onActivate(context: PluginContext): Promise<void> {
    const config = this.config as PlaywrightConfig;
    context.log('info', 'Playwright plugin ativado', {
      headless: config.headless ?? true,
      defaultTimeout: config.defaultTimeout ?? 30000,
    });
  }

  protected async onDeactivate(context: PluginContext): Promise<void> {
    context.log('info', 'Playwright plugin desativado');
  }
}
