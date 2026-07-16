export class ConfigManager {
  private config = new Map<string, unknown>();

  async load(): Promise<void> { /* Load from env, files, DB */ }

  get<T>(key: string, defaultVal?: T): T | undefined {
    return (this.config.get(key) ?? defaultVal) as T | undefined;
  }

  set<T>(key: string, value: T): void { this.config.set(key, value); }
  delete(key: string): void { this.config.delete(key); }
  getAll(): Record<string, unknown> { return Object.fromEntries(this.config); }

  watch<T>(key: string, cb: (val: T) => void): () => void {
    return () => {}; // TODO
  }

  getPluginConfig(pluginId: string): Record<string, unknown> {
    return (this.config.get(`plugin:${pluginId}`) as Record<string, unknown>) ?? {};
  }
}
