import type { ILogger, IMemoryManager, MemoryEntry, MemoryEntryType } from './types';

/**
 * MemoryManager — gerenciador de memória do sistema.
 *
 * Responsabilidade única: armazenar e recuperar contexto, decisões,
 * preferências, objetivos e resultados anteriores. A memória é separada
 * em três camadas conceituais:
 *
 * 1. Dados — informações brutas (arquivos, registros, etc.)
 * 2. Conhecimento — informação processada e estruturada
 * 3. Memória — contexto de projetos, histórico de agentes, decisões
 *    arquiteturais, preferências, objetivos e resultados anteriores
 *
 * O MemoryManager gerencia a camada 3 (Memória). Dados e Conhecimento
 * são gerenciados por outros componentes (DatabaseManager, etc.).
 *
 * A memória é volátil (em memória) nesta fundação. Persistência será
 * adicionada futuramente como um plugin de storage.
 */
export class MemoryManager implements IMemoryManager {
  private entries: MemoryEntry[] = [];
  private readonly logger: ILogger;
  private nextId = 1;

  constructor(logger: ILogger) {
    this.logger = logger.child('memory');
  }

  set(
    type: MemoryEntryType,
    scope: string,
    key: string,
    value: unknown,
    tags: string[] = [],
    ttl?: number,
  ): void {
    const entry: MemoryEntry = {
      id: `mem_${this.nextId++}`,
      type,
      scope,
      key,
      value,
      tags,
      timestamp: Date.now(),
      ttl,
    };

    // Remove entrada anterior com mesmo escopo + chave (atualização)
    const existingIndex = this.entries.findIndex(
      (e) => e.scope === scope && e.key === key,
    );
    if (existingIndex >= 0) {
      this.entries[existingIndex] = entry;
    } else {
      this.entries.push(entry);
    }

    this.logger.debug(`Memória atualizada: ${scope}:${key}`, {
      type,
      tags,
      ttl,
    });
  }

  get<T = unknown>(scope: string, key: string): T | undefined {
    this.cleanExpired();
    const entry = this.entries.find((e) => e.scope === scope && e.key === key);
    return entry?.value as T | undefined;
  }

  query(options: {
    type?: MemoryEntryType;
    scope?: string;
    tags?: string[];
    limit?: number;
  }): readonly MemoryEntry[] {
    this.cleanExpired();

    let results = [...this.entries];

    if (options.type) {
      results = results.filter((e) => e.type === options.type);
    }
    if (options.scope) {
      results = results.filter((e) => e.scope === options.scope);
    }
    if (options.tags && options.tags.length > 0) {
      results = results.filter((e) =>
        options.tags!.some((tag) => e.tags.includes(tag)),
      );
    }

    // Ordena do mais recente para o mais antigo
    results.sort((a, b) => b.timestamp - a.timestamp);

    if (options.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  delete(id: string): boolean {
    const index = this.entries.findIndex((e) => e.id === id);
    if (index < 0) return false;
    this.entries.splice(index, 1);
    this.logger.debug(`Memória removida: ${id}`);
    return true;
  }

  cleanExpired(): number {
    const now = Date.now();
    const before = this.entries.length;
    this.entries = this.entries.filter((e) => {
      if (!e.ttl) return true;
      return now - e.timestamp < e.ttl;
    });
    const removed = before - this.entries.length;
    if (removed > 0) {
      this.logger.debug(`Memórias expiradas removidas: ${removed}`);
    }
    return removed;
  }

  scopes(): readonly string[] {
    const unique = new Set(this.entries.map((e) => e.scope));
    return [...unique];
  }
}
