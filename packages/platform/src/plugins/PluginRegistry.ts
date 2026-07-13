import type { ILogger } from '../kernel/types';
import type { PluginRegistration } from './types';

/**
 * PluginRegistry — registro central de plugins.
 *
 * Responsabilidade única: armazenar e gerenciar o cadastro de plugins
 * disponíveis para carregamento. Não ativa plugins — apenas os mantém
 * registrados com suas fábricas e configurações padrão.
 *
 * O registro permite descoberta automática: plugins podem ser registrados
 * manualmente ou carregados a partir de diretórios.
 */
export class PluginRegistry {
  private readonly registrations = new Map<string, PluginRegistration>();
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger.child('plugin-registry');
  }

  /**
   * Registra um plugin no sistema.
   * @param registration Metadados e fábrica do plugin
   */
  register(registration: PluginRegistration): void {
    if (this.registrations.has(registration.id)) {
      throw new Error(`Plugin já registrado: ${registration.id}`);
    }
    this.registrations.set(registration.id, registration);
    this.logger.info(`Plugin registrado: ${registration.id} v${registration.version}`);
  }

  /**
   * Remove um plugin do registro.
   * @param id ID do plugin
   */
  unregister(id: string): boolean {
    const removed = this.registrations.delete(id);
    if (removed) {
      this.logger.info(`Plugin removido do registro: ${id}`);
    }
    return removed;
  }

  /**
   * Obtém um registro pelo ID.
   */
  get(id: string): PluginRegistration | undefined {
    return this.registrations.get(id);
  }

  /**
   * Lista todos os plugins registrados.
   */
  list(): PluginRegistration[] {
    return [...this.registrations.values()];
  }

  /**
   * Lista IDs de plugins que devem ser carregados automaticamente.
   */
  getAutoLoadIds(): string[] {
    return this.list()
      .filter((r) => r.autoLoad)
      .map((r) => r.id);
  }

  /**
   * Verifica se um plugin está registrado.
   */
  has(id: string): boolean {
    return this.registrations.has(id);
  }

  /**
   * Retorna o número de plugins registrados.
   */
  get size(): number {
    return this.registrations.size;
  }
}
