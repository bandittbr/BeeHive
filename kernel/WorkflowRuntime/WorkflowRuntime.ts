import type { CapabilityRegistry } from '../CapabilityRegistry/CapabilityRegistry';
import type { EventBus } from '../EventBus/EventBus';
import type { Logger } from '../Logger/Logger';
import type { ExecutionContext } from '@beehive/shared';
import { EventBuilder } from '@beehive/sdk';

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  triggers: Array<{ type: string; cron?: string; eventType?: string; path?: string }>;
  steps: WorkflowStepNode[];
  outputs?: Record<string, string>;
  timeout?: number;
}

export type WorkflowStepNode = CapabilityStep | ConditionStep | ForeachStep | ParallelStep;

export interface CapabilityStep {
  id: string; type: 'capability'; capability: string; input: Record<string, string>; output?: string;
  retry?: { attempts: number; delay: number }; timeout?: number;
}

export interface ConditionStep {
  id: string; type: 'condition'; if: string; then: WorkflowStepNode[]; else?: WorkflowStepNode[];
}

export interface ForeachStep {
  id: string; type: 'foreach'; items: string; steps: WorkflowStepNode[];
}

export interface ParallelStep {
  id: string; type: 'parallel'; parallel: WorkflowStepNode[][];
}

export interface WorkflowInstance {
  id: string; workflowId: string; status: string; currentStep: string | null;
  context: Record<string, unknown>; stepResults?: Record<string, unknown>;
  startedAt: number; completedAt?: number; error?: string;
}

interface RegisteredWorkflow { definition: WorkflowDefinition; }

function resolveTemplate(template: string, ctx: Record<string, unknown>): string {
  return template.replace(/\{\{(.+?)\}\}/g, (_, key) => {
    const trimmed = key.trim();
    const parts = trimmed.split('.');
    let val: any = ctx;
    for (const part of parts) {
      if (val && typeof val === 'object') val = (val as any)[part];
      else return '{{' + trimmed + '}}';
    }
    return val !== undefined ? String(val) : '{{' + trimmed + '}}';
  });
}

export class WorkflowRuntime {
  private workflows = new Map<string, RegisteredWorkflow>();
  private instances = new Map<string, WorkflowInstance>();

  constructor(
    private capabilities: CapabilityRegistry,
    private events: EventBus,
    private logger: Logger,
  ) {}

  register(definition: WorkflowDefinition): void {
    this.workflows.set(definition.id, { definition });
    this.logger.info('Workflow registered: ' + definition.id);
    this.events.publish(EventBuilder.create('workflow:registered', 'runtime')
      .withPayload({ workflowId: definition.id, name: definition.name }).build() as any);
  }

  listDefinitions(): WorkflowDefinition[] {
    return Array.from(this.workflows.values()).map((w) => w.definition);
  }

  async start(workflowId: string, input: Record<string, unknown>): Promise<WorkflowInstance> {
    const registered = this.workflows.get(workflowId);
    if (!registered) throw new Error('Workflow not found: ' + workflowId);

    const definition = registered.definition;
    const instance: WorkflowInstance = {
      id: 'wf-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      workflowId, status: 'running', currentStep: null,
      context: { input: { ...input } }, stepResults: {}, startedAt: Date.now(),
    };

    this.instances.set(instance.id, instance);
    this.logger.info('Workflow started: ' + workflowId + ' (' + instance.id + ')');
    this.events.publish(EventBuilder.create('workflow:started', 'runtime')
      .withPayload({ workflowId, instanceId: instance.id, input }).build() as any);

    try {
      for (const step of definition.steps) {
        instance.currentStep = step.id;
        await this.executeStep(step, instance);
      }
      instance.status = 'completed';
      instance.completedAt = Date.now();
    } catch (e: any) {
      instance.status = 'failed';
      instance.error = e.message;
      instance.completedAt = Date.now();
    }

    this.events.publish(EventBuilder.create('workflow:completed', 'runtime')
      .withPayload({ workflowId, instanceId: instance.id, status: instance.status,
        duration: (instance.completedAt || Date.now()) - instance.startedAt }).build() as any);
    return instance;
  }

  private async executeStep(step: WorkflowStepNode, instance: WorkflowInstance): Promise<void> {
    this.events.publish(EventBuilder.create('workflow:step:started', 'runtime')
      .withPayload({ instanceId: instance.id, stepId: step.id, stepType: step.type }).build() as any);

    if (step.type === 'capability') await this.executeCapability(step, instance);
    else if (step.type === 'condition') await this.executeCondition(step, instance);
    else if (step.type === 'foreach') await this.executeForeach(step, instance);
    else if (step.type === 'parallel') await this.executeParallel(step, instance);

    this.events.publish(EventBuilder.create('workflow:step:completed', 'runtime')
      .withPayload({ instanceId: instance.id, stepId: step.id }).build() as any);
  }

  private async executeCapability(step: CapabilityStep, instance: WorkflowInstance): Promise<void> {
    const resolvedInput: Record<string, unknown> = {};
    for (const [key, template] of Object.entries(step.input)) {
      resolvedInput[key] = resolveTemplate(template, instance.context);
    }

    const ctx: ExecutionContext = {
      correlationId: instance.id, logger: this.logger as any, events: this.events as any,
    };

    const cap = this.capabilities.resolve(step.capability);
    const result = await cap.execute(resolvedInput, ctx);

    if (step.output && instance.stepResults) {
      instance.stepResults[step.output] = result.outputs;
      instance.context[step.output] = result.outputs;
    }
  }

  private async executeCondition(step: ConditionStep, instance: WorkflowInstance): Promise<void> {
    const resolved = resolveTemplate(step.if, instance.context);
    const isTrue = resolved === 'true' || resolved === 'yes' || resolved === '1';
    const branch = isTrue ? step.then : step.else;
    if (branch) for (const s of branch) await this.executeStep(s, instance);
  }

  private async executeForeach(step: ForeachStep, instance: WorkflowInstance): Promise<void> {
    const resolved = resolveTemplate(step.items, instance.context);
    let items: any[];
    try { items = JSON.parse(resolved); } catch { items = [resolved]; }
    if (!Array.isArray(items)) items = [items];
    for (let i = 0; i < items.length; i++) {
      instance.context['item'] = items[i];
      instance.context['index'] = i;
      for (const s of step.steps) await this.executeStep(s, instance);
    }
  }

  private async executeParallel(step: ParallelStep, instance: WorkflowInstance): Promise<void> {
    await Promise.all(step.parallel.map(async (branch) => {
      for (const s of branch) await this.executeStep(s, instance);
    }));
  }

  async cancel(instanceId: string): Promise<void> {
    const inst = this.instances.get(instanceId);
    if (inst) {
      inst.status = 'cancelled';
      inst.completedAt = Date.now();
      this.events.publish(EventBuilder.create('workflow:cancelled', 'runtime')
        .withPayload({ instanceId, workflowId: inst.workflowId }).build() as any);
    }
  }
  async pause(instanceId: string): Promise<void> {
    const inst = this.instances.get(instanceId);
    if (inst) {
      inst.status = 'paused';
      this.events.publish(EventBuilder.create('workflow:paused', 'runtime')
        .withPayload({ instanceId, workflowId: inst.workflowId }).build() as any);
    }
  }
  async resume(instanceId: string): Promise<void> {
    const inst = this.instances.get(instanceId);
    if (inst && inst.status === 'paused') {
      inst.status = 'running';
      this.events.publish(EventBuilder.create('workflow:resumed', 'runtime')
        .withPayload({ instanceId, workflowId: inst.workflowId }).build() as any);
    }
  }
  async getInstance(instanceId: string): Promise<WorkflowInstance | null> {
    return this.instances.get(instanceId) ?? null;
  }
  list(): WorkflowInstance[] {
    return Array.from(this.instances.values());
  }
}
