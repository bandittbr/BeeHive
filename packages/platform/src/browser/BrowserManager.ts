import type {
  BrowserInstanceSnapshot,
  BrowserType,
  IBrowserInstance,
  IBrowserManager,
  LaunchOptions,
} from './types';
import { BrowserFactory } from './BrowserFactory';

/**
 * BrowserManager — gerenciador central de navegadores.
 *
 * Responsabilidade única: gerenciar o ciclo de vida de instâncias de
 * navegadores. Permite iniciar, conectar, listar e parar navegadores.
 *
 * Agentes e outros componentes nunca lidam diretamente com Playwright
 * ou CDP — usam o BrowserManager e as interfaces IBrowserInstance/
 * IBrowserTab.
 */
export class BrowserManager implements IBrowserManager {
  private readonly instances = new Map<string, IBrowserInstance>();
  private readonly factory: BrowserFactory;
  private defaultInstanceId: string | null = null;

  constructor(factory?: BrowserFactory) {
    this.factory = factory ?? new BrowserFactory();
  }

  async launch(options?: LaunchOptions): Promise<IBrowserInstance> {
    const type = options?.type ?? 'chromium';
    const automation = options?.automation ?? this.factory.getRecommendedAutomation(type);

    const instance = this.factory.create(type, automation, options?.config);
    await instance.start();

    this.instances.set(instance.id, instance);

    // Se for a primeira instância, define como padrão
    if (!this.defaultInstanceId) {
      this.defaultInstanceId = instance.id;
    }

    return instance;
  }

  async connect(debugUrl: string, type?: BrowserType): Promise<IBrowserInstance> {
    const instance = this.factory.create(
      type ?? 'chromium',
      'cdp',
      { cdpPort: this.extractPort(debugUrl) },
    );

    // Para CDP, start() conecta ao invés de iniciar um novo processo
    await instance.start();
    this.instances.set(instance.id, instance);

    if (!this.defaultInstanceId) {
      this.defaultInstanceId = instance.id;
    }

    return instance;
  }

  getInstance(instanceId: string): IBrowserInstance | undefined {
    return this.instances.get(instanceId);
  }

  listInstances(): readonly IBrowserInstance[] {
    return [...this.instances.values()];
  }

  async stopInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    await instance.stop();
    this.instances.delete(instanceId);

    if (this.defaultInstanceId === instanceId) {
      this.defaultInstanceId = this.instances.keys().next().value ?? null;
    }
  }

  async stopAll(): Promise<void> {
    const ids = [...this.instances.keys()];
    for (const id of ids) {
      await this.stopInstance(id).catch(() => {});
    }
    this.defaultInstanceId = null;
  }

  async getDefault(): Promise<IBrowserInstance> {
    if (this.defaultInstanceId) {
      const instance = this.instances.get(this.defaultInstanceId);
      if (instance) return instance;
    }

    // Cria uma instância padrão
    return this.launch({ type: 'chromium', automation: 'playwright' });
  }

  snapshots(): BrowserInstanceSnapshot[] {
    return [...this.instances.values()].map((instance) => ({
      id: instance.id,
      type: instance.type,
      automation: instance.automation,
      state: instance.state,
      tabsCount: instance.metrics().tabsCount,
      uptimeMs: instance.metrics().uptimeMs,
      debugUrl: instance.getDebugUrl(),
    }));
  }

  private extractPort(debugUrl: string): number {
    const match = debugUrl.match(/:(\d+)/);
    return match ? parseInt(match[1], 10) : 9222;
  }
}
