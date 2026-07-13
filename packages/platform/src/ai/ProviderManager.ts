import type { IEventBus, ILogger } from '../kernel';
import type Database from 'better-sqlite3';
import { AIProviderRegistry } from './AIProviderRegistry';
import { BIGPICKLE_DEFAULT_MODEL, type ProviderCatalogEntry } from './providers/catalog';
import { ProviderCredentialsStore, type StoredCredentials } from './providers/credentialsStore';
import type { AICapability, AIProvider, AIProviderHealth, AIProviderModelSummary } from './types';

/** Payload do evento `ProviderChanged`, emitido a cada troca real do Provider ativo. */
export interface ProviderChangedPayload {
  readonly providerId: string;
  readonly previousProviderId: string | null;
}

/** Retrato de um Provider para observabilidade (Configurações/Central futuros). */
export interface ProviderDescriptor {
  readonly id: string;
  readonly name: string;
  readonly capabilities: readonly AICapability[];
  readonly enabled: boolean;
  readonly registeredAt: number;
  readonly health: AIProviderHealth;
}

export interface ProviderHealthEntry {
  readonly id: string;
  readonly ok: boolean;
  readonly detail?: string;
}

export interface ProviderManagerHealth {
  readonly ok: boolean;
  readonly providers: readonly ProviderHealthEntry[];
}

/** Retrato completo — o que o Runtime consultaria (mesmo padrão do RuntimeManager). */
export interface ProviderManagerSnapshot {
  readonly activeProviderId: string | null;
  readonly activeModel: string | null;
  readonly providers: readonly ProviderDescriptor[];
  readonly health: ProviderManagerHealth;
}

export interface ProviderManagerOptions {
  logger?: ILogger;
  /** Opcional (DI): quando injetado, toda troca real do Provider ativo emite `ProviderChanged`. */
  events?: IEventBus;
}

interface ProviderMeta {
  enabled: boolean;
  registeredAt: number;
}

/**
 * ProviderManager — gestão central dos Providers de IA.
 *
 * Fica ENTRE o `AIManager` e os Providers concretos. Registra, ativa/desativa,
 * escolhe o Provider e o modelo padrão, lista o que está disponível e agrega
 * saúde. O `AIManager` não precisa mudar nem conhecer este tipo: ele já
 * depende só do contrato de `AIProviderRegistry` (`register/unregister/get/
 * has/list/findByCapability`) — e `ProviderManager` É um `AIProviderRegistry`
 * (herança), então é um substituto direto, sem alterar `AIManager` nem o
 * `Runtime` que o instancia hoje. O Runtime (Sprint 14.2) já injeta um
 * `ProviderManager` no lugar do `AIProviderRegistry` puro — o `AIManager`
 * fala só com ele automaticamente, por polimorfismo, não por acoplamento.
 *
 * SELEÇÃO DINÂMICA (Sprint 14.3): `findByCapability()` prefere o Provider
 * ATIVO (`activeProvider()`) antes de cair na ordem de registro — é o que
 * faz o `AIManager` sempre usar o Provider ativo, sem tocar em `AIManager.ts`.
 * `setDefaultProvider()` troca esse Provider ativo em tempo de execução, loga
 * a troca e emite `ProviderChanged` (idempotente: trocar para quem já é o
 * ativo não gera log nem evento).
 *
 * PONTOS DE EXTENSÃO (propositalmente NÃO implementados ainda): fallback
 * automático entre Providers, balanceamento de carga, custo por requisição,
 * roteamento inteligente (por capacidade/custo/latência) e retry. Todos
 * entrariam em `findByCapability()` — é o único lugar por onde a resolução
 * de "qual Provider responde" passa.
 */
export class ProviderManager extends AIProviderRegistry {
  private readonly meta = new Map<string, ProviderMeta>();
  private readonly logger?: ILogger;
  private readonly events?: IEventBus;
  private defaultProviderId: string | null = null;
  private defaultModel: string | null = null;

  constructor(options: ProviderManagerOptions = {}) {
    super();
    this.logger = options.logger?.child('ai:providers');
    this.events = options.events;
  }

  // ------------------------------ Registro --------------------------------

  /** Registra um Provider. Fica habilitado por padrão. Lança se o id já existe. */
  override register(provider: AIProvider): void {
    super.register(provider);
    this.meta.set(provider.id, { enabled: true, registeredAt: Date.now() });
    this.logger?.info(`Provider registrado: ${provider.id}`, { name: provider.name });

    // O primeiro Provider registrado vira o padrão — conveniência de boot,
    // não é roteamento: evita um passo manual óbvio quando só há um.
    if (this.defaultProviderId === null) {
      this.defaultProviderId = provider.id;
    }
  }

  /** Remove um Provider (registro e metadados). Limpa o padrão, se era ele. */
  override unregister(id: string): void {
    super.unregister(id);
    this.meta.delete(id);
    if (this.defaultProviderId === id) this.defaultProviderId = null;
    this.logger?.info(`Provider removido: ${id}`);
  }

  // ------------------------------ Ativação ---------------------------------

  /** Habilita um Provider já registrado. Lança se não existir. */
  activate(id: string): void {
    this.requireMeta(id).enabled = true;
    this.logger?.info(`Provider ativado: ${id}`);
  }

  /** Desabilita um Provider (continua registrado, só sai de circulação). */
  deactivate(id: string): void {
    this.requireMeta(id).enabled = false;
    this.logger?.info(`Provider desativado: ${id}`);
  }

  isEnabled(id: string): boolean {
    return this.meta.get(id)?.enabled ?? false;
  }

  // ------------------------ Provider e modelo padrão -----------------------

  /**
   * Troca o Provider ativo em tempo de execução. Lança se não estiver
   * registrado. Idempotente: trocar para quem já é o ativo não gera log nem
   * evento (não é uma troca real). O Runtime não precisa reiniciar — o
   * `AIManager` já injetado passa a resolver o novo Provider ativo na
   * PRÓXIMA solicitação, porque `findByCapability()` sempre relê
   * `defaultProviderId` (nunca cacheia a escolha).
   */
  setDefaultProvider(id: string): void {
    if (!super.has(id)) {
      throw new Error(`Provider de IA não encontrado: ${id}`);
    }
    const previous = this.defaultProviderId;
    if (previous === id) return;

    this.defaultProviderId = id;
    this.logger?.info(`Provider ativo trocado: ${previous ?? '(nenhum)'} → ${id}`);
    this.events?.emit<ProviderChangedPayload>('ProviderChanged', {
      providerId: id,
      previousProviderId: previous,
    });
  }

  getDefaultProviderId(): string | null {
    return this.defaultProviderId;
  }

  /** Define o modelo padrão (usado quando uma solicitação não especifica um). */
  setDefaultModel(model: string): void {
    if (!model.trim()) {
      throw new Error('setDefaultModel: o modelo não pode ser vazio.');
    }
    this.defaultModel = model;
    this.logger?.info(`Modelo padrão: ${model}`);
  }

  getDefaultModel(): string | null {
    return this.defaultModel;
  }

  /**
   * O Provider ativo agora: o padrão, só se estiver habilitado. Sem
   * fallback — se o padrão está desativado, não há Provider ativo (explícito,
   * nunca uma troca silenciosa para outro).
   */
  activeProvider(): AIProvider | undefined {
    if (!this.defaultProviderId || !this.isEnabled(this.defaultProviderId)) {
      return undefined;
    }
    return super.get(this.defaultProviderId);
  }

  // -------------------- Consulta (contrato de AIProviderRegistry) ----------

  /**
   * Providers HABILITADOS — é isto que o `AIManager` enxerga através de
   * `list()` (usado em `AIManager.capabilities()`).
   */
  override list(): readonly AIProvider[] {
    return super.list().filter((provider) => this.isEnabled(provider.id));
  }

  /**
   * Resolve um Provider habilitado para a capacidade pedida — nesta ordem:
   * 1) `preferredId`, se veio explícito na solicitação (`AIRequestOptions.providerId`);
   * 2) o Provider ATIVO (`activeProvider()`), se suportar a capacidade — é
   *    isto que faz o `AIManager` usar sempre o Provider ativo, com zero
   *    mudança em `AIManager.ts`: ele já chama `findByCapability()` sem saber
   *    qual Provider vai responder;
   * 3) o primeiro Provider habilitado que suportar, por ordem de registro
   *    (fallback só quando não há Provider ativo, ex.: todos desativados).
   * Com um único Provider registrado, os passos 2 e 3 sempre convergem para
   * ele — o comportamento de quando só existia um Provider não muda.
   */
  override findByCapability(capability: AICapability, preferredId?: string): AIProvider | undefined {
    if (preferredId) {
      const provider = super.get(preferredId);
      if (provider && this.isEnabled(preferredId) && provider.supports(capability)) {
        return provider;
      }
    }

    const active = this.activeProvider();
    if (active && active.supports(capability)) {
      return active;
    }

    for (const provider of super.list()) {
      if (this.isEnabled(provider.id) && provider.supports(capability)) return provider;
    }
    return undefined;
  }

  // -------------------------------- Observabilidade -------------------------

  /** Todos os Providers registrados (habilitados ou não), com saúde atual. */
  availableProviders(): readonly ProviderDescriptor[] {
    return super.list().map((provider) => ({
      id: provider.id,
      name: provider.name,
      capabilities: provider.capabilities,
      enabled: this.isEnabled(provider.id),
      registeredAt: this.meta.get(provider.id)?.registeredAt ?? 0,
      health: provider.health(),
    }));
  }

  /**
   * Modelos disponíveis num Provider (padrão: o ativo). Devolve `[]` se o
   * Provider não existir, não estiver habilitado ou não implementar
   * `listModels()` (opcional no contrato — nem todo Provider tem múltiplos
   * modelos selecionáveis).
   */
  async availableModels(providerId?: string): Promise<readonly AIProviderModelSummary[]> {
    const provider = providerId ? super.get(providerId) : this.activeProvider();
    if (!provider || !this.isEnabled(provider.id) || !provider.listModels) return [];
    return provider.listModels();
  }

  /** Saúde de um Provider específico. `undefined` se não estiver registrado. */
  healthOf(id: string): AIProviderHealth | undefined {
    return super.get(id)?.health();
  }

  /** Saúde geral: ok somente se todo Provider HABILITADO estiver ok. */
  health(): ProviderManagerHealth {
    const providers: ProviderHealthEntry[] = super
      .list()
      .filter((provider) => this.isEnabled(provider.id))
      .map((provider) => {
        const h = provider.health();
        return { id: provider.id, ok: h.ok, detail: h.detail };
      });
    return { ok: providers.every((p) => p.ok), providers };
  }

  /** Retrato completo — Provider ativo, modelo ativo, Providers e saúde. */
  snapshot(): ProviderManagerSnapshot {
    return {
      activeProviderId: this.activeProvider()?.id ?? null,
      activeModel: this.defaultModel,
      providers: this.availableProviders(),
      health: this.health(),
    };
  }

  private requireMeta(id: string): ProviderMeta {
    const meta = this.meta.get(id);
    if (!meta) throw new Error(`Provider de IA não encontrado: ${id}`);
    return meta;
  }

  // -------------------- AutoLoad (catálogo + credenciais) ----------------

  /**
   * Carrega automaticamente todos os providers do catálogo, instanciando
   * apenas aqueles que têm credenciais salvas (ou que não precisam de API key,
   * como Ollama e Custom). É o ponto de entrada principal para o boot do
   * sistema de providers — chamado pelo Runtime na inicialização.
   *
   * Fluxo:
   *  1. Para cada entrada do catálogo:
   *     - Se requiresApiKey=true e não há credenciais salvas → pula (não registra)
   *     - Se requiresApiKey=true e há credenciais → instancia com credenciais
   *     - Se requiresApiKey=false → instancia com defaults (Ollama, Custom)
   *  2. Registra cada provider instanciado
   *  3. O primeiro provider registrado vira o ativo (comportamento existente)
   *  4. Modelo padrão: BigPickle se nada foi configurado antes
   */
  autoLoad(db: Database.Database, catalog?: readonly ProviderCatalogEntry[]): void {
    const { PROVIDER_CATALOG } = require('./providers/catalog') as typeof import('./providers/catalog');
    const entries = catalog ?? PROVIDER_CATALOG;
    const store = new ProviderCredentialsStore(db);

    for (const entry of entries) {
      const credentials = store.load(entry.id);

      // Pula providers que precisam de API key mas não têm credenciais
      if (entry.requiresApiKey && !credentials?.apiKey) {
        this.logger?.debug(`Provider ${entry.name} pulado (sem API key)`);
        continue;
      }

      try {
        const provider = this.instantiateProvider(entry, credentials);
        this.register(provider);
        this.logger?.info(`Provider auto-load: ${entry.name}`, {
          id: entry.id,
          hasCredentials: !!credentials?.apiKey,
        });
      } catch (error) {
        this.logger?.warn(`Provider ${entry.name} falhou ao carregar`, {
          error: error instanceof Error ? error.message : 'erro desconhecido',
        });
      }
    }

    // Modelo padrão: BigPickle se nada foi configurado
    if (!this.defaultModel) {
      this.defaultModel = BIGPICKLE_DEFAULT_MODEL;
      this.logger?.info(`Modelo padrão: ${BIGPICKLE_DEFAULT_MODEL} (BigPickle)`);
    }
  }

  /**
   * Salva credenciais de um provider, (re-)instancía ele e registra.
   * Se o provider já estava registrado, substitui.
   */
  saveAndRegister(
    entry: ProviderCatalogEntry,
    credentials: StoredCredentials,
    db: Database.Database,
  ): void {
    const store = new ProviderCredentialsStore(db);
    store.save(entry.id, credentials);

    // Remove se já existia
    if (super.has(entry.id)) {
      this.unregister(entry.id);
    }

    // Instancia e registra
    const provider = this.instantiateProvider(entry, credentials);
    this.register(provider);
  }

  /**
   * Testa se um provider é acessível com as credenciais dadas.
   * Retorna { ok, detail? } sem registrar nada.
   */
  async testConnection(
    entry: ProviderCatalogEntry,
    credentials?: StoredCredentials,
  ): Promise<{ ok: boolean; detail?: string }> {
    try {
      const provider = this.instantiateProvider(entry, credentials ?? undefined);
      const health = await provider.health();
      // Se health não tem detail, tenta uma chamada real
      if (health.ok && 'checkHealth' in provider && typeof (provider as any).checkHealth === 'function') {
        return await (provider as any).checkHealth();
      }
      return health;
    } catch (error) {
      return {
        ok: false,
        detail: error instanceof Error ? error.message : 'erro desconhecido',
      };
    }
  }

  /**
   * Retorna o catálogo completo com status de cada provider
   * (tem credenciais? está habilitado? está registrado?).
   */
  getCatalogStatus(db: Database.Database): Array<ProviderCatalogEntry & {
    hasCredentials: boolean;
    isEnabled: boolean;
    isRegistered: boolean;
  }> {
    const { PROVIDER_CATALOG } = require('./providers/catalog') as typeof import('./providers/catalog');
    const store = new ProviderCredentialsStore(db);

    return PROVIDER_CATALOG.map((entry: ProviderCatalogEntry) => ({
      ...entry,
      hasCredentials: store.has(entry.id),
      isEnabled: this.isEnabled(entry.id),
      isRegistered: super.has(entry.id),
    }));
  }

  // -------------------- Factory (privado) ---------------------------------

  /**
   * Instancia o implementador correto de AIProvider baseado na entrada do catálogo.
   * Conhecimento PRIVADO: este é o único lugar que importa os providers concretos.
   */
  private instantiateProvider(
    entry: ProviderCatalogEntry,
    credentials?: StoredCredentials,
  ): AIProvider {
    const logger = this.logger;

    switch (entry.implementation) {
      case 'ollama': {
        const { OllamaProvider } = require('./providers/ollama') as typeof import('./providers/ollama');
        return new OllamaProvider({
          baseUrl: credentials?.baseUrl ?? entry.defaultBaseUrl,
          model: entry.defaultModel,
          logger,
        });
      }
      case 'openai': {
        const { OpenAIProvider } = require('./providers/openai') as typeof import('./providers/openai');
        return new OpenAIProvider({
          apiKey: credentials?.apiKey ?? '',
          baseUrl: credentials?.baseUrl ?? entry.defaultBaseUrl,
          model: entry.defaultModel,
          providerName: entry.name,
          logger,
        });
      }
      case 'anthropic': {
        const { AnthropicProvider } = require('./providers/anthropic') as typeof import('./providers/anthropic');
        return new AnthropicProvider({
          apiKey: credentials?.apiKey ?? '',
          baseUrl: credentials?.baseUrl ?? entry.defaultBaseUrl,
          model: entry.defaultModel,
          logger,
        });
      }
      case 'gemini': {
        const { GeminiProvider } = require('./providers/gemini') as typeof import('./providers/gemini');
        return new GeminiProvider({
          apiKey: credentials?.apiKey ?? '',
          baseUrl: credentials?.baseUrl ?? entry.defaultBaseUrl,
          model: entry.defaultModel,
          logger,
        });
      }
      default:
        throw new Error(`Provider implementation desconhecida: ${(entry as any).implementation}`);
    }
  }
}
