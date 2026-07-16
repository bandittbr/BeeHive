import type { ICapability, CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from './types';

export type CapabilityReadiness =
  | { status: 'ready' }
  | { status: 'degraded'; reason: string; fix?: string }
  | { status: 'unavailable'; reason: string; fix?: string };

export abstract class Capability implements ICapability {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputs: CapabilityInput[];
  abstract readonly outputs: CapabilityOutput[];
  tags: string[] = [];
  readonly version?: string;

  abstract execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult>;

  readiness(): CapabilityReadiness | Promise<CapabilityReadiness> {
    return { status: 'ready' };
  }
}

