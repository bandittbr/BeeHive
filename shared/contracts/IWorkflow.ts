export interface IWorkflow {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  execute(context: WorkflowContext): Promise<WorkflowResult>;
  validate(): string[];
}

export interface WorkflowContext {
  trigger: 'manual' | 'event' | 'schedule' | 'webhook';
  input: Record<string, unknown>;
  userId?: string;
  workspaceId?: string;
  correlationId?: string;
  abortSignal?: AbortSignal;
}

export interface WorkflowResult {
  success: boolean;
  data?: unknown;
  error?: string;
  steps: WorkflowStepResult[];
  duration: number;
}

export interface WorkflowStepResult {
  stepId: string;
  status: 'success' | 'skipped' | 'failed';
  pluginId?: string;
  action?: string;
  duration: number;
  output?: unknown;
  error?: string;
}
