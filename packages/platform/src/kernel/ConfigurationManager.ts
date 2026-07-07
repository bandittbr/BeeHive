import type { EnvironmentName, IConfigurationManager } from './types';

/**
 * Gerenciador central de configuração.
 *
 * Responsabilidade única: expor configuração por leitura. Nenhum componente lê
 * variáveis de ambiente diretamente — tudo passa por aqui. Somente leitura
 * (sem persistência nesta fundação).
 */
export class ConfigurationManager implements IConfigurationManager {
  public readonly environment: EnvironmentName;
  private readonly values: Record<string, unknown>;

  constructor(environment: EnvironmentName, values: Record<string, unknown> = {}) {
    this.environment = environment;
    this.values = { ...values };
  }

  get<T = unknown>(key: string, fallback?: T): T | undefined {
    return key in this.values ? (this.values[key] as T) : fallback;
  }

  getAll(): Readonly<Record<string, unknown>> {
    return { ...this.values };
  }
}
