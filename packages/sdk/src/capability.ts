import type { ICapability, CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from './types';

export type CapabilityReadiness =
  | { status: 'ready' }
  | { status: 'degraded'; reason: string; fix?: string }
  | { status: 'unavailable'; reason: string; fix?: string };

export type CapabilityHealth =
  | { status: 'healthy'; latency: number }
  | { status: 'degraded'; latency: number; reason: string; fix?: string }
  | { status: 'error'; latency: number; reason: string; fix?: string };

export abstract class Capability implements ICapability {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputs: CapabilityInput[];
  abstract readonly outputs: CapabilityOutput[];
  tags: string[] = [];
  readonly version?: string;

  abstract execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult>;

  /** Readiness: "Esta preparado para funcionar?"
   *  Verifica ambiente: binarios, runtime, dependencias.
   *  Chamado uma vez, resultado pode ser cacheado. */
  readiness(): CapabilityReadiness | Promise<CapabilityReadiness> {
    return { status: 'ready' };
  }

  /** Health: "Esta funcionando agora?"
   *  Executa um diagnostico ao vivo na capability.
   *  Chamado sob demanda pelo Health Dashboard. */
  async health(): Promise<CapabilityHealth> {
    return { status: 'healthy', latency: 0 };
  }
}
