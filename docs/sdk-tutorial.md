# SDK Tutorial

O SDK BeeHive (`@beehive/sdk`) é a única dependência que um plugin precisa. O kernel nunca é exposto.

## Instalação

```bash
pnpm add @beehive/sdk
```

## Tipos exportados

| Tipo | Descrição |
|------|-----------|
| `ICapability` | Interface de uma capability |
| `IPlugin` | Interface de um plugin |
| `IArtifact` | Interface de um artifact |
| `CapabilityInput` | Schema de input |
| `CapabilityOutput` | Schema de output |
| `CapabilityResult` | Resultado da execução |
| `ExecutionContext` | Contexto de execução (logger, events, correlationId) |
| `WorkflowDefinition` | Definição de workflow como dados |
| `WorkflowStepNode` | Step de workflow (capability, condition, foreach, parallel) |
| `WorkflowInstance` | Instância em execução |

## Builders

### CapabilityBuilder

```typescript
import { CapabilityBuilder } from '@beehive/sdk';

const cap = CapabilityBuilder.create('chat.generate', 'Gerar texto')
  .description('Gera texto usando um modelo de linguagem')
  .input({ name: 'message', type: 'string', required: true })
  .output({ name: 'response', type: 'string' })
  .tags(['ai', 'nlp'])
  .version('2.0')
  .execute(async (input, ctx) => ({
    success: true,
    outputs: { response: 'resposta' },
    metrics: { duration: 0 },
  }))
  .build();
```

### EventBuilder

```typescript
import { EventBuilder } from '@beehive/sdk';

const event = EventBuilder.create('workflow:started', 'runtime')
  .withPayload({ workflowId: '123', instanceId: 'abc' })
  .withCorrelationId('corr-1')
  .withCausationId('cause-1')
  .withPriority('high')
  .build();
```

### ArtifactBuilder

```typescript
import { ArtifactBuilder } from '@beehive/sdk';

const artifact = ArtifactBuilder.create('markdown', 'Resumo')
  .withContent('# Resumo\n\nConteudo do resumo...')
  .withMetadata({ source: 'https://example.com', tokens: 150 })
  .build();
```

### WorkflowBuilder

```typescript
import { WorkflowBuilder } from '@beehive/sdk';

const wf = WorkflowBuilder.create('summarize', 'Summarize Website')
  .describe('Extrai e resume uma URL')
  .onManual()
  .step('scrape', 'browser.scrape', { url: '{{input.url}}' }, 'page')
  .step('summarize', 'chat.generate', { message: 'Resuma: {{page.markdown}}' }, 'summary')
  .addOutput('result', '{{summary.response}}')
  .build();
```

### Controles de fluxo

```typescript
// Condition
WorkflowBuilder.create('conditional', 'Teste')
  .condition('check', '{{input.lang === "pt"}}', [
    { id: 'pt', type: 'capability', capability: 'chat.generate', input: { message: 'Ola' } },
  ], [
    { id: 'en', type: 'capability', capability: 'chat.generate', input: { message: 'Hello' } },
  ])

// Foreach
WorkflowBuilder.create('loop', 'Teste')
  .foreach('loop', '{{input.items}}', [
    { id: 'process', type: 'capability', capability: 'chat.generate', input: { message: '{{item}}' } },
  ])

// Parallel
WorkflowBuilder.create('parallel', 'Teste')
  .parallel('p1', [
    [{ id: 'a', type: 'capability', capability: 'browser.scrape', input: { url: '{{input.url}}' } }],
    [{ id: 'b', type: 'capability', capability: 'browser.screenshot', input: { url: '{{input.url}}' } }],
  ])
```

## MockAdapter

Para testar workflows sem depender de APIs externas:

```typescript
import { MockAdapter } from '@beehive/sdk';

const mocks = MockAdapter.for(kernel);

// Mock de capabilities específicas
mocks.mock('chat.generate');
mocks.mock('browser.scrape', { markdown: '# Conteudo mockado', title: 'Teste' });

// Ou mock de todas as capabilities registradas
mocks.mockAll();

// Restaura as capabilities originais
mocks.restore();
```

## Exemplo completo

Veja `examples/hello-workflow/run.ts` para o workflow mais simples possível usando o SDK.
