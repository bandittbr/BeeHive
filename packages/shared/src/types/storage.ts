export interface IStorage {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

export interface StorageConfig {
  type: 'local' | 's3' | 'redis';
  path?: string;
  bucket?: string;
  region?: string;
}
