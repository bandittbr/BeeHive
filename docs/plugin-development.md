# Plugin Development Guide

## Visão geral

Um plugin BeeHive é um pacote Node.js que:
- Declara capabilities no `manifest.yaml`
- Implementa cada capability como uma função `execute(input, ctx)`
- É descoberto automaticamente pelo PluginRegistry

## Estrutura

```
plugins/meu-plugin/
├── package.json
├── src/
│   ├── manifest.yaml       # Declaração do plugin e capabilities
│   ├── plugin.ts           # Classe do plugin (ativação/desativação)
│   ├── index.ts            # Re-export
│   └── capabilities/
│       ├── minha.cap.ts    # Implementação de uma capability
│       └── ...
│   └── adapters/
│       └── ...             # (opcional) Adapters para serviços externos
└── tests/
    └── meu-plugin.test.ts
```

## Scaffolding

```bash
pnpm create plugin
```

O comando pergunta o nome do plugin e gera toda a estrutura acima.

## Manifest

```yaml
# plugins/meu-plugin/src/manifest.yaml
id: meu-plugin
name: Meu Plugin
version: 1.0.0
description: Faz algo útil

capabilities:
  - id: minha.cap
    name: Minha Capability
    description: Executa uma tarefa específica
    inputs:
      - name: mensagem
        type: string
        required: true
        description: Mensagem de entrada
    outputs:
      - name: resposta
        type: string
        description: Resultado processado
    tags:
      - util
      - exemplo

adapters: []
```

## Implementando uma capability

Cada capability implementa a interface `ICapability`:

```typescript
// plugins/meu-plugin/src/capabilities/minha.cap.ts
import { CapabilityBuilder } from '@beehive/sdk';
import type { CapabilityResult, ExecutionContext } from '@beehive/sdk';

export const minhaCap = CapabilityBuilder.create('minha.cap', 'Minha Capability')
  .description('Executa uma tarefa específica')
  .input({ name: 'mensagem', type: 'string', required: true })
  .output({ name: 'resposta', type: 'string' })
  .tags(['util', 'exemplo'])
  .execute(async (input, ctx: ExecutionContext): Promise<CapabilityResult> => {
    const mensagem = input.mensagem as string;
    return {
      success: true,
      outputs: { resposta: 'Processado: ' + mensagem },
      metrics: { duration: 0 },
    };
  })
  .build();
```

## Plugin class

```typescript
// plugins/meu-plugin/src/plugin.ts
import { Plugin } from '@beehive/sdk';
import type { PluginContext } from '@beehive/sdk';
import { minhaCap } from './capabilities/minha.cap';

export class MeuPlugin extends Plugin {
  id = 'meu-plugin';
  name = 'Meu Plugin';

  async onActivate(ctx: PluginContext): Promise<void> {
    ctx.registerCapability(minhaCap);
  }

  async onDeactivate(ctx: PluginContext): Promise<void> {
    ctx.unregisterCapability('minha.cap');
  }
}
```

## Testando

### Com MockAdapter

```typescript
import { Kernel } from '../../kernel/Kernel';
import { WorkflowBuilder, MockAdapter } from '@beehive/sdk';

const kernel = new Kernel();
await kernel.boot();

const mocks = MockAdapter.for(kernel);
mocks.mock('minha.cap', { resposta: 'mockado' });

// Crie e execute um workflow que usa sua capability
```

### Validação de arquitetura

```bash
pnpm validate plugin meu-plugin
```

O validador checa:
- Manifest YAML válido
- Estrutura de diretórios correta
- Dependências corretas no package.json
- Nenhuma dependência do kernel
- Architecture score ≥ 90%

## Exemplo completo

Veja `plugins/browser/` como referência de plugin completo com:
- 3 capabilities reais (navigate, scrape, screenshot)
- Adapter para Playwright
- 20 testes
- Architecture score 100%

## Checklist para novo plugin

- [ ] `pnpm create plugin` gerou a estrutura
- [ ] `pnpm validate plugin <nome>` ≥ 90%
- [ ] Pelo menos 1 capability implementada
- [ ] Tests para cada capability
- [ ] Exemplo em `examples/<nome>/run.ts`
- [ ] Documentado na [Capability Store](capability-store.md)
- [ ] Nenhuma dependência do kernel
