export interface IPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly manifest: PluginManifest;

  onLoad(core: ICoreAPI): Promise<void>;
  onUnload(): Promise<void>;
  health(): Promise<boolean>;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  capabilities: string[];
  interfaces: string[];
  adapters: string[];
  dependencies: string[];
  permissions: string[];
}

export interface ICoreAPI {
  ai: IAIService;
  workflow: IWorkflowService;
  memory: IMemoryService;
  storage: IStorageService;
  events: IEventService;
  tools: IToolService;
  log: ILogService;
  config: IConfigService;
}

export interface IAIService {
  execute(req: AIRequest): Promise<AIResponse>;
  executeStream(req: AIRequest): AsyncIterable<AIStreamChunk>;
}

export interface IWorkflowService {
  start(workflowId: string, context?: Record<string, unknown>): Promise<string>;
  on(event: string, handler: Function): void;
}

export interface IMemoryService {
  store(data: { type: string; content: string; metadata?: Record<string, unknown> }): Promise<string>;
  search(query: string, limit?: number): Promise<unknown[]>;
}

export interface IStorageService {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface IEventService {
  emit(type: string, payload: unknown): Promise<void>;
  on(type: string, handler: (event: any) => void): void;
}

export interface IToolService {
  execute(name: string, args: unknown): Promise<unknown>;
  list(): string[];
}

export interface ILogService {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export interface IConfigService {
  get<T>(key: string, defaultVal?: T): T | undefined;
  set<T>(key: string, value: T): void;
}
