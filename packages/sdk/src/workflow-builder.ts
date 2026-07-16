import type { WorkflowDefinition, WorkflowTrigger, WorkflowStepNode, CapabilityStep, ConditionStep, ForeachStep, ParallelStep } from './types';

export class WorkflowBuilder {
  static create(id: string, name: string) {
    return new WorkflowBuilder(id, name);
  }

  private triggers: WorkflowTrigger[] = [];
  private steps: WorkflowStepNode[] = [];
  private outputs: Record<string, string> = {};
  private description = '';
  private timeoutSec = 0;

  private constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}

  describe(text: string): this { this.description = text; return this; }

  onManual(): this {
    this.triggers.push({ type: 'manual' as any });
    return this;
  }

  onCron(cron: string): this {
    this.triggers.push({ type: 'schedule' as any, cron });
    return this;
  }

  onEvent(eventType: string): this {
    this.triggers.push({ type: 'event' as any, eventType });
    return this;
  }

  timeout(s: number): this { this.timeoutSec = s; return this; }

  step(id: string, capability: string, input: Record<string, string>, outputVar?: string): this {
    const step: CapabilityStep = {
      id: id as any, type: 'capability' as any, capability, input,
      ...(outputVar ? { output: outputVar } : {}),
    };
    this.steps.push(step as any);
    return this;
  }

  stepWithRetry(id: string, capability: string, input: Record<string, string>, attempts: number, delaySec: number, outputVar?: string): this {
    const step: CapabilityStep = {
      id: id as any, type: 'capability' as any, capability, input,
      output: outputVar,
      retry: { attempts, delay: delaySec },
    };
    this.steps.push(step as any);
    return this;
  }

  condition(id: string, expression: string, thenSteps: WorkflowStepNode[], elseSteps?: WorkflowStepNode[]): this {
    const step: ConditionStep = {
      id: id as any, type: 'condition' as any, if: expression, then: thenSteps,
      ...(elseSteps ? { else: elseSteps } : {}),
    };
    this.steps.push(step as any);
    return this;
  }

  foreach(id: string, itemsExpr: string, loopSteps: WorkflowStepNode[]): this {
    const step: ForeachStep = { id: id as any, type: 'foreach' as any, items: itemsExpr, steps: loopSteps };
    this.steps.push(step as any);
    return this;
  }

  parallel(id: string, branches: WorkflowStepNode[][]): this {
    const step: ParallelStep = { id: id as any, type: 'parallel' as any, parallel: branches };
    this.steps.push(step as any);
    return this;
  }

  addOutput(name: string, template: string): this {
    this.outputs[name] = template;
    return this;
  }

  build(): WorkflowDefinition {
    return {
      id: this.id,
      name: this.name,
      version: '1.0.0',
      description: this.description,
      triggers: this.triggers.length > 0 ? this.triggers : [{ type: 'manual' as any }],
      steps: this.steps,
      outputs: Object.keys(this.outputs).length > 0 ? this.outputs : undefined,
      timeout: this.timeoutSec > 0 ? this.timeoutSec : undefined,
    } as any;
  }
}
