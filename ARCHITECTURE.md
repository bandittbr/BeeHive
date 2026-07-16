# ?? BeeHive OS — Arquitetura em 6 Camadas

> **UI ? Application ? Core ? Plugins ? Adapters ? Providers**
> Tudo é contrato. Nada é concreto.

---

## 1. As 6 Camadas

```
+---------------------------------------------------------------------+
¦                              UI                                      ¦
¦  React / Next.js / TailwindCSS / shadcn/ui / Zustand / TanStack Q.  ¦
¦                                                                      ¦
¦  Só renderiza. Nunca conversa com plugins.                           ¦
¦  Dashboard ¦ Conversa ¦ Projetos ¦ Negócios ¦ Conteúdo               ¦
¦  Automações ¦ Agentes ¦ Configurações                                ¦
+---------------------------------------------------------------------+
                           ¦ HTTP / WS
+---------------------------------------------------------------------+
¦                       APPLICATION LAYER                              ¦
¦  Casos de uso que orquestram o Core                                  ¦
¦                                                                      ¦
¦  CreateVideoUseCase   ¦ CreateProjectUseCase ¦ ChatUseCase           ¦
¦  GenerateImageUseCase ¦ CreateWorkflowUseCase¦ PublishContentUseCase ¦
¦                                                                      ¦
¦  Só conversa com o Core. Nunca com plugins.                          ¦
+---------------------------------------------------------------------+
                           ¦ CommandBus / QueryBus
+---------------------------------------------------------------------+
¦                            CORE                                      ¦
¦  O cérebro. Existe uma ÚNICA vez.                                    ¦
¦                                                                      ¦
¦  Kernel  ¦ EventBus ¦ CommandBus ¦ QueryBus                          ¦
¦  AI Manager ¦ Provider Manager ¦ Plugin Manager                      ¦
¦  Workflow Engine ¦ Memory Engine ¦ Scheduler                         ¦
¦  Queue (BullMQ) ¦ Auth ¦ Permissions ¦ Storage ¦ Tools               ¦
¦                                                                      ¦
¦  Conhece apenas INTERFACES. Nunca implementações.                    ¦
+---------------------------------------------------------------------+
                           ¦ PluginManager.resolve()
+---------------------------------------------------------------------+
¦                           PLUGINS                                    ¦
¦  Cada plugin expõe uma interface. Core descobre via manifesto.       ¦
¦                                                                      ¦
¦  VideoPlugin ¦ ImagePlugin ¦ CodingPlugin ¦ BrowserPlugin            ¦
¦  ChatPlugin  ¦ ShortsPlugin¦ BusinessPlugin                          ¦
¦                                                                      ¦
¦  NUNCA implementam lógica concreta. Delegam para adapters.           ¦
+---------------------------------------------------------------------+
                           ¦ AdapterManager.resolve()
+---------------------------------------------------------------------+
¦                          ADAPTERS                                    ¦
¦  Projetos do GitHub adaptados como serviços internos.                ¦
¦                                                                      ¦
¦  MoneyPrinterTurbo ¦ VidBee ¦ ComfyUI ¦ Browser Use ¦ OpenHands     ¦
¦  Remotion ¦ MoviePy ¦ yt-dlp ¦ faster-whisper                        ¦
¦                                                                      ¦
¦  Trocar um adapter NÃO MUDA nada acima.                              ¦
+---------------------------------------------------------------------+
                           ¦ ProviderManager.resolve()
+---------------------------------------------------------------------+
¦                          PROVIDERS                                   ¦
¦  Camada mais baixa. Implementações concretas de serviços.            ¦
¦                                                                      ¦
¦  AI: OpenAI ¦ Anthropic ¦ Gemini ¦ Groq ¦ OpenRouter ¦ Ollama       ¦
¦  Browser: Playwright ¦ Puppeteer ¦ Browser Use ¦ Stagehand          ¦
¦  Storage: S3 ¦ Local ¦ Redis                                         ¦
¦  Embedding: OpenAI ¦ Ollama                                          ¦
+---------------------------------------------------------------------+
```

---

## 2. Contratos (O coração do sistema)

Nenhum código implementa classes concretas. Tudo implementa interfaces em `shared/contracts/`.

| Contrato | Quem implementa | Quem consome |
|----------|----------------|--------------|
| `IPlugin` | Cada plugin | PluginManager |
| `IVideoEngine` | Adapters (MPTurbo, VidBee) | VideoPlugin |
| `IImageEngine` | Adapters (ComfyUI, DALL-E) | ImagePlugin |
| `IBrowser` | Adapters (Playwright, BrowserUse) | BrowserPlugin |
| `IWorkflow` | WorkflowEngine + Plugins | Application Layer |
| `IAgent` | AgentFramework | Application Layer |
| `ITool` | Built-in tools + Plugins | AI Manager |
| `IProvider` | OpenAI, Anthropic, Ollama... | ProviderManager |
| `IMemory` | Memory stores (pgvector, Redis) | MemoryManager |
| `IStorage` | S3, Local, Redis | Core |

---

## 3. Plugin Manifest

Cada plugin registra um manifesto YAML. O Core descobre plugins dinamicamente na inicialização.

```yaml
# plugins/video/src/manifest.yaml
name: video
version: 1.0.0
capabilities:
  - generate_shorts
  - render_video
  - export_media
interfaces:
  - IVideoEngine
adapters:
  - MoneyPrinterTurbo
  - VidBee
  - Remotion
  - MoviePy
dependencies:
  - AIManager
  - Storage
permissions:
  - storage:read
  - storage:write
```

---

## 4. BeeHive é Workflows, não Conversa

O conceito central do BeeHive são **Workflows**. O usuário cria um fluxo que atravessa múltiplos plugins:

```
Usuário
  ?
Criar Workflow "Gerar Shorts"
  ?
[Plugin Pesquisa]    ? Pesquisar assunto
  ?
[Plugin Roteiro]     ? Gerar roteiro (via Chat Plugin)
  ?
[Plugin Imagem]      ? Gerar imagens (via Image Plugin)
  ?
[Plugin Vídeo]       ? Gerar vídeo (via Video Plugin)
  ?
[Plugin Thumbnail]   ? Gerar thumbnail (via Image Plugin)
  ?
[Plugin Publicação]  ? Publicar (via Browser Plugin)
  ?
[Plugin Analytics]   ? Monitorar métricas
  ?
Workflow Completo ? Dashboard
```

Cada passo pode usar um plugin diferente. O usuário enxerga UM processo.

---

## 5. Estrutura de Diretórios

```
beehive/
¦
+-- ui/                       # --- 1. UI ---
¦   +-- areas/
¦   ¦   +-- dashboard/
¦   ¦   +-- conversa/
¦   ¦   +-- projetos/
¦   ¦   +-- negocios/
¦   ¦   +-- conteudo/
¦   ¦   ¦   +-- videos/
¦   ¦   ¦   +-- shorts/
¦   ¦   ¦   +-- imagens/
¦   ¦   ¦   +-- posts/
¦   ¦   ¦   +-- artigos/
¦   ¦   ¦   +-- blogs/
¦   ¦   ¦   +-- roteiros/
¦   ¦   ¦   +-- thumbnails/
¦   ¦   +-- automacoes/
¦   ¦   +-- agentes/
¦   ¦   +-- configuracoes/
¦   +-- components/
¦   ¦   +-- ui/               # shadcn/ui
¦   ¦   +-- layout/
¦   +-- hooks/
¦   +-- stores/               # Zustand
¦   +-- services/             # TanStack Query
¦
+-- application/              # --- 2. APPLICATION ---
¦   +-- use-cases/
¦   ¦   +-- video/
¦   ¦   +-- content/
¦   ¦   +-- project/
¦   ¦   +-- chat/
¦   ¦   +-- workflow/
¦   +-- services/
¦
+-- core/                     # --- 3. CORE ---
¦   +-- kernel/
¦   ¦   +-- Kernel.ts
¦   ¦   +-- EventBus.ts
¦   ¦   +-- CommandBus.ts
¦   ¦   +-- QueryBus.ts
¦   +-- ai/
¦   ¦   +-- AIManager.ts
¦   ¦   +-- LLMRouter.ts
¦   +-- workflow/
¦   ¦   +-- WorkflowEngine.ts
¦   +-- memory/
¦   ¦   +-- MemoryManager.ts
¦   ¦   +-- stores/
¦   ¦   +-- embeddings/
¦   +-- plugins/
¦   ¦   +-- PluginManager.ts     ? descobre manifests
¦   ¦   +-- PluginLoader.ts
¦   +-- providers/
¦   ¦   +-- ProviderManager.ts
¦   +-- queue/
¦   ¦   +-- QueueManager.ts       # BullMQ
¦   +-- scheduler/
¦   ¦   +-- Scheduler.ts
¦   +-- auth/
¦   ¦   +-- AuthService.ts
¦   +-- permissions/
¦   ¦   +-- PermissionService.ts
¦   +-- storage/
¦   ¦   +-- StorageManager.ts
¦   +-- tools/
¦   ¦   +-- ToolRegistry.ts
¦   ¦   +-- built-in/
¦   +-- api/
¦       +-- routes/
¦       +-- websocket/
¦       +-- mcp/
¦       ¦   +-- server.ts
¦       +-- middleware/
¦
+-- plugins/                  # --- 4. PLUGINS ---
¦   +-- video/
¦   +-- image/
¦   +-- coding/
¦   +-- browser/
¦   +-- shorts/
¦   +-- chat/
¦   +-- business/
¦   +-- template/
¦       +-- src/
¦           +-- plugin.ts        # implements IPlugin
¦           +-- manifest.yaml
¦           +-- interfaces.ts
¦           +-- adapters/
¦           ¦   +-- template.adapter.ts
¦           +-- types.ts
¦
+-- providers/                 # --- 5. PROVIDERS ---
¦   +-- ai/
¦   +-- browser/
¦   +-- storage/
¦   +-- embedding/
¦
+-- shared/                    # --- CONTRATOS ---
¦   +-- contracts/             # IPlugin, IWorkflow, IVideoEngine...
¦   +-- types/
¦   +-- constants/
¦
+-- docker/
+-- scripts/
+-- package.json
+-- pnpm-workspace.yaml
+-- turbo.json
```

---

## 6. Fluxo Completo (Criar Shorts)

```
UI (Conteúdo > Shorts > "Criar")
  ? POST /api/conteudo/shorts
Application Layer (CreateShortsUseCase)
  ? CommandBus.dispatch('workflow:start', { workflowId: 'create-shorts', input })
Core (WorkflowEngine)
  ? PluginManager.getCapability('video:generate')
Plugin (VideoPlugin)
  ? AdapterManager.resolve('money-printer-turbo')
Adapter (MoneyPrinterTurbo.adapter.ts)
  ? ProviderManager.get('ai') ? LLMRouter.resolve()
Provider (OpenAI / Ollama / Gemini)
  ? resultado
Adapter ? resultado
  ? resultado
Plugin ? resultado
  ? EventBus.emit('workflow:step:completed')
Core ? resultado
  ? EventBus.emit('conteudo:shorts:created')
Application ? resultado
  ? 200 OK
UI ? exibe resultado
```

---

## 7. Regras de Ouro

1. **UI não sabe de plugins.** Só chama Application Layer.
2. **Application não sabe de implementações.** Só conhece Core.
3. **Core não sabe de adapters.** Só conhece interfaces de plugins.
4. **Plugins não têm lógica concreta.** Delegam para adapters.
5. **Adapters são intercambiáveis.** Trocar não muda nada acima.
6. **Tudo implementa interfaces.** IPlugin, IVideoEngine, IProvider...
7. **BeeHive é Workflows.** O centro do sistema são fluxos reutilizáveis.
8. **Plugin Manager descobre dinamicamente.** Via manifesto YAML.
