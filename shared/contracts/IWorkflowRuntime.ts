import { ICapability } from './ICapability';

export interface IWorkflowRuntime {
  register(definition: WorkflowDefinition): void;
  start(workflowId: string, input: Record<string, unknown>): Promise<WorkflowInstance>;
  cancel(instanceId: string): Promise<void>;
  pause(instanceId: string): Promise<void>;
  resume(instanceId: string): Promise<void>;
  getInstance(instanceId: string): Promise<WorkflowInstance | null>;
  list(): WorkflowInstance[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  errorHandler?: string;
  timeout?: number;
}

export type WorkflowTrigger =
  | { type: 'event'; eventType: string }
  | { type: 'schedule'; cron: string }
  | { type: 'manual' };

export interface WorkflowStep {
  id: string;
  name: string;
  capability: string;        // "video.generate_shorts"
  input: Record<string, unknown>;
  output?: string;            // variável para próximo passo
  next?: string;
  onFailure?: string;
  retryCount?: number;
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentStep: string | null;
  context: Record<string, unknown>;
  startedAt: number;
  completedAt?: number;
  error?: string;
}
