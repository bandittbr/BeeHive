import { Capability } from './capability';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from './types';

export class CapabilityBuilder {
  static create(id: string, name: string) {
    return new CapabilityBuilder(id, name);
  }

  private inputs: CapabilityInput[] = [];
  private outputs: CapabilityOutput[] = [];
  private description = '';
  private tags: string[] = [];
  private version: string | undefined;
  private executeFn: ((params: Record<string, unknown>, ctx: ExecutionContext) => Promise<CapabilityResult>) | null = null;

  private constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}

  describe(text: string): this { this.description = text; return this; }
  addInput(input: CapabilityInput): this { this.inputs.push(input); return this; }
  addOutput(output: CapabilityOutput): this { this.outputs.push(output); return this; }
  withTags(...tags: string[]): this { this.tags = tags; return this; }

  withVersion(v: string): this { this.version = v; return this; }

  handle(fn: (params: Record<string, unknown>, ctx: ExecutionContext) => Promise<CapabilityResult>): this {
    this.executeFn = fn;
    return this;
  }

  build(): Capability {
    if (!this.executeFn) throw new Error('CapabilityBuilder: handle() must be called before build()');
    const inputs = [...this.inputs];
    const outputs = [...this.outputs];
    const description = this.description;
    const id = this.id;
    const name = this.name;
    const tags = [...this.tags];
    const fn = this.executeFn;

    return new (class extends Capability {
      readonly id = id;
      readonly name = name;
      readonly description = description;
      readonly inputs = inputs;
      readonly outputs = outputs;
      tags = tags;
      execute(params: Record<string, unknown>, ctx: ExecutionContext) { return fn(params, ctx); }
    })();
  }
}

