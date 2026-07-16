import { ICapability } from './ICapability';

export interface IWorkflowRuntime {
  register(definition: WorkflowDefinition): void;
  start(workflowId: string, input: Record<string, unknown>): Promise<WorkflowInstance>;
  cancel(instanceId: string): Promise<void>;
  pause(instanceId: string): Promise<void>;
  resume(instanceId: string): Promise<void>;
  getInstance(instanceId: string): Promise<WorkflowInstance | null>;
  list(): WorkflowInstance[];
  listDefinitions(): WorkflowDefinition[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  triggers: WorkflowTrigger[];
  steps: WorkflowStepNode[];
  outputs?: Record<string, string>;
  timeout?: number;
}

export type WorkflowTrigger =
  | { type: 'manual' }
  | { type: 'schedule'; cron: string }
  | { type: 'event'; eventType: string }
  | { type: 'webhook'; path: string };

export type WorkflowStepNode =
  | CapabilityStep
  | ConditionStep
  | ForeachStep
  | ParallelStep;

export interface CapabilityStep {
  id: string;
  type: 'capability';
  capability: string;
  input: Record<string, string>;
  output?: string;
  retry?: { attempts: number; delay: number };
  timeout?: number;
}

export interface ConditionStep {
  id: string;
  type: 'condition';
  if: string;
  then: WorkflowStepNode[];
  else?: WorkflowStepNode[];
}

export interface ForeachStep {
  id: string;
  type: 'foreach';
  items: string;
  steps: WorkflowStepNode[];
}

export interface ParallelStep {
  id: string;
  type: 'parallel';
  parallel: WorkflowStepNode[][];
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
  stepResults?: Record<string, unknown>;
}
