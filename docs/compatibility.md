# Compatibility

## Versioning

BeeHive follows **Semantic Versioning** (MAJOR.MINOR.PATCH):

| Change | Version bump | Example |
|--------|-------------|---------|
| Breaking change to public API | MAJOR | 0.1.0 → 1.0.0 |
| New feature (backward compatible) | MINOR | 0.1.0 → 0.2.0 |
| Bug fix (backward compatible) | PATCH | 0.1.0 → 0.1.1 |

## Current version

- **@beehive/sdk:** `0.1.0` (pre-1.0 — API may still change)
- **@beehive/shared:** `0.1.0` (internal — not public API)
- **Kernel:** Not versioned independently (tracks SDK)

## What is covered

```typescript
import { CapabilityBuilder, WorkflowBuilder, EventBuilder, ArtifactBuilder,
         Plugin, Capability, Artifact, PluginContext,
         MockAdapter, MockCapability,
         ICapability, IPlugin, IArtifact, ArtifactType,
         CapabilityInput, CapabilityOutput, CapabilityResult,
         ExecutionContext, WorkflowDefinition, WorkflowStepNode,
         CapabilityStep, ConditionStep, ForeachStep, ParallelStep,
         WorkflowTrigger, WorkflowInstance } from '@beehive/sdk';
```

## What is NOT covered

- Kernel implementation (`kernel/`)
- Internal types (`packages/shared/`)
- Plugin registry internals
- EventBus internals
- Any file not exported from `@beehive/sdk`

## Migration policy

1. **Patch releases** — no migration needed
2. **Minor releases** — documented migration path in release notes
3. **Major releases** — breaking changes announced 1 minor version in advance

## Plugin compatibility

Plugins must depend only on `@beehive/sdk`. If a plugin imports from any other package, it may break without notice.

```json
{
  "dependencies": {
    "@beehive/sdk": "^0.1.0"
  }
}
```

## Testing compatibility

```bash
# Run architecture tests to verify plugin compatibility
pnpm test:architecture

# Validate plugin against public API rules
pnpm validate plugin <name>

# Run workflow integration tests
pnpm test:workflows
```
