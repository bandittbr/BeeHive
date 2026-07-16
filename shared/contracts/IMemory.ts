export interface IMemory {
  readonly id: string;
  readonly type: MemoryStoreType;

  store(entry: MemoryEntry): Promise<string>;
  search(query: MemoryQuery): Promise<MemoryEntry[]>;
  get(id: string): Promise<MemoryEntry | null>;
  forget(id: string): Promise<void>;
  clear(): Promise<void>;
  prune(maxAge: number): Promise<number>;
}

export type MemoryStoreType = 'working' | 'long-term' | 'episodic' | 'semantic';

export interface MemoryEntry {
  id?: string;
  type: MemoryStoreType;
  agentId?: string;
  sessionId?: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  timestamp?: number;
  ttl?: number;
  score?: number;
}

export interface MemoryQuery {
  content?: string;
  embedding?: number[];
  agentId?: string;
  type?: MemoryStoreType;
  limit?: number;
  threshold?: number;
  filter?: Record<string, unknown>;
}
