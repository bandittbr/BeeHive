export interface IConfigService {
  get<T>(key: string, defaultVal?: T): T | undefined;
  set<T>(key: string, value: T): void;
  delete(key: string): void;
  watch<T>(key: string, cb: (val: T) => void): () => void;
  getAll(): Record<string, unknown>;
  getPluginConfig(pluginId: string): Record<string, unknown>;
}
