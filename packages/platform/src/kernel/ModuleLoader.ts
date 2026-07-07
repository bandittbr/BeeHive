import type { IModule, IModuleLoader, KernelContext } from './types';

/**
 * Carregador de módulos.
 *
 * Responsabilidade única: registrar módulos no sistema, chamando `register`
 * de cada um com o contexto do Kernel e anunciando o carregamento por evento.
 *
 * Não conhece nenhum módulo concreto (Conversa, Business, ...). Novos módulos
 * entram apenas sendo passados para `load` — o loader não muda.
 */
export class ModuleLoader implements IModuleLoader {
  private readonly loadedIds: string[] = [];

  async load(modules: readonly IModule[], context: KernelContext): Promise<void> {
    for (const module of modules) {
      if (this.loadedIds.includes(module.id)) continue;
      await module.register(context);
      this.loadedIds.push(module.id);
      context.events.emit('ModuleLoaded', { id: module.id, name: module.name });
      context.logger.info(`Módulo carregado: ${module.name}`, { id: module.id });
    }
  }

  loaded(): readonly string[] {
    return [...this.loadedIds];
  }
}
