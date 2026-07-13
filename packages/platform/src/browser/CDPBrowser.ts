import { BaseBrowserInstance } from './BaseBrowserInstance';
import { BaseTab } from './BaseTab';
import type {
  IBrowserTab,
  ScreenshotOptions,
  TabState,
} from './types';

/**
 * CDPBrowser — implementação de navegador via Chrome DevTools Protocol.
 *
 * Conecta a um navegador existente via CDP (Chrome, Chromium, Edge, etc.)
 * sem precisar do Playwright. Útil para conectar a navegadores já abertos
 * ou em modo de depuração remota.
 */
export class CDPBrowser extends BaseBrowserInstance {
  private connection: any = null;
  private _debugUrl: string | undefined;

  async start(): Promise<void> {
    if (this._state === 'running') return;
    this._state = 'starting';

    try {
      const port = this.config.cdpPort ?? 9222;

      if (this.config.executablePath) {
        // Inicia o navegador com CDP ativado
        const { spawn } = await import('node:child_process');
        const args = [
          `--remote-debugging-port=${port}`,
          '--no-first-run',
          '--no-default-browser-check',
          ...(this.config.headless !== false ? ['--headless'] : []),
          ...(this.config.args ?? []),
        ];

        spawn(this.config.executablePath, args, {
          stdio: 'ignore',
          detached: true,
        });

        // Aguarda o navegador iniciar
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      this._debugUrl = `http://127.0.0.1:${port}`;
      this.connection = await this.connectCDP();
      this._startedAt = Date.now();
      this._state = 'running';
    } catch (error) {
      this._state = 'stopped';
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this._state !== 'running') return;
    this._state = 'stopping';

    try {
      for (const tab of this._tabs.values()) {
        await tab.close().catch(() => {});
      }
      this._tabs.clear();

      if (this.connection) {
        await this.connection.close().catch(() => {});
        this.connection = null;
      }

      this._state = 'stopped';
      this._startedAt = null;
    } catch {
      this._state = 'stopped';
    }
  }

  async newTab(url?: string): Promise<IBrowserTab> {
    if (!this.connection) {
      throw new Error('Conexão CDP não estabelecida');
    }

    const { Target } = this.connection;
    const targetId = await Target.createTarget({ url: url || 'about:blank' });
    const tabId = `cdp_tab_${targetId}`;

    const tab = new CDPTab(tabId, this.connection, targetId, this.config.defaultTimeout ?? 30000);
    this.registerTab(tab);
    return tab;
  }

  getDebugUrl(): string | undefined {
    return this._debugUrl;
  }

  private async connectCDP(): Promise<any> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const CDP = require('chrome-remote-interface');
      return await CDP({ host: '127.0.0.1', port: this.config.cdpPort ?? 9222 });
    } catch {
      throw new Error(
        'chrome-remote-interface não está instalado. Execute: npm install chrome-remote-interface',
      );
    }
  }
}

/**
 * CDPTab — implementação de uma aba via CDP.
 */
class CDPTab extends BaseTab {
  private targetId: string;
  private timeout: number;
  private client: any = null;
  private _url: string = '';
  private _title: string = '';
  private _state: TabState = 'open';

  constructor(id: string, _connection: any, targetId: string, timeout: number) {
    super(id);
    this.targetId = targetId;
    this.timeout = timeout;
  }

  private async ensureClient(): Promise<void> {
    if (!this.client) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const CDP = require('chrome-remote-interface');
      this.client = await CDP({ target: this.targetId });
      await this.client.Page.enable();
      await this.client.Runtime.enable();
    }
  }

  get url(): string { return this._url; }
  get title(): string { return this._title; }
  get state(): TabState { return this._state; }

  async navigate(url: string): Promise<void> {
    await this.ensureClient();
    this._state = 'loading';
    await this.client.Page.navigate({ url });
    // Aguarda o carregamento
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), this.timeout);
      this.client.Page.on('loadEventFired', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    this._url = url;
    this._state = 'open';
  }

  async reload(): Promise<void> {
    await this.ensureClient();
    await this.client.Page.reload();
  }

  async goBack(): Promise<void> {
    // CDP não tem goBack direto, usamos evaluate
    await this.evaluate('window.history.back()');
  }

  async goForward(): Promise<void> {
    await this.evaluate('window.history.forward()');
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close().catch(() => {});
      this.client = null;
    }
    this._state = 'closed';
  }

  async getContent(): Promise<string> {
    await this.ensureClient();
    const result = await this.client.Runtime.evaluate({
      expression: 'document.documentElement.outerHTML',
    });
    return result.result.value as string;
  }

  async getText(): Promise<string> {
    await this.ensureClient();
    const result = await this.client.Runtime.evaluate({
      expression: 'document.body.innerText',
    });
    return result.result.value as string;
  }

  async getTitle(): Promise<string> {
    await this.ensureClient();
    const result = await this.client.Runtime.evaluate({
      expression: 'document.title',
    });
    this._title = result.result.value as string;
    return this._title;
  }

  async getUrl(): Promise<string> {
    await this.ensureClient();
    const result = await this.client.Runtime.evaluate({
      expression: 'window.location.href',
    });
    this._url = result.result.value as string;
    return this._url;
  }

  async screenshot(options?: ScreenshotOptions): Promise<Buffer> {
    await this.ensureClient();
    const result = await this.client.Page.captureScreenshot({
      format: options?.type ?? 'png',
      quality: options?.quality,
      fullPage: options?.fullPage,
      fromSurface: true,
    });
    return Buffer.from(result.data, 'base64');
  }

  async evaluate<T = unknown>(script: string): Promise<T> {
    await this.ensureClient();
    const result = await this.client.Runtime.evaluate({
      expression: script,
      awaitPromise: true,
    });
    return result.result.value as T;
  }

  async waitForSelector(selector: string, timeout?: number): Promise<void> {
    const start = Date.now();
    const maxWait = timeout ?? this.timeout;
    while (Date.now() - start < maxWait) {
      const result = await this.evaluate(
        `document.querySelector('${selector}') !== null`,
      );
      if (result) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`Seletor não encontrado após ${maxWait}ms: ${selector}`);
  }

  async click(selector: string): Promise<void> {
    await this.evaluate(`
      const el = document.querySelector('${selector}');
      if (el) el.click();
    `);
  }

  async fill(selector: string, value: string): Promise<void> {
    await this.evaluate(`
      const el = document.querySelector('${selector}');
      if (el) {
        el.value = '${value.replace(/'/g, "\\'")}';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
  }

  async getTextContent(selector: string): Promise<string> {
    const result = await this.evaluate<string>(
      `document.querySelector('${selector}')?.textContent ?? ''`,
    );
    return result;
  }
}
