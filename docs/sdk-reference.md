# SDK Reference

## CapabilityBuilder

Fluent builder for creating capabilities.

```typescript
CapabilityBuilder.create(id: string, name: string)
  .description(text: string)
  .input(input: CapabilityInput)
  .output(output: CapabilityOutput)
  .tags(tags: string[])
  .version(version: string)
  .execute(handler: ExecuteHandler)
  .build(): ICapability
```

## EventBuilder

Fluent builder for creating events.

```typescript
EventBuilder.create(type: string, source: string)
  .withPayload(payload: Record<string, unknown>)
  .withCorrelationId(id: string)
  .withCausationId(id: string)
  .withPriority(priority: 'low' | 'normal' | 'high' | 'critical')
  .build(): Event
```

## ArtifactBuilder

Fluent builder for creating artifacts.

```typescript
ArtifactBuilder.create(type: ArtifactType, name: string)
  .withContent(content: string)
  .withMetadata(metadata: Record<string, unknown>)
  .build(): IArtifact
```

## WorkflowBuilder

Fluent builder for creating workflow definitions.

```typescript
WorkflowBuilder.create(id: string, name: string)
  .describe(text: string)
  .onManual()
  .onCron(cron: string)
  .onEvent(eventType: string)
  .timeout(seconds: number)
  .step(id: string, capability: string, input: Record<string, string>, outputVar?: string)
  .stepWithRetry(id, capability, input, attempts, delaySec, outputVar?)
  .condition(id, expression, thenSteps, elseSteps?)
  .foreach(id, itemsExpr, loopSteps)
  .parallel(id, branches)
  .addOutput(name: string, template: string)
  .build(): WorkflowDefinition
```

## MockAdapter

Testing utility that replaces real capabilities with mock versions.

```typescript
MockAdapter.for(kernel)                    // Create adapter from kernel
  .mock(capabilityId, outputs?)            // Mock a specific capability
  .mockAll()                               // Mock all registered capabilities
  .restore()                               // Restore original capabilities

MockCapability                             // The mock instance
  .withDelay(ms)                           // Simulate latency
  .setOutputs(outputs)                     // Change mock outputs
```

## Core Classes

### Plugin

Base class for all plugins.

```typescript
class Plugin {
  abstract id: string;
  abstract name: string;
  abstract onActivate(ctx: PluginContext): Promise<void>;
  abstract onDeactivate(ctx: PluginContext): Promise<void>;
}
```

### Capability

Base class for capabilities (alternative to CapabilityBuilder).

```typescript
class Capability implements ICapability {
  constructor(id: string, name: string, description: string, ...);
}
```

### Artifact

Represents a produced artifact with content and metadata.

```typescript
class Artifact implements IArtifact {
  readonly id: string;
  readonly type: ArtifactType;
  readonly uri: string;
  getContent(): Promise<unknown>;
}
```

### PluginContext

Context provided to plugins during activation.

```typescript
class PluginContext {
  registerCapability(capability: ICapability): void;
  unregisterCapability(capabilityId: string): void;
  publishEvent(event: Event): void;
  subscribeToEvents(type: string, handler: EventHandler): Subscription;
  getConfig(key: string): unknown;
}
```

## Types

| Type | Description |
|------|-------------|
| `ICapability` | Capability interface with id, name, description, inputs, outputs, execute() |
| `IPlugin` | Plugin interface with id, name, onActivate, onDeactivate |
| `IArtifact` | Artifact interface with id, type, uri, getContent(), getStream(), validate() |
| `ArtifactType` | Union: 'image' \| 'video' \| 'audio' \| 'document' \| 'markdown' \| 'json' \| 'csv' \| 'pdf' \| ... |
| `CapabilityInput` | `{ name: string; type: string; required?: boolean; description?: string }` |
| `CapabilityOutput` | `{ name: string; type: string; description?: string }` |
| `CapabilityResult` | `{ success: boolean; outputs: Record<string, unknown>; error?: string; metrics: { duration: number; tokensUsed?: number; cost?: number } }` |
| `ExecutionContext` | `{ correlationId: string; userId?: string; workspaceId?: string; logger: ILogger; events: IEventBus; abortSignal?: AbortSignal }` |
| `WorkflowDefinition` | Full workflow definition: id, name, version, triggers, steps, outputs, timeout |
| `WorkflowStepNode` | Union of CapabilityStep \| ConditionStep \| ForeachStep \| ParallelStep |
| `WorkflowInstance` | Running/completed instance: id, workflowId, status, context, stepResults, startedAt, completedAt |
| `PluginManifest` | Plugin metadata: id, name, version, description, capabilities, adapters |
