import type {
  AutomationMode,
  BrowserConfig,
  BrowserMetrics,
  BrowserType,
  IBrowserInstance,
  IBrowserTab,
  InstanceState,
} from './types';

/**
 * BaseBrowserInstance — implementação base de uma instância de navegador.
 *
 * Gerencia o estado, métricas e ciclo de vida. Implementações concretas
 * (PlaywrightBrowser, CDPBrowser) devem sobrescrever start/stop/newTab.
 */
export abstract class BaseBrowserInstance implements IBrowserInstance {
  readonly id: string;
  readonly type: BrowserType;
  readonly automation: AutomationMode;
  readonly config: BrowserConfig;

  protected _state: InstanceState = 'stopped';
  protected _startedAt: number | null = null;
  protected _tabs: Map<string, IBrowserTab> = new Map();

  constructor(id: string, config: BrowserConfig) {
    this.id = id;
    this.config = config;
    this.type = config.type;
    this.automation = config.automation;
  }

  get state(): InstanceState {
    return this._state;
  }

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  abstract newTab(url?: string): Promise<IBrowserTab>;

  async tabs(): Promise<readonly IBrowserTab[]> {
    return [...this._tabs.values()];
  }

  async closeTab(tabId: string): Promise<void> {
    const tab = this._tabs.get(tabId);
    if (tab) {
      await tab.close();
      this._tabs.delete(tabId);
    }
  }

  async getTab(tabId: string): Promise<IBrowserTab | undefined> {
    return this._tabs.get(tabId);
  }

  abstract getDebugUrl(): string | undefined;

  metrics(): BrowserMetrics {
    return {
      uptimeMs: this._startedAt !== null ? Date.now() - this._startedAt : 0,
      tabsCount: this._tabs.size,
    };
  }

  /** Registra uma aba no gerenciamento interno */
  protected registerTab(tab: IBrowserTab): void {
    this._tabs.set(tab.id, tab);
  }

  /** Remove uma aba do gerenciamento interno */
  protected unregisterTab(tabId: string): void {
    this._tabs.delete(tabId);
  }
}
