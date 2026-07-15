export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  errorHandling?: ErrorHandlingStrategy;
  timeout?: number;
  maxRetries?: number;
  metadata?: Record<string, unknown>;
}

export type WorkflowTrigger =
  | { type: 'event'; eventType: string; filter?: string }
  | { type: 'schedule'; cron: string }
  | { type: 'webhook'; path: string; method?: string }
  | { type: 'manual' };

export interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  config: Record<string, unknown>;
  next?: string;
  onFailure?: string;
  retryCount?: number;
  timeout?: number;
}

export type WorkflowStepType =
  | 'action'
  | 'condition'
  | 'parallel'
  | 'foreach'
  | 'wait'
  | 'subworkflow'
  | 'llm'
  | 'tool'
  | 'emit-event'
  | 'webhook';

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  context: Record<string, unknown>;
  currentStep: string | null;
  startedAt: number;
  completedAt?: number;
  error?: string;
  progress: number;
}

export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timed_out';

export interface ErrorHandlingStrategy {
  onError: 'stop' | 'skip' | 'retry' | 'goto-step';
  retryDelay?: number;
  maxRetries?: number;
  fallbackStepId?: string;
}

export interface WorkflowExecutionResult {
  instanceId: string;
  status: WorkflowStatus;
  duration: number;
  stepsCompleted: number;
  stepsFailed: number;
  error?: string;
  context: Record<string, unknown>;
}

export interface IWorkflowEngine {
  register(workflow: WorkflowDefinition): void;
  unregister(workflowId: string): void;

  start(
    workflowId: string,
    context?: Record<string, unknown>
  ): Promise<WorkflowInstance>;
  cancel(instanceId: string): Promise<void>;
  pause(instanceId: string): Promise<void>;
  resume(instanceId: string): Promise<void>;

  getInstance(instanceId: string): Promise<WorkflowInstance | null>;
  listInstances(
    workflowId?: string,
    status?: WorkflowStatus
  ): Promise<WorkflowInstance[]>;
}
