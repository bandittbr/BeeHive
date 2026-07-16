import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';

export class MemorySearch extends Capability {
  readonly id = 'memory.search';
  readonly name = 'Buscar Memoria';
  readonly description = 'Busca na memoria do workspace';
  readonly inputs: CapabilityInput[] = [
    { name: 'query', type: 'string', description: 'Texto da busca', required: true },
    { name: 'limit', type: 'number', description: 'Limite de resultados', required: false, default: 10 },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'results', type: 'array', description: 'Resultados encontrados' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    ctx.logger.info('MemorySearch: ' + params.query);
    return { success: true, outputs: { results: [] }, metrics: { duration: 50 } };
  }
}
