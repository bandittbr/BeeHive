export interface IStorage {
  readonly id: string;
  readonly type: 'local' | 's3' | 'redis';

  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix: string): Promise<string[]>;
  size(key: string): Promise<number>;
}
