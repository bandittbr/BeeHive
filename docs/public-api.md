# Public API Surface

This document defines the **stable public API** of BeeHive. Everything listed here is guaranteed to maintain backward compatibility within the same major version.

## Imports

```typescript
// Public — stable, documented, tested
import {
  // Classes
  Plugin,
  Capability,
  Artifact,
  PluginContext,
  MockAdapter,
  MockCapability,

  // Builders
  CapabilityBuilder,
  EventBuilder,
  ArtifactBuilder,
  WorkflowBuilder,

  // Types
  ICapability,
  IPlugin,
  IArtifact,
  ArtifactType,
  PluginManifest,
  CapabilityInput,
  CapabilityOutput,
  CapabilityResult,
  ExecutionContext,
  WorkflowDefinition,
  WorkflowStepNode,
  CapabilityStep,
  ConditionStep,
  ForeachStep,
  ParallelStep,
  WorkflowTrigger,
  WorkflowInstance,
} from '@beehive/sdk';
```

## What is NOT public

The following are **internal** and may change without notice:

- `kernel/*` — all Kernel internals (Kernel, EventBus, PluginRegistry, CapabilityRegistry, Logger, ConfigManager, WorkflowRuntime, Container)
- `packages/shared/*` — internal shared contracts and types
- Any file imported via relative path like `../../kernel/Kernel`
- Any class or function not exported from `@beehive/sdk`

## Stability guarantee

| API category | Stability | Version |
|-------------|-----------|---------|
| SDK builders | ✅ Stable | 0.1.x |
| SDK classes (Plugin, Capability, Artifact) | ✅ Stable | 0.1.x |
| SDK types | ✅ Stable | 0.1.x |
| MockAdapter | ✅ Stable | 0.1.x |
| Kernel internals | ❌ Internal | — |
| Shared contracts | ⚠️ May change | — |

## How to depend on the public API

```json
{
  "dependencies": {
    "@beehive/sdk": "^0.1.0"
  }
}
```

Never import from `@beehive/shared`, `kernel/`, or any other internal path.
