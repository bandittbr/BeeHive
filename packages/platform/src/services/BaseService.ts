import type { BeeHiveService, ServiceContext, ServiceHealth, ServiceState } from './types';

/**
 * Base para Services.
 *
 * Implementa o ciclo de vida com no-ops e o estado autorreportado, para que um
 * Service concreto declare apenas metadados e sobrescreva o que usar. Mantém a
 * infraestrutura enxuta (DRY). Nenhuma regra de negócio aqui.
 */
export abstract class BaseService implements BeeHiveService {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly version: string;

  /** Estado autorreportado (o ServiceManager mantém o estado oficial). */
  protected state: ServiceState = 'Registered';

  initialize(_context: ServiceContext): void {
    this.state = 'Initializing';
  }
  start(_context: ServiceContext): void {
    this.state = 'Running';
  }
  stop(_context: ServiceContext): void {
    this.state = 'Stopped';
  }
  dispose(_context: ServiceContext): void {
    this.state = 'Disposed';
  }

  health(): ServiceHealth {
    return { ok: this.state !== 'Failed' };
  }
  status(): ServiceState {
    return this.state;
  }
}
