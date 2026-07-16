import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';

export class ToolExecute extends Capability {
  readonly id = 'tool.execute';
  readonly name = 'Executar Ferramenta';
  readonly description = 'Executa uma ferramenta do sistema';
  readonly inputs: CapabilityInput[] = [
    { name: 'tool', type: 'string', description: 'Nome da ferramenta', required: true },
    { name: 'args', type: 'object', description: 'Argumentos', required: true },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'result', type: 'object', description: 'Resultado da execucao' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    ctx.logger.info('ToolExecute: ' + params.tool);
    return { success: true, outputs: { result: {} }, metrics: { duration: 100 } };
  }
}
