export interface IMemory {
  store(entry: { type: string; content: string; metadata?: Record<string, unknown> }): Promise<string>;
  search(query: string, opts?: { limit?: number; threshold?: number; filter?: Record<string, unknown> }): Promise<unknown[]>;
  get(id: string): Promise<unknown | null>;
  forget(id: string): Promise<void>;
  clear(type?: string): Promise<void>;
}
