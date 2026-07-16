export interface BeeHivePlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly capabilities: PluginCapability[];

  onLoad(core: CoreAPI): Promise<void>;
  onUnload(): Promise<void>;
}

export interface PluginCapability {
  id: string;
  description: string;
  actions: PluginAction[];
}

export interface PluginAction {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(params: unknown, context: ActionContext): Promise<ActionResult>;
}

export interface ActionContext {
  core: CoreAPI;
  userId?: string;
  workspaceId?: string;
  correlationId?: string;
  abortSignal?: AbortSignal;
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    duration: number;
    pluginId: string;
    capabilityId: string;
    actionName: string;
  };
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  capabilities: string[];
  loaded: boolean;
}

export interface IPluginManager {
  load(pluginId: string): Promise<void>;
  loadFromPath(path: string): Promise<void>;
  unload(pluginId: string): Promise<void>;
  unloadAll(): Promise<void>;
  list(): PluginInfo[];
  get(id: string): BeeHivePlugin | undefined;
  getCapability(capabilityId: string): PluginCapability | null;
  executeAction(
    capabilityId: string,
    action: string,
    params: unknown,
    context: ActionContext
  ): Promise<ActionResult>;
  findByCapability(capabilityId: string): BeeHivePlugin[];
}

export interface CoreAPI {
  ai: {
    execute(req: AIRequest): Promise<AIResponse>;
    executeStream(req: AIRequest): AsyncIterable<AIStreamChunk>;
  };
  storage: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
  };
  events: {
    emit(type: string, payload: unknown): Promise<void>;
    on(type: string, handler: (event: any) => void): void;
  };
  tools: {
    execute(name: string, args: unknown): Promise<unknown>;
  };
  log: {
    info(msg: string, ...args: unknown[]): void;
    warn(msg: string, ...args: unknown[]): void;
    error(msg: string, ...args: unknown[]): void;
  };
  config: {
    get<T>(key: string, defaultVal?: T): T | undefined;
  };
}
