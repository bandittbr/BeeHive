export interface ICapability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly inputs: CapabilityInput[];
  readonly outputs: CapabilityOutput[];
  readonly tags: string[];

  execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult>;
}

export interface CapabilityInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'file' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: unknown;
}

export interface CapabilityOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'file' | 'object' | 'array';
  description: string;
}

export interface ExecutionContext {
  correlationId: string;
  userId?: string;
  workspaceId?: string;
  logger: ILogger;
  events: IEventBus;
  abortSignal?: AbortSignal;
}

export interface CapabilityResult {
  success: boolean;
  outputs: Record<string, unknown>;
  error?: string;
  metrics: {
    duration: number;
    tokensUsed?: number;
    cost?: number;
  };
}
