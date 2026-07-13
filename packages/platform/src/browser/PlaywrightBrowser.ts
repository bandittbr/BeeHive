import { BaseBrowserInstance } from './BaseBrowserInstance';
import { BaseTab } from './BaseTab';
import type {
  BrowserType,
  IBrowserTab,
  ScreenshotOptions,
  TabState,
} from './types';

/**
 * PlaywrightBrowser — implementação de navegador via Playwright.
 *
 * Suporta Chromium, Firefox e WebKit. Usa o Playwright para controle
 * completo do navegador (navegação, cliques, screenshots, etc.).
 */
export class PlaywrightBrowser extends BaseBrowserInstance {
  private browserProcess: any = null;
  private _debugUrl: string | undefined;

  async start(): Promise<void> {
    if (this._state === 'running') return;
    this._state = 'starting';

    try {
      const pw = await this.getPlaywright();
      const browserType = this.mapBrowserType(this.type);
      const launcher = pw[browserType];

      this.browserProcess = await launcher.launch({
        ...this.buildLaunchOptions(),
      });

      this._debugUrl = this.browserProcess?.wsEndpoint?.() ?? undefined;
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
      // Fecha todas as abas
      for (const tab of this._tabs.values()) {
        await tab.close().catch(() => {});
      }
      this._tabs.clear();

      if (this.browserProcess) {
        await this.browserProcess.close().catch(() => {});
        this.browserProcess = null;
      }

      this._state = 'stopped';
      this._startedAt = null;
    } catch {
      this._state = 'stopped';
    }
  }

  async newTab(url?: string): Promise<IBrowserTab> {
    if (!this.browserProcess) {
      throw new Error('Navegador não iniciado');
    }

    const page = await this.browserProcess.newPage();
    const tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (url) {
      await page.goto(url);
    }

    // Configura viewport se especificado
    if (this.config.viewport) {
      await page.setViewportSize(this.config.viewport);
    }

    const tab = new PlaywrightTab(tabId, page, this.config.defaultTimeout ?? 30000);
    this.registerTab(tab);
    return tab;
  }

  getDebugUrl(): string | undefined {
    return this._debugUrl;
  }

  private async getPlaywright(): Promise<typeof import('playwright')> {
    try {
      return await import('playwright');
    } catch {
      throw new Error(
        'Playwright não está instalado. Execute: npm install playwright',
      );
    }
  }

  private mapBrowserType(type: BrowserType): 'chromium' | 'firefox' | 'webkit' {
    switch (type) {
      case 'chrome':
      case 'chromium':
      case 'obscura':
        return 'chromium';
      case 'firefox':
        return 'firefox';
      default:
        return 'chromium';
    }
  }

  private buildLaunchOptions(): Record<string, unknown> {
    const options: Record<string, unknown> = {
      headless: this.config.headless ?? true,
    };

    if (this.config.executablePath) {
      options.executablePath = this.config.executablePath;
    }

    if (this.config.args && this.config.args.length > 0) {
      options.args = [...this.config.args];
    }

    if (this.config.userDataDir) {
      options.userDataDir = this.config.userDataDir;
    }

    if (this.config.proxy) {
      options.proxy = { server: this.config.proxy };
    }

    if (this.config.defaultTimeout) {
      options.timeout = this.config.defaultTimeout;
    }

    return options;
  }
}

/**
 * PlaywrightTab — implementação de uma aba via Playwright Page.
 */
class PlaywrightTab extends BaseTab {
  private page: any;
  private timeout: number;
  private _url: string = '';
  private _title: string = '';
  private _state: TabState = 'open';

  constructor(id: string, page: any, timeout: number) {
    super(id);
    this.page = page;
    this.timeout = timeout;

    // Escuta eventos da página
    page.on('close', () => { this._state = 'closed'; });
    page.on('load', () => { this._state = 'open'; });
    page.on('crash', () => { this._state = 'crashed'; });
  }

  get url(): string { return this._url; }
  get title(): string { return this._title; }
  get state(): TabState { return this._state; }

  async navigate(url: string): Promise<void> {
    this._state = 'loading';
    await this.page.goto(url, { timeout: this.timeout, waitUntil: 'networkidle' });
    this._url = this.page.url();
    this._title = await this.page.title();
    this._state = 'open';
  }

  async reload(): Promise<void> {
    await this.page.reload({ timeout: this.timeout });
    this._url = this.page.url();
    this._title = await this.page.title();
  }

  async goBack(): Promise<void> {
    await this.page.goBack({ timeout: this.timeout });
    this._url = this.page.url();
    this._title = await this.page.title();
  }

  async goForward(): Promise<void> {
    await this.page.goForward({ timeout: this.timeout });
    this._url = this.page.url();
    this._title = await this.page.title();
  }

  async close(): Promise<void> {
    await this.page.close();
    this._state = 'closed';
  }

  async getContent(): Promise<string> {
    return this.page.content();
  }

  async getText(): Promise<string> {
    // @ts-ignore - document existe no contexto do navegador
    return this.page.evaluate(() => document.body.innerText);
  }

  async getTitle(): Promise<string> {
    this._title = await this.page.title();
    return this._title;
  }

  async getUrl(): Promise<string> {
    this._url = this.page.url();
    return this._url;
  }

  async screenshot(options?: ScreenshotOptions): Promise<Buffer> {
    return this.page.screenshot({
      fullPage: options?.fullPage,
      type: options?.type ?? 'png',
      quality: options?.quality,
    });
  }

  async evaluate<T = unknown>(script: string): Promise<T> {
    return this.page.evaluate(new Function(script));
  }

  async waitForSelector(selector: string, timeout?: number): Promise<void> {
    await this.page.waitForSelector(selector, {
      timeout: timeout ?? this.timeout,
    });
  }

  async click(selector: string): Promise<void> {
    await this.page.click(selector, { timeout: this.timeout });
  }

  async fill(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
  }

  async getTextContent(selector: string): Promise<string> {
    return this.page.textContent(selector);
  }
}
