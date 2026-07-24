import { Container } from './Container/Container';
import { EventBus } from './EventBus/EventBus';
import { PluginRegistry } from './PluginRegistry/PluginRegistry';
import { CapabilityRegistry } from './CapabilityRegistry/CapabilityRegistry';
import { Logger } from './Logger/Logger';
import { ConfigManager } from './ConfigManager/ConfigManager';
import type { IKernel, KernelStatus, KernelReport, KernelHealth } from '@beehive/shared';
import type { ICapabilityRegistry, IEventBus, IStorage, ILogger, IMemory, IAIService, IConfigService, IPermissionService, IWorkflowService } from '@beehive/shared';

class StubStorage implements IStorage {
  get(key: string): Promise<unknown> { return Promise.resolve(null); }
  set(key: string, value: unknown, ttl?: number): Promise<void> { return Promise.resolve(); }
  delete(key: string): Promise<void> { return Promise.resolve(); }
  list(prefix: string): Promise<string[]> { return Promise.resolve([]); }
}

class StubMemory implements IMemory {
  search(query: string, limit?: number): Promise<any[]> { return Promise.resolve([]); }
  store(entry: any): Promise<string> { return Promise.resolve('mem-' + Date.now()); }
  get(id: string): Promise<any> { return Promise.resolve(null); }
  delete(id: string): Promise<void> { return Promise.resolve(); }
}

class StubAI implements IAIService {
  chat(messages: any[], options?: any): Promise<any> {
    return Promise.resolve({ id: 'stub', content: 'Stub response', model: 'stub', provider: 'stub', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, finishReason: 'stop', latency: 0 });
  }
  chatStream(messages: any[], options?: any): AsyncIterable<any> {
    return { async *[Symbol.asyncIterator]() {} };
  }
}

class StubPermissions implements IPermissionService {
  async hasPermission(subject: string, action: string, resource: string): Promise<boolean> { return true; }
  async requirePermission(subject: string, action: string, resource: string): Promise<void> {}
}

class StubWorkflow implements IWorkflowService {
  async execute(workflowId: string, inputs: Record<string, unknown>): Promise<unknown> { return null; }
  async getStatus(instanceId: string): Promise<string> { return 'completed'; }
}

import { PluginContext } from '../packages/sdk/src/context';
import { WorkflowRuntime } from './WorkflowRuntime/WorkflowRuntime';

export class Kernel implements IKernel {
  readonly id: string;
  readonly version = '0.1.0';
  readonly status: KernelStatus = 'stopped';

  readonly container: Container;
  readonly events: EventBus;
  readonly plugins: PluginRegistry;
  readonly capabilities: CapabilityRegistry;
  readonly logger: Logger;
  readonly config: ConfigManager;
  private _workflowRuntime: WorkflowRuntime | null = null;

  constructor() {
    this.id = 'kernel-' + Date.now().toString(36);
    this.container = new Container();
    this.events = new EventBus();
    this.plugins = new PluginRegistry(this);
    this.capabilities = new CapabilityRegistry();
    this.logger = new Logger();
    this.config = new ConfigManager();
  }

  createPluginContext(pluginName: string): PluginContext {
    return new PluginContext(
      this.capabilities as unknown as ICapabilityRegistry,
      this.events as unknown as IEventBus,
      new StubStorage(),
      this.logger as unknown as ILogger,
      new StubMemory(),
      new StubAI(),
      this.config as unknown as IConfigService,
      new StubPermissions(),
      new StubWorkflow(),
    );
  }

  async boot(): Promise<KernelReport> {
    this.logger.info('Booting BeeHive Kernel...');
    const start = Date.now();

    await this.config.load();
    this.container.register('kernel', this);
    this.container.register('events', this.events);
    this.container.register('plugins', this.plugins);
    this.container.register('capabilities', this.capabilities);
    this.container.register('logger', this.logger);

    const pluginResult = await this.plugins.discoverAndActivate();

    // Initialize WorkflowRuntime after plugins are loaded
    this._workflowRuntime = new WorkflowRuntime(this.capabilities, this.events, this.logger);

    this.events.publish({
      type: 'kernel:booted',
      source: 'kernel',
      payload: { kernelId: this.id },
      timestamp: Date.now(),
    });

    this.logger.info('Kernel booted in ' + (Date.now() - start) + 'ms');

    return {
      kernel: { version: this.version, status: 'running', duration: Date.now() - start },
      plugins: pluginResult,
      capabilities: this.capabilities.list().length,
      providers: 0,
    };
  }

  async shutdown(): Promise<void> { /* TODO */ }
  async health(): Promise<KernelHealth> {
    return { status: 'running', uptime: 0, plugins: {}, capabilities: 0, memory: { heapUsed: 0, heapTotal: 0, rss: 0 } };
  }

  // IKernel compat
  get scheduler() { throw new Error('NotImplemented: Scheduler'); }
  get workflows() { return this._workflowRuntime; }
  get agents() { throw new Error('NotImplemented: AgentRuntime'); }
  get resourceManager() { throw new Error('NotImplemented: ResourceManager'); }
  get knowledgeGraph() { throw new Error('NotImplemented: KnowledgeGraph'); }
  get secrets() { throw new Error('NotImplemented: Secrets'); }
  get metrics() { throw new Error('NotImplemented: Metrics'); }
  get permissions() { throw new Error('NotImplemented: Permissions'); }
  get memory() { throw new Error('NotImplemented: Memory'); }
  get storage() { throw new Error('NotImplemented: Storage'); }
}

