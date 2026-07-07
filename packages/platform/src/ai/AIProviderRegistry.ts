import type { AICapability, AIProvider } from './types';

/**
 * Registro de provedores de IA.
 *
 * Responsabilidade única: guardar provedores e resolvê-los POR CAPACIDADE. É o
 * ponto onde os provedores serão conectados no futuro. O AIManager usa este
 * registro para não conhecer nenhum provedor concreto (baixo acoplamento).
 */
export class AIProviderRegistry {
  private readonly providers = new Map<string, AIProvider>();

  register(provider: AIProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider de IA já registrado: ${provider.id}`);
    }
    this.providers.set(provider.id, provider);
  }

  unregister(id: string): void {
    this.providers.delete(id);
  }

  get(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  list(): readonly AIProvider[] {
    return [...this.providers.values()];
  }

  /**
   * Resolve um provedor para a capacidade pedida. Se `preferredId` for informado
   * e suportar a capacidade, ele tem prioridade; senão, o primeiro que suportar.
   * A política pode evoluir sem afetar quem chama (roteamento por abstração).
   */
  findByCapability(capability: AICapability, preferredId?: string): AIProvider | undefined {
    if (preferredId) {
      const preferred = this.providers.get(preferredId);
      if (preferred && preferred.supports(capability)) return preferred;
    }
    for (const provider of this.providers.values()) {
      if (provider.supports(capability)) return provider;
    }
    return undefined;
  }
}
