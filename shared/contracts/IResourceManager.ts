export interface IResourceManager {
  readonly browser: IBrowserPool;
  readonly models: IModelPool;
  readonly gpu: IGPUPool;
  readonly embeddings: IEmbeddingPool;
  readonly cache: IFileCache;
  readonly temp: ITempFiles;
  readonly downloads: IDownloadManager;
  readonly processes: IProcessManager;

  getStatus(): ResourceStatus;
  getUsage(): ResourceUsage;
}

export interface ResourceStatus {
  browsers: { active: number; idle: number; max: number };
  models: { loaded: number; total: number };
  gpu: { used: number; total: number; utilization: number };
  memory: { heapUsed: number; heapTotal: number; external: number };
  cache: { size: number; maxSize: number; hitRate: number };
  temp: { files: number; size: number };
  downloads: { active: number; completed: number; failed: number };
}

export interface ResourceUsage {
  cpu: number;
  memory: { rss: number; heapUsed: number; heapTotal: number };
  gpu?: { utilization: number; memoryUsed: number; memoryTotal: number };
  disk: { used: number; free: number };
  network: { rxBytes: number; txBytes: number };
}

export interface IBrowserPool {
  acquire(): Promise<IBrowserInstance>;
  release(browser: IBrowserInstance): void;
  getStatus(): { active: number; idle: number; max: number };
}

export interface IBrowserInstance {
  id: string;
  healthCheck(): Promise<boolean>;
  close(): Promise<void>;
}

export interface IModelPool {
  load(modelId: string): Promise<void>;
  unload(modelId: string): Promise<void>;
  isLoaded(modelId: string): boolean;
  getLoadedModels(): string[];
  getStatus(): { loaded: number; total: number; memoryUsed: number };
}

export interface IGPUPool {
  acquire(requirements?: { memory?: number }): Promise<string>;
  release(gpuId: string): void;
  getStatus(): { available: number; total: number; utilization: number };
}

export interface IEmbeddingPool {
  get(): Promise<IEmbeddingService>;
  release(service: IEmbeddingService): void;
}

export interface IEmbeddingService {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface IFileCache {
  get(key: string): Promise<Buffer | null>;
  set(key: string, data: Buffer, ttl?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  clear(): Promise<void>;
  getHitRate(): number;
}

export interface ITempFiles {
  create(extension?: string): Promise<string>;
  write(path: string, data: Buffer): Promise<void>;
  read(path: string): Promise<Buffer>;
  cleanup(maxAge?: number): Promise<number>;
}

export interface IDownloadManager {
  enqueue(url: string, options?: DownloadOptions): Promise<string>;
  getStatus(downloadId: string): Promise<DownloadStatus | null>;
  list(): Promise<DownloadStatus[]>;
  cancel(downloadId: string): Promise<void>;
}

export interface DownloadOptions {
  destination?: string;
  filename?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface DownloadStatus {
  id: string;
  url: string;
  status: 'queued' | 'downloading' | 'completed' | 'failed';
  progress: number;
  speed?: number;
  destination?: string;
  error?: string;
}

export interface IProcessManager {
  spawn(command: string, args: string[], options?: ProcessOptions): Promise<IProcess>;
  kill(processId: string): Promise<void>;
  list(): Promise<IProcessInfo[]>;
  getStatus(): { active: number; total: number; memoryUsed: number };
}

export interface IProcess {
  id: string;
  pid: number;
  onStdout: (data: string) => void;
  onStderr: (data: string) => void;
  onExit: (code: number) => void;
  kill(): Promise<void>;
  wait(): Promise<number>;
}

export interface ProcessOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  maxMemory?: number;
}

export interface IProcessInfo {
  id: string;
  pid: number;
  command: string;
  status: 'running' | 'stopped' | 'failed';
  startedAt: number;
  memory: number;
  cpu: number;
}
