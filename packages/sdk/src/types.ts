export type {
  ICapability, IPlugin, IArtifact,
  ArtifactType, PluginManifest, PluginContext,
  CapabilityInput, CapabilityOutput, CapabilityResult,
  ExecutionContext,
  IProvider, IProviderRegistry, ProviderPolicy,
  ProviderReadiness, ProviderHealth,
  Event,
  WorkflowDefinition, WorkflowTrigger, WorkflowInstance,
} from '@beehive/shared';

export type WorkflowStepNode = CapabilityStep | ConditionStep | ForeachStep | ParallelStep;

export interface CapabilityStep {
  id: string;
  type: 'capability';
  capability: string;
  input: Record<string, string>;
  output?: string;
  retry?: { attempts: number; delay: number };
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
