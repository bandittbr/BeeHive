export interface IConfigurationManager {
  load(): Promise<void>;
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): void;
  getAll(): Record<string, unknown>;
  watch<T>(key: string, callback: (value: T) => void): () => void;

  getModuleConfig(moduleId: string): Record<string, unknown>;
  setModuleConfig(moduleId: string, config: Record<string, unknown>): void;
}

export interface IConfigService {
  get<T>(key: string, defaultVal?: T): T | undefined;
  set<T>(key: string, value: T): void;
  getAll(): Record<string, unknown>;
  getPluginConfig(pluginId: string): Record<string, unknown>;
  watch<T>(key: string, cb: (val: T) => void): () => void;
}
