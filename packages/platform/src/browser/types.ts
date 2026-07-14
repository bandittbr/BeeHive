/**
 * Contratos do Browser Manager do BeeHive.
 *
 * Define abstrações para navegadores, instâncias e abas, permitindo que
 * agentes e outros componentes troquem de navegador sem alterar código.
 *
 * Navegadores suportados: Chrome, Chromium, Obscura, Firefox.
 * Automação: Playwright, CDP.
 */

// ---------------------------------------------------------------------------
// Tipos de navegador e automação
// ---------------------------------------------------------------------------

/** Navegadores suportados */
export type BrowserType = 'chrome' | 'chromium' | 'obscura' | 'firefox';

/** Modos de automação suportados */
export type AutomationMode = 'playwright' | 'cdp';

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

/** Configuração de um navegador específico */
export interface BrowserConfig {
  /** Tipo do navegador */
  readonly type: BrowserType;
  /** Modo de automação */
  readonly automation: AutomationMode;
  /** Caminho para o executável (opcional — usa o padrão do sistema se omitido) */
  readonly executablePath?: string;
  /** Argumentos extras para a linha de comando */
  readonly args?: readonly string[];
  /** Porta para CDP (usado apenas no modo 'cdp') */
  readonly cdpPort?: number;
  /** Headless mode */
  readonly headless?: boolean;
  /** Timeout padrão para operações (ms) */
  readonly defaultTimeout?: number;
  /** Diretório de dados do usuário (perfil) */
  readonly userDataDir?: string;
  /** Proxy a ser usado */
  readonly proxy?: string;
  /** Viewport padrão */
  readonly viewport?: BrowserViewport;
  /** User-Agent customizado (padrão: usa o do navegador) */
  readonly userAgent?: string;
}

/** Viewport do navegador */
export interface BrowserViewport {
  readonly width: number;
  readonly height: number;
}

// ---------------------------------------------------------------------------
// Aba (Tab)
// ---------------------------------------------------------------------------

/** Estado de uma aba */
export type TabState = 'open' | 'loading' | 'closed' | 'crashed';

/** Uma aba aberta no navegador */
export interface IBrowserTab {
  /** ID único da aba */
  readonly id: string;
  /** URL atual */
  readonly url: string;
  /** Título da página */
  readonly title: string;
  /** Estado da aba */
  readonly state: TabState;

  /** Navega para uma URL */
  navigate(url: string): Promise<void>;
  /** Recarrega a página */
  reload(): Promise<void>;
  /** Volta na história */
  goBack(): Promise<void>;
  /** Avança na história */
  goForward(): Promise<void>;
  /** Fecha a aba */
  close(): Promise<void>;

  /** Obtém o HTML da página */
  getContent(): Promise<string>;
  /** Obtém o texto visível da página */
  getText(): Promise<string>;
  /** Obtém o título da página */
  getTitle(): Promise<string>;
  /** Obtém a URL atual */
  getUrl(): Promise<string>;

  /** Tira um screenshot */
  screenshot(options?: ScreenshotOptions): Promise<Buffer>;
  /** Injeta JavaScript na página */
  evaluate<T = unknown>(script: string): Promise<T>;
  /** Aguarda um seletor aparecer */
  waitForSelector(selector: string, timeout?: number): Promise<void>;
  /** Clica em um elemento */
  click(selector: string): Promise<void>;
  /** Preenche um campo */
  fill(selector: string, value: string): Promise<void>;
  /** Obtém o texto de um elemento */
  getTextContent(selector: string): Promise<string>;
}

/** Opções de screenshot */
export interface ScreenshotOptions {
  readonly fullPage?: boolean;
  readonly type?: 'png' | 'jpeg';
  readonly quality?: number;
}

// ---------------------------------------------------------------------------
// Instância do navegador
// ---------------------------------------------------------------------------

/** Estado de uma instância do navegador */
export type InstanceState = 'starting' | 'running' | 'stopping' | 'stopped' | 'crashed';

/** Uma instância em execução de um navegador */
export interface IBrowserInstance {
  /** ID único da instância */
  readonly id: string;
  /** Tipo do navegador */
  readonly type: BrowserType;
  /** Modo de automação */
  readonly automation: AutomationMode;
  /** Estado atual */
  readonly state: InstanceState;
  /** Configuração usada para iniciar */
  readonly config: BrowserConfig;

  /** Inicia o navegador */
  start(): Promise<void>;
  /** Para o navegador */
  stop(): Promise<void>;
  /** Reinicia o navegador */
  restart(): Promise<void>;

  /** Abre uma nova aba */
  newTab(url?: string): Promise<IBrowserTab>;
  /** Lista todas as abas abertas */
  tabs(): Promise<readonly IBrowserTab[]>;
  /** Fecha uma aba específica */
  closeTab(tabId: string): Promise<void>;
  /** Obtém uma aba pelo ID */
  getTab(tabId: string): Promise<IBrowserTab | undefined>;

  /** Obtém a URL de depuração CDP (se aplicável) */
  getDebugUrl(): string | undefined;
  /** Obtém métricas da instância */
  metrics(): BrowserMetrics;
}

/** Métricas de uma instância do navegador */
export interface BrowserMetrics {
  readonly uptimeMs: number;
  readonly tabsCount: number;
  readonly memoryUsageMb?: number;
  readonly cpuUsage?: number;
}

// ---------------------------------------------------------------------------
// Gerenciador de navegadores
// ---------------------------------------------------------------------------

/** Opções para criar uma instância */
export interface LaunchOptions {
  readonly type?: BrowserType;
  readonly automation?: AutomationMode;
  readonly config?: Partial<BrowserConfig>;
}

/** Snapshot de uma instância para observabilidade */
export interface BrowserInstanceSnapshot {
  readonly id: string;
  readonly type: BrowserType;
  readonly automation: AutomationMode;
  readonly state: InstanceState;
  readonly tabsCount: number;
  readonly uptimeMs: number;
  readonly debugUrl?: string;
}

/** Gerenciador central de navegadores */
export interface IBrowserManager {
  /** Inicia uma nova instância de navegador */
  launch(options?: LaunchOptions): Promise<IBrowserInstance>;
  /** Conecta a uma instância existente (ex: via CDP) */
  connect(debugUrl: string, type?: BrowserType): Promise<IBrowserInstance>;
  /** Obtém uma instância pelo ID */
  getInstance(instanceId: string): IBrowserInstance | undefined;
  /** Lista todas as instâncias ativas */
  listInstances(): readonly IBrowserInstance[];
  /** Para uma instância específica */
  stopInstance(instanceId: string): Promise<void>;
  /** Para todas as instâncias */
  stopAll(): Promise<void>;
  /** Obtém a instância padrão (criada automaticamente se não existir) */
  getDefault(): Promise<IBrowserInstance>;
  /** Snapshot de todas as instâncias */
  snapshots(): BrowserInstanceSnapshot[];
}

// ---------------------------------------------------------------------------
// Browser Profiles (persistência)
// ---------------------------------------------------------------------------

/** Perfil de navegador persistido no banco. */
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

/** Input para criar um perfil de navegador. */
export interface BrowserProfileInputCreate {
  name: string;
  browserType?: 'chromium' | 'firefox' | 'chrome';
  userDataDir: string;
  proxy?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  userAgent?: string;
}

/** Input para atualizar um perfil existente. */
export interface BrowserProfileInputUpdate {
  name?: string;
  proxy?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  userAgent?: string;
  cookies?: unknown[];
  localStorage?: Record<string, string>;
  metadata?: Record<string, unknown>;
}
