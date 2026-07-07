import type { IServiceRegistry } from './types';

/**
 * Registro de serviços.
 *
 * Responsabilidade única: guardar e devolver serviços por id. É um store puro
 * (não emite eventos nem conhece o Kernel) — a coordenação e os eventos ficam
 * a cargo do Kernel, mantendo este componente coeso e substituível.
 */
export class ServiceRegistry implements IServiceRegistry {
  private readonly services = new Map<string, unknown>();

  register<T>(id: string, service: T): void {
    if (this.services.has(id)) {
      throw new Error(`Serviço já registrado: ${id}`);
    }
    this.services.set(id, service);
  }

  get<T>(id: string): T | undefined {
    return this.services.get(id) as T | undefined;
  }

  has(id: string): boolean {
    return this.services.has(id);
  }

  list(): readonly string[] {
    return [...this.services.keys()];
  }
}
