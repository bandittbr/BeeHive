import type {
  AICapability,
  AIContext,
  AIProvider,
  AIProviderHealth,
  AIRequest,
  AIResponse,
} from './types';

/**
 * Base para provedores de IA.
 *
 * Implementa `supports` (a partir da lista de capacidades) e `health`, deixando
 * `execute` (e o opcional `stream`) para o provedor concreto. Nenhum provedor é
 * criado aqui — apenas o esqueleto para os futuros.
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly capabilities: readonly AICapability[];

  supports(capability: AICapability): boolean {
    return this.capabilities.includes(capability);
  }

  abstract execute(request: AIRequest, context: AIContext): Promise<AIResponse>;

  health(): AIProviderHealth {
    return { ok: true };
  }
}
