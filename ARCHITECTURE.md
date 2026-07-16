# ?? BeeHive OS � AI Operating System

> **Arquitetura em 6 camadas. Kernel m�nimo. SDK p�blico.**
> A menor unidade funcional � uma **Capability**.

---

## �ndice

1. [Arquitetura](#1-arquitetura)
2. [Kernel (M�nimo Vi�vel)](#2-kernel-m�nimo-vi�vel)
3. [SDK (@beehive/sdk)](#3-sdk-beehivesdk)
4. [Foundation Plugin](#4-foundation-plugin)
5. [Ordem de Implementa��o](#5-ordem-de-implementa��o)
6. [Teste Definitivo da Arquitetura](#6-teste-definitivo-da-arquitetura)
7. [Diret�rios](#7-diret�rios)
8. [Contratos](#8-contratos)
9. [Regras de Ouro](#9-regras-de-ouro)
10. [Regra do Kernel Congelado](#10-regra-do-kernel-congelado)
11. [Gatilhos de Arquitetura](#11-gatilhos-de-arquitetura)
12. [Policy Engine (conceito)](#12-policy-engine-conceito)
13. [Ecossistema: SDK como API Pública](#13-ecossistema--sdk-como-api-pública)
14. [Fim da Arquitetura. Início do Ecossistema.](#14-fim-da-arquitetura-início-do-ecossistema)
15. [Domain Isolation Rule](#15-domain-isolation-rule)
16. [Plugin Lifecycle](#16-plugin-lifecycle)

---

## 1. Arquitetura

```
                    BeeHive OS

                  ┌─────────────┐
                  │     UI      │
                  │  React/Next │
                  └──────┬──────┘
                         │ HTTP / WS
                  ┌──────┴──────┐
                  │ Application │
                  │    Layer    │
                  └──────┬──────┘
                         │
                  ┌──────┴──────┐
                  │    Kernel    │  ← congelado
                  │              │
                  │ Container    │
                  │ EventBus     │
                  │ PluginReg    │
                  │ CapReg       │
                  │ Logger       │
                  │ Config       │
                  └──────┬──────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
      ┌───┴───┐    ┌─────┴─────┐  ┌────┴────┐
      │ Plugins│    │ Runtime   │  │Providers│
      │       │    │ Services  │  │         │
      │Browser│    │ProvReg    │  │Mock     │
      │Found. │    │ProvRouter │  │OpenAI   │
      │Weather│    │           │  │Ollama   │
      └───────┘    └───────────┘  └─────────┘
          │              │              │
          └──────────────┼──────────────┘
                         │
                    ┌────┴────┐
                    │Artifacts│
                    └─────────┘
```

### Fases

| Fase | Nome | Status |
|------|------|--------|
| 1 | Arquitetura | ✅ concluída |
| 2 | Validação | ✅ concluída |
| 3 | Ecossistema | ✅ concluída |
| 4 | Capabilities Reais | ⬅️ atual |
| 5 | Aplicações Reais | ⏳ planejada |

### Regra da fase atual

> Nenhuma abstração nova entra sem que dois plugins reais tenham precisado dela.
> O Kernel continua congelado. A arquitetura só muda se um Hard Invariant exigir.
+----------------------------------------------------------------------+
�                          PROVIDERS                                    �
�  AI: OpenAI � Anthropic � Gemini � Groq � Ollama                    �
�  Browser: Playwright � Puppeteer � Browser Use                      �
+----------------------------------------------------------------------+
---

## 2. Kernel (M�nimo Vi�vel)

O Kernel implementa APENAS o necess�rio para a Fase 1 funcionar.

```typescript
class Kernel {
  // Ativos desde o dia 1
  readonly container: Container;      // DI resolve depend�ncias
  readonly events: EventBus;           // Tudo por eventos
  readonly plugins: PluginRegistry;    // Descobre e ativa plugins
  readonly capabilities: CapabilityRegistry;  // Quem sabe fazer X?
  readonly logger: Logger;             // Log estruturado
  readonly config: ConfigManager;      // Config centralizada

  // NOT YET � throw NotImplementedException
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

**Regra:** Um subsistema s� ganha implementa��o quando o primeiro plugin realmente precisa dele.

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

O SDK � a **fronteira p�blica** do BeeHive. Tudo que um plugin precisa est� ali.

---

## 4. Foundation Plugin

Primeiro plugin. Valida a espinha dorsal da arquitetura.

### 3 Capabilities

```yaml
chat.generate:     Mensagem ? IA ? Resposta (Artifact Markdown)
memory.search:     Query ? Mem�ria ? Resultados (Artifact JSON)
tool.execute:      Ferramenta + Args ? Resultado (Artifact JSON)
```

### Fluxo de Valida��o

```
UI ? Application ? Kernel ? PluginRegistry
  ? FoundationPlugin.activate()
    ? Register 3 capabilities no CapabilityRegistry
  ? CapabilityRegistry.resolve('chat.generate')
  ? ChatGenerate.execute({ message: "Ol�" })
    ? Artifact({ type: 'markdown', data: resposta })
    ? EventBus.publish({ type: 'chat:generated' })
  ? Resposta ? UI

ISSO VALIDA:
  ? Container (DI)
  ? PluginRegistry (descoberta + ativa��o)
  ? CapabilityRegistry (registro + resolu��o)
  ? PluginContext (inje��o de depend�ncias)
  ? EventBus (publica��o de eventos)
  ? Logger
  ? Config
  ? Artifact (produ��o de sa�da padronizada)
  ? ExecutionContext (rastreabilidade)
```

---

## 5. Ordem de Implementa��o

### Fase 1: Foundation (validar arquitetura)

```
Kernel m�nimo
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

Valida��o: fluxo completo UI ? Artifact ? UI
```

### Fase 2: Browser + Mem�ria

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

Workflow: "Pesquisar ? Roteiro ? Imagem ? V�deo ? Publicar"
```

### Fase 4: Agentes

```
Kernel: AgentRuntime
Agent: planeja, escolhe capabilities, executa workflows, aprende
```

---

## 6. Teste Definitivo da Arquitetura

> **Se amanh� voc� encontrar um reposit�rio incr�vel no GitHub, um desenvolvedor novo consegue criar um plugin para ele em 1-2 dias, sem tocar no Kernel?**

Se a resposta for **sim**, a arquitetura est� certa.
Se a resposta for **n�o, preciso alterar o Kernel**, o Kernel ainda assume responsabilidades demais.

O Kernel permanece est�vel. O ecossistema cresce por plugins, capabilities e adapters.

---

## 7. Diret�rios

```
beehive/
�
+-- ui/                           # Renderiza. S� isso.
+-- application/                  # Casos de uso
�
+-- kernel/                       # Estado global. M�nimo vi�vel.
�   +-- Kernel.ts                 # Bootstrap
�   +-- Container/                # DI
�   +-- EventBus/                 # Eventos
�   +-- PluginRegistry/           # Descoberta + ciclo de vida
�   +-- CapabilityRegistry/       # Quem sabe fazer X?
�   +-- Logger/                   # Log estruturado
�   +-- ConfigManager/            # Config
�   +-- NotImplemented/           # Placeholders para Fase 2+
�   +-- api/                      # REST / WS / MCP
�
+-- plugins/                      # Capacidades
�   +-- foundation/               # chat.generate, memory.search, tool.execute
�   +-- browser/                  # navigate, scrape, screenshot
�   +-- content/                  # workflow de conte�do (Fase 3)
�   +-- video/                    # Fase 4
�   +-- image/                    # Fase 4
�   +-- coding/                   # Fase 4
�   +-- research/                 # Fase 4
�   +-- business/                 # Fase 5
�   +-- marketing/                # Fase 5
�
+-- providers/                    # Camada mais baixa
�   +-- ai/                       # OpenAI, Anthropic, Gemini, Ollama
�   +-- browser/                  # Playwright, Puppeteer
�   +-- storage/                  # S3, Local
�   +-- embedding/                # OpenAI, Ollama
�
+-- packages/
�   +-- sdk/                      # @beehive/sdk � API p�blica
�   +-- shared/                   # @beehive/shared � contratos internos
�
+-- docker/
+-- package.json
```

---

## 8. Contratos

| Contrato | Localiza��o | Dono | Purpose |
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
| IExecutionContext | shared/contracts | Sistema | Contexto de execu��o |
| ITracing | shared/contracts | Sistema | Spans + tracing |
| IKnowledgeGraph | shared/contracts | Kernel (Fase 4) | Grafo de rela��es |
| ITool | shared/contracts | Kernel | Ferramentas (uso interno) |

---

## 9. Regras de Ouro

1. **Kernel � m�nimo.** S� implementa quando um plugin precisar.
2. **Plugins importam apenas @beehive/sdk.** Nunca o Kernel.
3. **Plugins nunca conversam entre si.** S� via EventBus.
4. **PluginContext exp�e APENAS o que o plugin precisa.**
5. **Workflow conhece capabilities, n�o plugins.**
6. **Capability � a menor unidade funcional.**
7. **Tudo que o sistema produz � um Artifact.**
8. **Tool � separado de Capability.** (Tool = como, Capability = o que)
9. **Trocar adapter** = nada muda acima.
10. **ResourceManager gerencia recursos.** Plugin n�o gerencia nada.
11. **Kernel descobre plugins dinamicamente via manifesto.**
12. **Foundation primeiro.** Validar arquitetura antes de expandir.
13. **Teste definitivo:** Plugin novo em 1-2 dias sem tocar no Kernel.

---

## 10. Regra do Kernel Congelado

> **"Nenhuma altera��o estrutural no Kernel sem uma necessidade comprovada por um plugin."**

O Kernel foi validado em 22ms de boot com o Foundation Plugin. A partir deste marco, o Kernel � considerado **CONGELADO** para altera��es estruturais.

### Permiss�es

| Tipo | Permitido | Exige o qu�? |
|------|-----------|-------------|
| Bug fix | Sim | Teste que reproduz o bug |
| Performance | Sim | Benchmark antes/depois |
| Nova depend�ncia no PluginContext | Sim | Plugin real que comprovadamente precisa |
| Nova interface em contracts/ | Sim | Plugin real que comprovadamente precisa |
| Nova propriedade no IKernel | **N�O** | Discuss�o + aprova��o |
| Nova responsabilidade no Kernel | **N�O** | Discuss�o + aprova��o |
| Remover subsistema NotImplemented | **N�O** | Plugin real que precisa |

### O Verdadeiro Teste

> **"Se amanh� voc� encontrar um reposit�rio incr�vel no GitHub, um desenvolvedor novo consegue criar um plugin para ele em 1-2 dias, sem tocar no Kernel?"**

Se a resposta for **n�o, preciso alterar o Kernel**, o Kernel ainda assume responsabilidades demais.

### Pr�ximo Marco

Adicionar **Browser Plugin** (browser.navigate, browser.scrape, browser.screenshot) ou **Content Plugin** (roteiro ? imagem ? v�deo) **sem tocar no Kernel**.

Se isso for poss�vel, a arquitetura est� madura.

---

## 11. Gatilhos de Arquitetura

### CI/CD

```bash
# Antes de todo merge:
pnpm test:architecture    # Testes est�ticos + din�micos
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
pnpm inspect:deps           # Grafo de depend�ncias
```

---

## 12. Policy Engine (conceito)

O Policy Engine decide **qual adapter usar** para cada capability, baseado em regras configur�veis.

### Exemplo

```
Capability: video.generate

Policy:
  if video.length < 60s  ?  VidBee Adapter
  if video.length >= 60s ?  Remotion Adapter
  default                ?  VidBee Adapter
```

### Fallback autom�tico

```
Capability: chat.generate

Policy:
  primary:   OpenRouter
  fallback:  OpenAI
  emergency: Ollama (local)
```

Se o OpenRouter estiver fora do ar, cai para OpenAI. Se OpenAI tamb�m falhar, usa Ollama local.

### Prioridades

- **Hard requirement**: usu�rio escolhe o adapter explicitamente
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

## 13. Ecossistema � SDK como API P�blica

A partir do Marco Zero, o BeeHive n�o � mais "constru�do" � ele � um **ecossistema** que cresce por plugins.

### O Kernel � um Produto

```bash
# Plugin developers nunca precisam disso:
import { Kernel } from "@beehive/kernel";  // PROIBIDO

# Eles s� precisam disso:
import { Plugin, Capability, Artifact, CapabilityBuilder } from "@beehive/sdk";
```

O Kernel est� congelado. Trate `@beehive/kernel` como uma **biblioteca p�blica** que nunca muda de forma que um plugin precise acompanhar.

### A SDK � a Fronteira

Tudo que um plugin developer precisa:

| S�mbolo | Fun��o |
|---------|--------|
| `Plugin` | Classe base do plugin |
| `Capability` | Classe base da capability |
| `Artifact` | Tudo que o sistema produz |
| `PluginContext` | O que o Kernel injeta no plugin |
| `ExecutionContext` | O que toda execu��o recebe |
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

# Visualizar grafo de depend�ncias
pnpm inspect:deps

# Garantir que nada quebrou
pnpm test:architecture
pnpm typecheck
'''

### Regra de Ouro do Ecossistema

> **"Um plugin deve conseguir ser desenvolvido sem abrir o c�digo do Kernel."**

Se um desenvolvedor precisar abrir o Kernel para criar um plugin, provavelmente est� faltando alguma abstra��o na SDK, n�o uma altera��o no Kernel.

### O Verdadeiro Teste do Ecossistema

Criar um plugin que:
1. Usa Playwright para acessar um site
2. Extrai dados estruturados
3. Pede para uma IA resumir o conte�do
4. Salva o resultado como Artifact

...sem alterar uma �nica linha do Kernel.

Quando isso acontecer, o BeeHive ser� um verdadeiro Sistema Operacional de IA.

---

## 14. Fim da Arquitetura. In�cio do Ecossistema.

### Regra Final

> **Nenhuma abstra��o nova entra no Kernel at� que tr�s plugins diferentes precisem dela.**

A partir deste commit, a arquitetura est� congelada. Todo esfor�o vai para:

1. **Plugins** que entregam valor para o usu�rio
2. **SDK** que reduz o tempo de cria��o de plugins
3. **Workflows** que comp�em capabilities em fluxos reais

### O que N�O ser� mais feito

- Novas interfaces no `shared/contracts/`
- Novos subsistemas no Kernel
- Novas abstra��es na SDK
- Refatora��es estruturais

### O que SER� feito

- Browser Plugin (Sprint 1)
- Workflow Runtime (Sprint 2)
- Content Plugin (Sprint 3)
- Publisher Plugin (Sprint 4)
- Agent Runtime (Sprint 5)

### M�trica �nica

> **"Isso permite ao BeeHive fazer algo novo para o usu�rio?"**

Se a resposta for "sim", avance.
Se a resposta for "apenas deixa a arquitetura mais elegante", coloque na lista de melhorias futuras.

---

## 15. Domain Isolation Rule

O Kernel BeeHive **nunca** deve conter conhecimento de domínio.

### Proibido dentro do Core

- Regras de negócio
- Workflows específicos de indústria
- Lógica específica de cliente
- Entidades específicas de aplicação
- Termos de domínio (ex: "pedido", "produto", "aula", "afiliado")

### Onde o domínio vive

```
apps/           → Aplicações reais (ex: apps/web, apps/api)
examples/       → Demonstrações do BeeHive (genéricas)
examples/integrations/ → Aplicações externas construídas sobre o BeeHive
case-studies/   → Documentação de casos de uso (nunca código)
plugins/        → Capabilities genéricas (sem domínio)
```

### Regra

> **Domain logic belongs to applications built on top of BeeHive.**

Se uma capability nova parece específica de um domínio, pergunte:

1. Essa capability serve para **qualquer** aplicação? → Vai para `plugins/`
2. Essa capability só serve para **um** domínio? → Vai para a aplicação externa ou `examples/integrations/`

---

## 16. Plugin Lifecycle

Cada plugin BeeHive passa por um ciclo de vida gerenciado em 7 estágios:

```
 1. Discovery
    |
 2. Registration
    |
 3. Validation
    |
 4. Readiness Check  ← separado de Health
    |
 5. Activation
    |
 6. Execution
    |
 7. Health Monitoring  ← separado de Readiness
    |
 8. Shutdown
```

### 16.1 Discovery

O PluginRegistry varre `plugins/*/src/manifest.yaml` e registra automaticamente.
Plugins externos podem ser adicionados via configuração.

### 16.2 Registration

O plugin informa suas capabilities ao `ICapabilityRegistry`.
A partir deste momento, o Kernel sabe que a capability existe — mas **não a executa** até o readiness check.

### 16.3 Validation

O manifesto é validado: nome, versão, capabilities declaradas têm implementação,
adapters existem, permissões são registradas. → `pnpm test:architecture` (Test 1, 2)

### 16.4 Readiness Check

O plugin responde: *"Você está preparado para funcionar?"*

```
CapabilityReadiness:
  ready       → pode executar agora
  degraded    → funciona com limitações (ex: cache frio)
  unavailable → não pode executar (ex: Chromium ausente)
```

Readiness é **assíncrono** e verifica dependências do ambiente (binários, runtime, memória).
O Kernel NÃO resolve dependências — apenas pergunta e recebe `ready | degraded | unavailable`.

### 16.5 Activation

`activate(ctx)` é chamado. O plugin inicializa suas capabilities, conecta adapters,
registra eventos. Após activation, o plugin está ativo e abilities podem ser executadas.

### 16.6 Execution

Capabilities são executadas sob demanda via `capability.execute(params, ctx)`.
O ExecutionContext provê logger, eventos, IA, memória, storage, config, permissões.

### 16.7 Health Monitoring

Separado de Readiness. Health pergunta: *"Está funcionando agora?"*

```
Readiness: "Chromium está instalado?"
Health:    "browser.scrape respondeu em 350ms?"
```

O Health Dashboard executa diagnóstico ao vivo em cada capability.

### 16.8 Shutdown

`deactivate()` é chamado. Conexões são fechadas, recursos liberados.

### Responsabilidades

```
Kernel:       orquestra o ciclo de vida, pergunta readiness
              NUNCA instala dependências
Plugin:       declara requisitos no manifest.yaml
              implementa readiness() e health check próprio
              resolve seu próprio ambiente
Lifecycle Manager: (futuro) automatiza setup/install baseado no manifesto
```

### Exemplo: Browser Plugin

```
1. Discovery     → plugins/browser/src/manifest.yaml encontrado
2. Registration  → browser.navigate, browser.scrape, browser.screenshot
3. Validation    → 3 .ts files existem, manifest OK
4. Readiness     → healthCheck() detecta Chromium
                     presente  → ready
                     ausente   → unavailable + fix: "pnpm browser:setup"
5. Activation    → PlaywrightAdapter inicializado
6. Execution     → capabilities executam via Playwright
7. Health        → Health Dashboard monitora latência
8. Shutdown      → browser.close()
```
