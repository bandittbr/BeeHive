# Build your first BeeHive app

Este guia mostra como criar uma aplicação externa que usa o BeeHive sem modificar a plataforma.

O que você vai construir:
- Uma aplicação Node.js que depende apenas de `@beehive/sdk`
- Cria workflows usando o WorkflowBuilder
- Executa workflows com mocks (sem API externa)
- Tudo sem importar o Kernel diretamente

## Pré-requisitos

- Node.js 18+
- pnpm (ou npm)
- BeeHive clonado e instalado (`pnpm install`)

## Passo 1: Criar o projeto

```bash
mkdir my-beehive-app
cd my-beehive-app
npm init -y
```

## Passo 2: Adicionar dependência

```bash
npm install @beehive/sdk
```

> Se estiver usando o monorepo local, use `"@beehive/sdk": "workspace:*"` no package.json.

## Passo 3: Criar a aplicação

```typescript
// index.ts
import { WorkflowBuilder, MockAdapter } from '@beehive/sdk';
import { Kernel } from 'beehive/kernel';

const kernel = new Kernel();
await kernel.boot();

// Mock capabilities (sem API externa)
const mocks = MockAdapter.for(kernel);
mocks.mock('chat.generate');

// Criar workflow
const workflow = WorkflowBuilder.create('my-app', 'My App')
  .onManual()
  .step('greet', 'chat.generate', { message: 'Ola {{input.name}}' }, 'response')
  .addOutput('result', '{{response.response}}')
  .build();

kernel.workflows.register(workflow);
const instance = await kernel.workflows.start('my-app', { name: 'Mundo' });

console.log(instance.stepResults?.response);
await kernel.shutdown();
```

## Passo 4: Executar

```bash
npx tsx index.ts
```

Resultado esperado:
```
{ response: "Resposta simulada para: Ola Mundo", usage: {...} }
```

## O que aconteceu

1. `Kernel.boot()` iniciou o BeeHive (descobriu plugins, registrou capabilities)
2. `MockAdapter` substituiu `chat.generate` por uma versão mock
3. `WorkflowBuilder` criou um workflow definition
4. `kernel.workflows.start()` executou o workflow
5. O resultado é um artifact com a resposta simulada

## Próximos passos

- [Plugin Development Guide](plugin-development.md) — criar plugins externos
- [SDK Reference](sdk-reference.md) — documentação completa da API
- [Hello World App](../examples/integrations/hello-world-app/) — app de exemplo
- [External Plugin](../examples/integrations/external-weather-plugin/) — plugin externo

## Prova

Se você conseguiu executar este guia sem modificar o BeeHive, a arquitetura está correta.
