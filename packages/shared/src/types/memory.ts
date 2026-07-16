export type MemoryType = 'working' | 'long-term' | 'episodic' | 'semantic';

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  agentId?: string;
  sessionId?: string;
  userId?: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  timestamp: number;
  ttl?: number;
  score?: number;
}

export interface MemoryQuery {
  content?: string;
  embedding?: number[];
  agentId?: string;
  type?: MemoryType;
  limit?: number;
  threshold?: number;
  filter?: Record<string, unknown>;
}

export interface MemorySearchResult {
  entries: MemoryEntry[];
  query: MemoryQuery;
  latency: number;
  totalCount?: number;
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  agentId?: string;
}

export interface IMemoryManager {
  store(
    entry: Omit<MemoryEntry, 'id' | 'timestamp'>
  ): Promise<string>;
  storeMany(
    entries: Array<Omit<MemoryEntry, 'id' | 'timestamp'>>
  ): Promise<string[]>;

  get(id: string): Promise<MemoryEntry | null>;

  search(query: MemoryQuery): Promise<MemorySearchResult>;
  semanticSearch(
    text: string,
    options?: SearchOptions
  ): Promise<MemorySearchResult>;

  forget(id: string): Promise<void>;
  clear(type?: MemoryType): Promise<void>;
  prune(maxAge: number): Promise<number>;

  reindex(): Promise<void>;
}

export interface MemoryBackend {
  store(entry: MemoryEntry): Promise<void>;
  storeMany(entries: MemoryEntry[]): Promise<void>;
  get(id: string): Promise<MemoryEntry | null>;
  search(query: MemoryQuery): Promise<MemoryEntry[]>;
  delete(id: string): Promise<void>;
  clear(type?: MemoryType): Promise<void>;
}

export interface IMemory {
  search(query: string, limit?: number): Promise<MemoryEntry[]>;
  store(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<string>;
  get(id: string): Promise<MemoryEntry | null>;
  delete(id: string): Promise<void>;
}
