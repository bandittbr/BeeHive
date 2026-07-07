import type { KernelContext } from '../kernel';
import type { BeeHiveModule, ModuleHealth, ModuleState } from './types';

/**
 * Base para módulos.
 *
 * Fornece implementações padrão (no-op) de todo o contrato, para que um módulo
 * concreto precise declarar apenas seus metadados e dependências e sobrescrever
 * somente os hooks que realmente usar. Mantém os placeholders mínimos e evita
 * repetição (DRY), sem nenhuma regra de negócio.
 */
export abstract class BaseModule implements BeeHiveModule {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly description: string;
  readonly dependencies: readonly string[] = [];

  /** Estado autorreportado do módulo (o ModuleManager mantém o estado oficial). */
  protected state: ModuleState = 'Registered';

  registerServices(_context: KernelContext): void {}
  registerCommands(_context: KernelContext): void {}
  registerEvents(_context: KernelContext): void {}

  initialize(_context: KernelContext): void {
    this.state = 'Initializing';
  }
  start(_context: KernelContext): void {
    this.state = 'Running';
  }
  stop(_context: KernelContext): void {
    this.state = 'Stopped';
  }
  pause(_context: KernelContext): void {
    this.state = 'Paused';
  }
  resume(_context: KernelContext): void {
    this.state = 'Running';
  }
  dispose(_context: KernelContext): void {
    this.state = 'Disposed';
  }

  health(): ModuleHealth {
    return { ok: this.state !== 'Failed' };
  }
  status(): ModuleState {
    return this.state;
  }
}
