# ?? BeeHive OS — AI Operating System

> **Arquitetura em 6 camadas. Kernel mínimo. SDK público.**
> A menor unidade funcional é uma **Capability**.

---

## Índice

1. [Arquitetura](#1-arquitetura)
2. [Kernel (Mínimo Viável)](#2-kernel-mínimo-viável)
3. [SDK (@beehive/sdk)](#3-sdk-beehivesdk)
4. [Foundation Plugin](#4-foundation-plugin)
5. [Ordem de Implementação](#5-ordem-de-implementação)
6. [Teste Definitivo da Arquitetura](#6-teste-definitivo-da-arquitetura)
7. [Diretórios](#7-diretórios)
8. [Contratos](#8-contratos)
9. [Regras de Ouro](#9-regras-de-ouro)

---

## 1. Arquitetura

```
+----------------------------------------------------------------------+
¦                              UI                                       ¦
¦  React / Next.js. Só renderiza.                                     ¦
+----------------------------------------------------------------------+
                            ¦ HTTP / WS
+----------------------------------------------------------------------+
¦                       APPLICATION LAYER                               ¦
¦  Casos de uso (CreateVideoUseCase, ChatUseCase...)                   ¦
+----------------------------------------------------------------------+
                            ¦ CommandBus
+----------------------------------------------------------------------+
¦                            KERNEL (mínimo)                           ¦
¦                                                                      ¦
¦  ATIVOS (Fase 1):                                                    ¦
¦  +----------+ +----------+ +--------------+ +------------------+   ¦
¦  ¦ Container¦ ¦EventBus  ¦ ¦PluginRegistry ¦ ¦CapabilityRegistry¦   ¦
¦  ¦ (DI)     ¦ ¦(Eventos) ¦ ¦(Descoberta)   ¦ ¦(Quem sabe X?)   ¦   ¦
¦  +----------+ +----------+ +--------------+ +------------------+   ¦
¦  +----------+ +----------+                                          ¦
¦  ¦ Logger   ¦ ¦  Config  ¦                                          ¦
¦  +----------+ +----------+                                          ¦
¦                                                                      ¦
¦  NOT YET (Fase 2+):                                                  ¦
¦  Scheduler  ¦ WorkflowRuntime ¦ AgentRuntime ¦ ResourceManager      ¦
¦  KnowledgeGraph ¦ Secrets ¦ Metrics ¦ Permissions ¦ Memory          ¦
¦                                                                      ¦
¦  Só implementamos quando o primeiro plugin precisar.                 ¦
+----------------------------------------------------------------------+
                            ¦ resolve()
+----------------------------------------------------------------------+
¦                           PLUGINS                                     ¦
¦  Conjuntos de capabilities. Nunca conversam entre si.                ¦
¦                                                                      ¦
¦  FOUNDATION (Fase 1)                                                 ¦
¦  +-- chat.generate     ? OpenRouter ? Provider ? Artifact(Markdown) ¦
¦  +-- memory.search     ? Memory ? Artifact(JSON)                    ¦
¦  +-- tool.execute      ? ToolRegistry ? Artifact(JSON)              ¦
¦                                                                      ¦
¦  BROWSER (Fase 2)                                                    ¦
¦  +-- browser.navigate                                                 ¦
¦  +-- browser.scrape                                                   ¦
¦  +-- browser.screenshot                                               ¦
¦                                                                      ¦
¦  CONTENT (Fase 3)                                                    ¦
¦  +-- Roteiro ? Imagem ? Vídeo ? Publicação                          ¦
¦                                                                      ¦
¦  Depois: video, image, coding, research, marketing, finance          ¦
+----------------------------------------------------------------------+
                            ¦ implementa
+----------------------------------------------------------------------+
¦                          ADAPTERS                                     ¦
¦  GitHub repos adaptados. Trocar = nada muda acima.                  ¦
¦  OpenRouter  ¦ OpenAI  ¦ Ollama  ¦ Playwright  ¦ ComfyUI            ¦
+----------------------------------------------------------------------+
                            ¦ resolve()
+----------------------------------------------------------------------+
¦                          PROVIDERS                                    ¦
¦  AI: OpenAI ¦ Anthropic ¦ Gemini ¦ Groq ¦ Ollama                    ¦
¦  Browser: Playwright ¦ Puppeteer ¦ Browser Use                      ¦
+----------------------------------------------------------------------+
---

## 2. Kernel (Mínimo Viável)

O Kernel implementa APENAS o necessário para a Fase 1 funcionar.

```typescript
class Kernel {
  // Ativos desde o dia 1
  readonly container: Container;      // DI resolve dependências
  readonly events: EventBus;           // Tudo por eventos
  readonly plugins: PluginRegistry;    // Descobre e ativa plugins
  readonly capabilities: CapabilityRegistry;  // Quem sabe fazer X?
  readonly logger: Logger;             // Log estruturado
  readonly config: ConfigManager;      // Config centralizada

  // NOT YET — throw NotImplementedException
  get scheduler()       { throw NotImplemented }
  get workflows()       { throw NotImplemented }
  get agents()          { throw NotImplemented }
  get resourceManager() { throw NotImplemented }
  get knowledgeGraph()  { throw NotImplemented }
  get secrets()         { throw NotImplemented }
  get metrics()         { throw NotImplemented }
  get permissions()     { throw NotImplemented }
  get memory()          { throw NotImplemented }
  get storage()         { throw NotImplemented }
}
```

**Regra:** Um subsistema só ganha implementação quando o primeiro plugin realmente precisa dele.

---

## 3. SDK (@beehive/sdk)

Plugins NUNCA importam do Kernel. Importam apenas do SDK.

```typescript
// O que um plugin developer importa:
import { Plugin, Capability, Artifact, PluginContext } from '@beehive/sdk';
import type { ICapability, IPlugin, ArtifactType } from '@beehive/sdk';

// Exemplo de plugin:
export class MeuPlugin extends Plugin {
  async activate(ctx: PluginContext) {
    ctx.logger.info('MeuPlugin ativado!');
    ctx.capabilities.register(this.id, new MinhaCapability());
  }
}
```

O SDK é a **fronteira pública** do BeeHive. Tudo que um plugin precisa está ali.

---

## 4. Foundation Plugin

Primeiro plugin. Valida a espinha dorsal da arquitetura.

### 3 Capabilities

```yaml
chat.generate:     Mensagem ? IA ? Resposta (Artifact Markdown)
memory.search:     Query ? Memória ? Resultados (Artifact JSON)
tool.execute:      Ferramenta + Args ? Resultado (Artifact JSON)
```

### Fluxo de Validação

```
UI ? Application ? Kernel ? PluginRegistry
  ? FoundationPlugin.activate()
    ? Register 3 capabilities no CapabilityRegistry
  ? CapabilityRegistry.resolve('chat.generate')
  ? ChatGenerate.execute({ message: "Olá" })
    ? Artifact({ type: 'markdown', data: resposta })
    ? EventBus.publish({ type: 'chat:generated' })
  ? Resposta ? UI

ISSO VALIDA:
  ? Container (DI)
  ? PluginRegistry (descoberta + ativação)
  ? CapabilityRegistry (registro + resolução)
  ? PluginContext (injeção de dependências)
  ? EventBus (publicação de eventos)
  ? Logger
  ? Config
  ? Artifact (produção de saída padronizada)
  ? ExecutionContext (rastreabilidade)
```

---

## 5. Ordem de Implementação

### Fase 1: Foundation (validar arquitetura)

```
Kernel mínimo
+-- Container
+-- EventBus
+-- PluginRegistry
+-- CapabilityRegistry
+-- Logger
+-- Config

SDK
+-- Plugin base
+-- Capability base
+-- Artifact
+-- PluginContext

Foundation Plugin
+-- chat.generate  ? OpenRouter Adapter
+-- memory.search  ? stub
+-- tool.execute   ? stub

Validação: fluxo completo UI ? Artifact ? UI
```

### Fase 2: Browser + Memória

```
Kernel: ResourceManager (BrowserPool)
Browser Plugin
+-- browser.navigate
+-- browser.scrape
+-- browser.screenshot

Kernel: Memory (persistente)
Foundation: memory.search real
```

### Fase 3: Workflows

```
Kernel: WorkflowRuntime
Kernel: Scheduler

Workflow: "Pesquisar ? Roteiro ? Imagem ? Vídeo ? Publicar"
```

### Fase 4: Agentes

```
Kernel: AgentRuntime
Agent: planeja, escolhe capabilities, executa workflows, aprende
```

---

## 6. Teste Definitivo da Arquitetura

> **Se amanhã você encontrar um repositório incrível no GitHub, um desenvolvedor novo consegue criar um plugin para ele em 1-2 dias, sem tocar no Kernel?**

Se a resposta for **sim**, a arquitetura está certa.
Se a resposta for **não, preciso alterar o Kernel**, o Kernel ainda assume responsabilidades demais.

O Kernel permanece estável. O ecossistema cresce por plugins, capabilities e adapters.

---

## 7. Diretórios

```
beehive/
¦
+-- ui/                           # Renderiza. Só isso.
+-- application/                  # Casos de uso
¦
+-- kernel/                       # Estado global. Mínimo viável.
¦   +-- Kernel.ts                 # Bootstrap
¦   +-- Container/                # DI
¦   +-- EventBus/                 # Eventos
¦   +-- PluginRegistry/           # Descoberta + ciclo de vida
¦   +-- CapabilityRegistry/       # Quem sabe fazer X?
¦   +-- Logger/                   # Log estruturado
¦   +-- ConfigManager/            # Config
¦   +-- NotImplemented/           # Placeholders para Fase 2+
¦   +-- api/                      # REST / WS / MCP
¦
+-- plugins/                      # Capacidades
¦   +-- foundation/               # chat.generate, memory.search, tool.execute
¦   +-- browser/                  # navigate, scrape, screenshot
¦   +-- content/                  # workflow de conteúdo (Fase 3)
¦   +-- video/                    # Fase 4
¦   +-- image/                    # Fase 4
¦   +-- coding/                   # Fase 4
¦   +-- research/                 # Fase 4
¦   +-- business/                 # Fase 5
¦   +-- marketing/                # Fase 5
¦
+-- providers/                    # Camada mais baixa
¦   +-- ai/                       # OpenAI, Anthropic, Gemini, Ollama
¦   +-- browser/                  # Playwright, Puppeteer
¦   +-- storage/                  # S3, Local
¦   +-- embedding/                # OpenAI, Ollama
¦
+-- packages/
¦   +-- sdk/                      # @beehive/sdk — API pública
¦   +-- shared/                   # @beehive/shared — contratos internos
¦
+-- docker/
+-- package.json
```

---

## 8. Contratos

| Contrato | Localização | Dono | Purpose |
|----------|------------|------|---------|
| ICapability | shared/contracts | Plugin | Menor unidade funcional |
| IPlugin | shared/contracts | Plugin | Ciclo de vida do plugin |
| ICapabilityRegistry | shared/contracts | Kernel | "Quem sabe fazer X?" |
| IEventBus | shared/contracts | Kernel | Tudo por eventos |
| IKernel | shared/contracts | Sistema | Bootstrap + health |
| IWorkflowRuntime | shared/contracts | Kernel (Fase 3) | Executa workflows |
| IAgentRuntime | shared/contracts | Kernel (Fase 4) | Agentes que pensam |
| IAIService | shared/contracts | Kernel | Chat multi-provedor |
| IArtifact | shared/contracts | Sistema | Tudo produzido |
| IResourceManager | shared/contracts | Kernel (Fase 2) | Pools de recursos |
| IExecutionContext | shared/contracts | Sistema | Contexto de execução |
| ITracing | shared/contracts | Sistema | Spans + tracing |
| IKnowledgeGraph | shared/contracts | Kernel (Fase 4) | Grafo de relações |
| ITool | shared/contracts | Kernel | Ferramentas (uso interno) |

---

## 9. Regras de Ouro

1. **Kernel é mínimo.** Só implementa quando um plugin precisar.
2. **Plugins importam apenas @beehive/sdk.** Nunca o Kernel.
3. **Plugins nunca conversam entre si.** Só via EventBus.
4. **PluginContext expõe APENAS o que o plugin precisa.**
5. **Workflow conhece capabilities, não plugins.**
6. **Capability é a menor unidade funcional.**
7. **Tudo que o sistema produz é um Artifact.**
8. **Tool é separado de Capability.** (Tool = como, Capability = o que)
9. **Trocar adapter** = nada muda acima.
10. **ResourceManager gerencia recursos.** Plugin não gerencia nada.
11. **Kernel descobre plugins dinamicamente via manifesto.**
12. **Foundation primeiro.** Validar arquitetura antes de expandir.
13. **Teste definitivo:** Plugin novo em 1-2 dias sem tocar no Kernel.

---

## 10. Regra do Kernel Congelado

> **"Nenhuma alteração estrutural no Kernel sem uma necessidade comprovada por um plugin."**

O Kernel foi validado em 22ms de boot com o Foundation Plugin. A partir deste marco, o Kernel é considerado **CONGELADO** para alterações estruturais.

### Permissões

| Tipo | Permitido | Exige o quê? |
|------|-----------|-------------|
| Bug fix | Sim | Teste que reproduz o bug |
| Performance | Sim | Benchmark antes/depois |
| Nova dependência no PluginContext | Sim | Plugin real que comprovadamente precisa |
| Nova interface em contracts/ | Sim | Plugin real que comprovadamente precisa |
| Nova propriedade no IKernel | **NÃO** | Discussão + aprovação |
| Nova responsabilidade no Kernel | **NÃO** | Discussão + aprovação |
| Remover subsistema NotImplemented | **NÃO** | Plugin real que precisa |

### O Verdadeiro Teste

> **"Se amanhã você encontrar um repositório incrível no GitHub, um desenvolvedor novo consegue criar um plugin para ele em 1-2 dias, sem tocar no Kernel?"**

Se a resposta for **não, preciso alterar o Kernel**, o Kernel ainda assume responsabilidades demais.

### Próximo Marco

Adicionar **Browser Plugin** (browser.navigate, browser.scrape, browser.screenshot) ou **Content Plugin** (roteiro ? imagem ? vídeo) **sem tocar no Kernel**.

Se isso for possível, a arquitetura está madura.

---

## 11. Gatilhos de Arquitetura

### CI/CD

```bash
# Antes de todo merge:
pnpm test:architecture    # Testes estáticos + dinâmicos
pnpm typecheck            # Tipagem
pnpm lint                 # Estilo
```

### Testes de Arquitetura (executados automaticamente)

```bash
pnpm test:architecture
```

### Ferramentas de Desenvolvedor

```bash
pnpm inspect:capabilities   # Lista capabilities com schemas
pnpm inspect:events         # Assina EventBus em tempo real
pnpm inspect:deps           # Grafo de dependências
```

---

## 12. Policy Engine (conceito)

O Policy Engine decide **qual adapter usar** para cada capability, baseado em regras configuráveis.

### Exemplo

```
Capability: video.generate

Policy:
  if video.length < 60s  ?  VidBee Adapter
  if video.length >= 60s ?  Remotion Adapter
  default                ?  VidBee Adapter
```

### Fallback automático

```
Capability: chat.generate

Policy:
  primary:   OpenRouter
  fallback:  OpenAI
  emergency: Ollama (local)
```

Se o OpenRouter estiver fora do ar, cai para OpenAI. Se OpenAI também falhar, usa Ollama local.

### Prioridades

- **Hard requirement**: usuário escolhe o adapter explicitamente
- **Policy-based**: regras decidem baseado em inputs
- **Fallback chain**: lista ordenada de adapters

### Manifest com policy (Fase 3)

```yaml
capabilities:
  - id: video.generate
    policy:
      rules:
        - if: "input.duration < 60"
          use: vidbee
        - if: "input.duration >= 60"
          use: remotion
      fallback:
        - vidbee
        - remotion
        - builtin
```

---

## 13. Ecossistema — SDK como API Pública

A partir do Marco Zero, o BeeHive não é mais "construído" — ele é um **ecossistema** que cresce por plugins.

### O Kernel é um Produto

```bash
# Plugin developers nunca precisam disso:
import { Kernel } from "@beehive/kernel";  // PROIBIDO

# Eles só precisam disso:
import { Plugin, Capability, Artifact, CapabilityBuilder } from "@beehive/sdk";
```

O Kernel está congelado. Trate `@beehive/kernel` como uma **biblioteca pública** que nunca muda de forma que um plugin precise acompanhar.

### A SDK é a Fronteira

Tudo que um plugin developer precisa:

| Símbolo | Função |
|---------|--------|
| `Plugin` | Classe base do plugin |
| `Capability` | Classe base da capability |
| `Artifact` | Tudo que o sistema produz |
| `PluginContext` | O que o Kernel injeta no plugin |
| `ExecutionContext` | O que toda execução recebe |
| `CapabilityBuilder` | Cria capability sem classe (fluent) |
| `EventBuilder` | Cria eventos tipados |
| `ArtifactBuilder` | Cria artifacts com metadata |
| `Event` | Tipo do evento |
| `Subscription` | Assinatura para unsubscribe |

### Ferramentas do Ecossistema

```bash
# Criar um novo plugin
pnpm create plugin

# Validar um plugin existente
pnpm validate plugin <name>

# Inspecionar capabilities em runtime
pnpm inspect:capabilities

# Assistir eventos em tempo real
pnpm inspect:events

# Visualizar grafo de dependências
pnpm inspect:deps

# Garantir que nada quebrou
pnpm test:architecture
pnpm typecheck
'''

### Regra de Ouro do Ecossistema

> **"Um plugin deve conseguir ser desenvolvido sem abrir o código do Kernel."**

Se um desenvolvedor precisar abrir o Kernel para criar um plugin, provavelmente está faltando alguma abstração na SDK, não uma alteração no Kernel.

### O Verdadeiro Teste do Ecossistema

Criar um plugin que:
1. Usa Playwright para acessar um site
2. Extrai dados estruturados
3. Pede para uma IA resumir o conteúdo
4. Salva o resultado como Artifact

...sem alterar uma única linha do Kernel.

Quando isso acontecer, o BeeHive será um verdadeiro Sistema Operacional de IA.

---

## 14. Fim da Arquitetura. Início do Ecossistema.

### Regra Final

> **Nenhuma abstração nova entra no Kernel até que três plugins diferentes precisem dela.**

A partir deste commit, a arquitetura está congelada. Todo esforço vai para:

1. **Plugins** que entregam valor para o usuário
2. **SDK** que reduz o tempo de criação de plugins
3. **Workflows** que compõem capabilities em fluxos reais

### O que NÃO será mais feito

- Novas interfaces no `shared/contracts/`
- Novos subsistemas no Kernel
- Novas abstrações na SDK
- Refatorações estruturais

### O que SERÁ feito

- Browser Plugin (Sprint 1)
- Workflow Runtime (Sprint 2)
- Content Plugin (Sprint 3)
- Publisher Plugin (Sprint 4)
- Agent Runtime (Sprint 5)

### Métrica Única

> **"Isso permite ao BeeHive fazer algo novo para o usuário?"**

Se a resposta for "sim", avance.
Se a resposta for "apenas deixa a arquitetura mais elegante", coloque na lista de melhorias futuras.
