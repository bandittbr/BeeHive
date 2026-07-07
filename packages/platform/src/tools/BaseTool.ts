import type {
  Tool,
  ToolCategory,
  ToolContext,
  ToolDefinition,
  ToolHealth,
  ToolInitContext,
  ToolState,
} from './types';

/**
 * Base para Tools.
 *
 * Implementa o estado autorreportado e o ciclo de vida com padrões, deixando
 * apenas `execute` para a Tool concreta. Mantém a infraestrutura enxuta. Nenhuma
 * Tool real é criada aqui.
 */
export abstract class BaseTool implements Tool {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly description: string;
  abstract readonly category: ToolCategory;
  readonly capabilities: readonly string[] = [];
  /** Sprint 20: cada Tool concreta descreve a si mesma para a IA. */
  abstract readonly definition: ToolDefinition;

  /** Estado autorreportado (o ToolManager mantém o estado oficial). */
  protected state: ToolState = 'Registered';

  initialize(_context: ToolInitContext): void {
    this.state = 'Available';
  }

  abstract execute(input: unknown, context: ToolContext): Promise<unknown>;

  health(): ToolHealth {
    return { ok: this.state !== 'Failed' };
  }
  status(): ToolState {
    return this.state;
  }
  dispose(): void {
    this.state = 'Disposed';
  }
}
