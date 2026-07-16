# ?? BeeHive OS — AI Operating System

> **Kernel + Capability Registry + Workflow Runtime + Agent Runtime**
> A menor unidade funcional é uma Capability, não um plugin.

---

## 1. As 6 Camadas

```
+---------------------------------------------------------------------+
¦                              UI                                      ¦
¦  React / Next.js / TailwindCSS / shadcn/ui                          ¦
¦  Só renderiza. Nunca conversa com plugins.                          ¦
¦  Dashboard ¦ Conversa ¦ Projetos ¦ Negócios ¦ Conteúdo              ¦
¦  Automações ¦ Agentes ¦ Configurações                               ¦
+---------------------------------------------------------------------+
                           ¦ HTTP / WS
+---------------------------------------------------------------------+
¦                       APPLICATION LAYER                              ¦
¦  Casos de uso que orquestram o Kernel                               ¦
¦  CreateVideoUseCase ¦ ChatUseCase ¦ CreateWorkflowUseCase           ¦
¦  Só conversa com o Kernel. Nunca com plugins.                      ¦
+---------------------------------------------------------------------+
                           ¦ CommandBus / QueryBus
+---------------------------------------------------------------------+
¦                            KERNEL                                    ¦
¦  Única parte que conhece o estado global do sistema.                ¦
¦                                                                      ¦
¦  Kernel                                                              ¦
¦  +-- EventBus          ? Tudo acontece por eventos                  ¦
¦  +-- Container (DI)    ? resolve(Plugin) sem new                    ¦
¦  +-- ConfigManager     ? Config centralizada                        ¦
¦  +-- Logger            ? Log estruturado                            ¦
¦  +-- Metrics           ? Métricas do sistema                        ¦
¦  +-- Secrets           ? Credenciais criptografadas                 ¦
¦  +-- PermissionManager ? Controle de acesso                         ¦
¦  +-- MemoryRegistry    ? Gerenciamento de memória                   ¦
¦  +-- PluginRegistry    ? Descoberta + ciclo de vida                 ¦
¦  +-- CapabilityRegistry ? ? Quem sabe fazer X?                     ¦
¦  +-- Scheduler         ? Cron / intervalo                           ¦
¦  +-- WorkflowRuntime   ? Executa workflows                          ¦
¦  +-- AgentRuntime      ? Agentes que pensam e decidem               ¦
¦                                                                      ¦
¦  NUNCA exposto para plugins. Apenas PluginContext.                  ¦
+---------------------------------------------------------------------+
                           ¦ PluginRegistry.resolve()
+---------------------------------------------------------------------+
¦                           PLUGINS                                    ¦
¦  Conjuntos de capabilities. Nunca conversam entre si.               ¦
¦                                                                      ¦
¦  VideoPlugin ¦ ImagePlugin ¦ ChatPlugin ¦ BrowserPlugin              ¦
¦  ShortsPlugin ¦ CodingPlugin ¦ BusinessPlugin ¦ ResearchPlugin       ¦
¦                                                                      ¦
¦  Recebem PluginContext com ONLY o que precisam.                     ¦
¦  context.ai ¦ context.events ¦ context.storage ¦ context.logger      ¦
¦  context.memory ¦ context.workflow ¦ context.config                  ¦
¦  context.capabilities ¦ context.permissions                          ¦
+---------------------------------------------------------------------+
                           ¦ AdapterManager.resolve()
+---------------------------------------------------------------------+
¦                          ADAPTERS                                    ¦
¦  Projetos GitHub adaptados. Trocar = nada muda acima.               ¦
¦  MoneyPrinterTurbo ¦ VidBee ¦ ComfyUI ¦ Browser Use ¦ OpenHands     ¦
+---------------------------------------------------------------------+
                           ¦ ProviderManager.resolve()
+---------------------------------------------------------------------+
¦                          PROVIDERS                                   ¦
¦  AI: OpenAI ¦ Anthropic ¦ Gemini ¦ Groq ¦ Ollama                    ¦
¦  Browser: Playwright ¦ Puppeteer ¦ Browser Use ¦ Stagehand          ¦
¦  Storage: S3 ¦ Local ¦ Redis                                        ¦
+---------------------------------------------------------------------+
```

---

## 2. Capability Registry (O Diferencial)

A menor unidade funcional do BeeHive é uma **Capability**, não um plugin.

```yaml
# Exemplos de capabilities
- id: video.generate_shorts
  inputs:
    - url (string, required)
    - duration (number, default: 60)
  outputs:
    - clips (array)
    - metadata (object)

- id: image.generate
  inputs:
    - prompt (string, required)
    - width (number, default: 1024)
  outputs:
    - images (array)

- id: browser.scrape
  inputs:
    - url (string, required)
  outputs:
    - content (string)
    - markdown (string)

- id: youtube.upload
  inputs:
    - video (file)
    - title (string)
    - description (string)
  outputs:
    - url (string)
```

### Como funciona

```
Workflow precisa gerar vídeo
  ? CapabilityRegistry.find("gerar vídeo")
    ? [video.generate_shorts, video.render, video.thumbnail]
  ? Workflow escolhe video.generate_shorts
  ? CapabilityRegistry.resolve("video.generate_shorts")
    ? VideoPlugin ? MoneyPrinterTurbo
  ? Executa

O Workflow NUNCA conhece o plugin.
O Workflow NUNCA conhece o adapter.
O Workflow só conhece a CAPABILITY.
```

---

## 3. PluginContext (Plugins não enxergam o Kernel)

```typescript
interface PluginContext {
  capabilities: ICapabilityRegistry;  // registrar/consultar
  events: IEventBus;                   // publicar/assinar
  storage: IStorage;                   // arquivos
  logger: ILogger;                     // logar
  memory: IMemory;                     // memorizar
  ai: IAIService;                      // conversar
  config: IConfigService;              // configurar
  permissions: IPermissionService;     // autorizar
  workflow: IWorkflowService;          // iniciar workflows
}

// Plugin NUNCA faz:
plugin.kernel.aiManager.chat(...)         // ?
plugin.core.doSomething()                 // ?

// Plugin SEMPRE faz:
context.ai.execute(req)                   // ?
context.events.publish(event)             // ?
context.logger.info("feito")              // ?
```

---

## 4. Event Bus (Tudo por Eventos)

```
USER_CREATED_PROJECT
  ? WorkflowStarted
    ? VideoRequested
      ? VideoGenerated
        ? VideoPublished
          ? AnalyticsUpdated

Nenhum plugin chama outro plugin.
Todo mundo apenas PUBLICA EVENTOS.
```

---

## 5. Workflow Runtime vs Agent Runtime

### Workflow (executa tarefas)
```yaml
workflow: gerar_shorts_diario
trigger:
  schedule: "0 8 * * *"
steps:
  - id: pesquisar
    capability: research.search
    input: { topic: "IA trends" }
  - id: roteiro
    capability: chat.converse
    input: { message: "Crie roteiro com base em: {pesquisar.output}" }
  - id: video
    capability: video.generate_shorts
    input: { script: "{roteiro.output}" }
  - id: publicar
    capability: youtube.upload
    input: { video: "{video.output}" }
```

### Agent (pensa, decide, planeja, executa workflows)
```
Agente recebe objetivo: "Crie um canal de shorts sobre IA"
  ? AgentRuntime.spawn("criador-conteudo", objetivo)
    ? Agent pensa: "Preciso de: pesquisa ? roteiro ? video ? thumbnail ? publish"
    ? Agent planeja: [research, chat, video, image, browser]
    ? Agent executa workflows
    ? Agent aprende com resultados
    ? Agent repete autonomamente
```

---

## 6. Estrutura de Diretórios

```
beehive/
¦
+-- ui/                        # Renderiza. Só isso.
+-- application/               # Casos de uso
+-- kernel/                    # Estado global do sistema
¦   +-- Kernel.ts
¦   +-- Container.ts           # DI Container
¦   +-- EventBus.ts
¦   +-- Scheduler.ts
¦   +-- ConfigManager.ts
¦   +-- Logger.ts
¦   +-- Metrics.ts
¦   +-- Secrets.ts
¦   +-- PermissionManager.ts
¦   +-- MemoryRegistry.ts
¦   +-- PluginRegistry.ts
¦   +-- CapabilityRegistry.ts  # ?
¦   +-- WorkflowRuntime.ts
¦   +-- AgentRuntime.ts
¦   +-- api/                   # REST/WS/MCP
¦
+-- plugins/                   # Conjuntos de capabilities
¦   +-- video/     ? video.generate_shorts, video.render
¦   +-- image/     ? image.generate, image.upscale
¦   +-- chat/      ? chat.converse, chat.converse_stream
¦   +-- browser/   ? browser.browse, browser.scrape
¦   +-- shorts/    ? shorts.download, shorts.transcribe
¦   +-- coding/    ? coding.review, coding.generate
¦   +-- research/  ? research.search, research.summarize
¦   +-- business/  ? business.plan, business.analyze
¦   +-- marketing/ ? marketing.campaign, marketing.seo
¦   +-- finance/   ? finance.analyze, finance.report
¦       +-- src/
¦           +-- plugin.ts       # activate(context: PluginContext)
¦           +-- manifest.yaml   # capabilities, adapters, deps
¦           +-- capabilities/   # implementações das capabilities
¦           +-- adapters/       # GitHub repos adaptados
¦
+-- providers/                 # Camada mais baixa
¦   +-- ai/         ? OpenAI, Anthropic, Gemini, Ollama
¦   +-- browser/    ? Playwright, Puppeteer, BrowserUse
¦   +-- storage/    ? S3, Local, Redis
¦   +-- embedding/  ? OpenAI, Ollama
¦
+-- shared/                    # Contratos (apenas interfaces)
¦   +-- contracts/
¦       +-- ICapability.ts
¦       +-- ICapabilityRegistry.ts
¦       +-- IPlugin.ts
¦       +-- IEventBus.ts
¦       +-- IKernel.ts
¦       +-- IWorkflowRuntime.ts
¦       +-- IAgentRuntime.ts
¦       +-- IAIService.ts
¦       +-- ILogger.ts
¦       +-- IStorage.ts
¦       +-- IMemory.ts
¦       +-- IScheduler.ts
¦       +-- IPermissionService.ts
¦       +-- IConfigService.ts
¦       +-- IMetricsCollector.ts
¦       +-- ISecretsManager.ts
¦
+-- docker/
+-- package.json
```

---

## 7. Contratos (shared/contracts/)

| Interface | Dono | Proposito |
|-----------|------|-----------|
| ICapability | Plugin | Menor unidade funcional. inputs ? outputs |
| ICapabilityRegistry | Kernel | "Quem sabe fazer X?" |
| IPlugin | Plugin | activate(context) / deactivate() |
| IEventBus | Kernel | Tudo por eventos |
| IKernel | System | Bootstrap, health, status |
| IWorkflowRuntime | Kernel | Executa workflows de capabilities |
| IAgentRuntime | Kernel | Agentes que pensam e decidem |
| IAIService | Kernel | Chat multi-provedor |
| ILogger | Kernel | Log estruturado |
| IStorage | Kernel | Armazenamento |
| IMemory | Kernel | Memória persistente |
| IScheduler | Kernel | Cron / intervalo |
| IPermissionService | Kernel | Controle de acesso |
| IConfigService | Kernel | Config centralizada |
| IMetricsCollector | Kernel | Métricas do sistema |
| ISecretsManager | Kernel | Credenciais |

---

## 8. Regras de Ouro

1. **Kernel é a única parte que conhece o estado global.**
2. **Plugins nunca conversam entre si.** Só via eventos.
3. **Plugins não enxergam o Kernel.** Só o PluginContext.
4. **PluginContext expõe APENAS o que o plugin precisa.**
5. **Workflow conhece capabilities, não plugins.**
6. **Tudo implementa interfaces. Nada de classes concretas.**
7. **Capability é a menor unidade funcional.**
8. **Trocar adapter = nada muda acima.**
9. **Kernel descobre plugins dinamicamente via manifesto.**
10. **BeeHive é Workflows + Agentes, não Chat.**

---

## 9. Resource Manager (Gerencia Tudo)

Cada plugin não gerencia seus próprios recursos. O Kernel gerencia.

```
Kernel
 +-- ResourceManager
       +-- BrowserPool      ? Playwright, Puppeteer, BrowserUse
       +-- ModelPool        ? LLMs carregados em memória
       +-- GPUPool          ? Alocação de GPU entre plugins
       +-- EmbeddingPool    ? Serviços de embedding compartilhados
       +-- FileCache        ? Cache de arquivos (LRU)
       +-- TempFiles        ? Arquivos temporários com cleanup
       +-- DownloadManager  ? Downloads com fila e progresso
       +-- ProcessManager   ? Processos filhos (FFmpeg, Python...)
```

---

## 10. Artifact: Tudo que o BeeHive Produz

Toda saída de uma capability é um **Artifact**. Isso padroniza o encadeamento.

```
Prompt (Artifact)
  ? Video Capability
Video (Artifact)
  ? Thumbnail Capability
Thumbnail (Artifact)
  ? Publish Capability
Published URL (Artifact)
```

Tipos: image, video, audio, document, markdown, json, transcript, thumbnail, dataset, prompt, workflow...

---

## 11. Capability vs Tool (Separação Definitiva)

| Camada | Exemplo | Descrição |
|--------|---------|-----------|
| **Capability** | `generate_video` | **O que** fazer |
| **Plugin** | VideoPlugin | Agrupa capabilities |
| **Adapter** | MoneyPrinterTurbo | **Como** fazer |
| **Tool** | Playwright | Ferramenta concreta usada pelo adapter |
| **Provider** | OpenAI | Serviço externo |

Capability: "Quero gerar um vídeo" (o que)
Tool: "Usar Playwright para navegar" (como)

Isso permite trocar completamente a implementação sem mudar o contrato.

---

## 12. Execution Context (Rastreabilidade)

Cada execução carrega um contexto único:

```
ExecutionContext
  +-- requestId         ? ID único da requisição
  +-- correlationId     ? Encadeamento entre eventos
  +-- causationId       ? Quem causou esta execução
  +-- workflowId        ? Workflow atual
  +-- agentId           ? Agente atual
  +-- userId            ? Usuário dono
  +-- workspaceId       ? Workspace
  +-- projectId         ? Projeto
  +-- permissions       ? Permissões válidas
  +-- memoryScope       ? Escopo de memória
  +-- log               ? Logger da execução
  +-- metrics           ? Métricas da execução
```

---

## 13. Observability (Tracing)

```
Workflow #91
  ? Span: "generate_video"
    ? Span: "renderizar_cenas"
      ? Span: "ffmpeg_exec"     ? erro aqui
    ? Span: "gerar_thumbnail"
      ? Span: "comfyui_api"
    ? Span: "upload_youtube"
```

Cada capability, adapter e provider gera spans. Quando algo falha, você vê exatamente onde.

---

## 14. Knowledge Graph (Relações)

```
Projeto "Estudo OAB"
  +-- Video "Direito Civil - Aula 1"
  ¦     +-- Thumbnail "thumb_civil_1.jpg"
  ¦     +-- Post "Resumo Direito Civil"
  +-- Agent "Revisor OAB"
  ¦     +-- Workflow "Revisão Semanal"
  ¦           +-- Usou modelo Gemini
  +-- Arquivo "cronograma_oab.pdf"

Consulta: "Quais workflows usaram Gemini no projeto OAB?"
Resposta: Workflow "Revisão Semanal" via Agent "Revisor OAB"
```

---

## 15. Roadmap (3 Plugins Primeiro)

Validar a arquitetura com 3 plugins de ponta a ponta ANTES de construir o resto.

### Fase 1: Chat Plugin (Semanas 1-2)
```
Kernel ? PluginRegistry ? PluginManager
  ? ChatPlugin
    ? ProviderManager ? Ollama (local) / OpenAI / Gemini
  ? UI: Conversa
  ? Valida: EventBus, PluginContext, AI Service, Container
```

### Fase 2: Browser Plugin (Semanas 3-4)
```
Kernel ? ResourceManager ? BrowserPool
  ? BrowserPlugin
    ? Playwright
  ? UI: Automações
  ? Valida: ResourceManager, CapabilityRegistry
```

### Fase 3: Content Plugin (Semanas 5-6)
```
WorkflowRuntime
  ? Chat Capability (roteiro)
  ? Image Capability (thumbnail)
  ? Browser Capability (pesquisa)
  ? Video Capability (shorts)
  ? UI: Conteúdo
  ? Valida: WorkflowRuntime, Artifact, ExecutionContext
```

### Depois (Semanas 7+)
```
AgentRuntime, Scheduler, KnowledgeGraph,
Marketplace, mais plugins...
```

---

## 16. Regras de Ouro (Versão Final)

1. **Kernel** é a única parte que conhece o estado global.
2. **Plugins** nunca conversam entre si. Só via EventBus.
3. **Plugins** não enxergam o Kernel. Só PluginContext.
4. **PluginContext** expõe APENAS o que o plugin precisa.
5. **Workflow** conhece capabilities, não plugins.
6. **Capability** é a menor unidade funcional.
7. **Tool** é separado de Capability. Tool é o *como*.
8. **Tudo** que o sistema produz é um Artifact.
9. **ResourceManager** gerencia recursos. Plugin não gerencia nada.
10. **Trocar adapter** = nada muda acima.
11. **Kernel** descobre plugins dinamicamente via manifesto.
12. **3 plugins primeiro.** Validar antes de expandir.
13. **Tudo implementa interfaces.** Nada concreto.
14. **Observabilidade** desde o dia 1 (tracing, logs, metrics).
