# ?? BeeHive OS — Arquitetura Definitiva

> **Três camadas. Zero acoplamento.**

---

## 1. A Grande Ideia

```
+-----------------------------------------------------+
¦                         UI                           ¦
¦  Dashboard ¦ Conversa ¦ Projetos ¦ Negócios         ¦
¦  Conteúdo  ¦ Automações ¦ Agentes ¦ Configurações   ¦
¦                                                     ¦
¦  A UI NÃO sabe gerar vídeos.                        ¦
¦  A UI NÃO sabe usar IA.                             ¦
¦  A UI apenas conversa com o Core.                   ¦
+-----------------------------------------------------+
                       ¦ HTTP / WS / RPC
+-----------------------------------------------------+
¦                       CORE                           ¦
¦                                                      ¦
¦  AI Manager    ¦ Provider Manager  ¦ Workflow Engine ¦
¦  Memory        ¦ Tool Manager      ¦ Plugin Manager  ¦
¦  Scheduler     ¦ Queue             ¦ Permissions     ¦
¦  Projects      ¦ Storage           ¦ Database        ¦
¦  Authentication¦ Event Bus         ¦                  ¦
¦                                                      ¦
¦  Componentes existem uma ÚNICA vez.                  ¦
+-----------------------------------------------------+
                       ¦ Plugin API
+-----------------------------------------------------+
¦                     PLUGINS                          ¦
¦                                                      ¦
¦  Video Plugin  ¦ Coding Plugin  ¦ Browser Plugin    ¦
¦  (MPTurbo/     ¦ (OpenHands)    ¦ (Browser Use)     ¦
¦   VidBee)      ¦                ¦                    ¦
¦  Image Plugin  ¦ Chat Plugin    ¦ Shorts Plugin     ¦
¦  (ComfyUI)     ¦ (AI Mgr+Prov) ¦                    ¦
¦                                                      ¦
¦  Repositórios viram SERVIÇOS INTERNOS.               ¦
¦  Nada sabem da UI. Nada sabem do Core.               ¦
+-----------------------------------------------------+
```

### Princípio Fundamental

> **Não pergunte "como colocar o MoneyPrinterTurbo DENTRO do BeeHive?"**
> **Pergunte "como transformar o MoneyPrinterTurbo em um SERVIÇO INTERNO?"**

Cada repositório externo é analisado como biblioteca. Extraímos suas CAPACIDADES, não sua arquitetura. Envolvemos em um Plugin BeeHive que expõe uma interface única para o Core. Se amanhã trocarmos o MoneyPrinterTurbo pelo VidBee, **nada muda na UI nem no Core**.

---

## 2. Mapa de Navegação (UI)

```
BeeHive
+-- Dashboard
+-- Conversa
+-- Projetos
+-- Negócios
¦   +-- Afiliados
¦   +-- Produtos
¦   +-- Vendas
¦   +-- Clientes
¦   +-- Analytics
¦   +-- Campanhas
+-- Conteúdo
¦   +-- Vídeos
¦   +-- Shorts
¦   +-- Imagens
¦   +-- Posts
¦   +-- Artigos
¦   +-- Blogs
¦   +-- Roteiros
¦   +-- Thumbnails
+-- Automações
+-- Agentes
+-- Configurações
```

---

## 3. Fluxos

### 3.1 Criar Shorts

```
UI (Conteúdo > Shorts > "Criar")
  ? POST /api/content/create
    ? Core (Workflow Engine)
      ? Plugin Manager
        ? Video Plugin
          ? MoneyPrinterTurbo  (ou VidBee)
        ? resultado
      ? resultado
    ? resultado
  ? 200 OK
UI exibe resultado
```

### 3.2 Conversa

```
UI (Conversa > digita mensagem)
  ? POST /api/conversa/enviar
    ? Core ? Plugin Manager
      ? Chat Plugin
        ? AI Manager
          ? Provider Manager
            ? OpenAI / Claude / Gemini / Ollama
          ? resposta
        ? resposta
      ? resposta
    ? resposta
  ? 200 + streaming
UI renderiza resposta
```

### 3.3 Plugins são Intercambiáveis

| Capacidade | Plugin | Implementação 1 | Implementação 2 |
|-----------|--------|----------------|----------------|
| Video | video-plugin | MoneyPrinterTurbo | VidBee |
| Coding | coding-plugin | OpenHands | Continue.dev |
| Browser | browser-plugin | Browser Use | Playwright |
| Image | image-plugin | ComfyUI | DALL-E |
| Chat | chat-plugin | AI Manager ? Provider | — |
| Shorts | shorts-plugin | Pipeline próprio | ArcReel |

---

## 4. Regras de Ouro

1. **UI não chama Plugin.** UI chama Core. Core roteia para o Plugin.
2. **Plugin não conhece UI.** Plugin expõe interface. Quem consome é o Core.
3. **Core não conhece implementação.** Core conhece apenas a interface do Plugin.
4. **Conversa é um Plugin.** Qualquer módulo pode conversar via Chat Plugin.
5. **Repositório vira Serviço.** Nunca incorporamos arquitetura alheia.
---

## 5. Estrutura de Diretórios

```
beehive/
¦
+-- ui/                                   # --- CAMADA UI ---
¦   +-- src/
¦   ¦   +-- areas/
¦   ¦   ¦   +-- dashboard/
¦   ¦   ¦   +-- conversa/
¦   ¦   ¦   +-- projetos/
¦   ¦   ¦   +-- negocios/
¦   ¦   ¦   ¦   +-- afiliados/
¦   ¦   ¦   ¦   +-- produtos/
¦   ¦   ¦   ¦   +-- vendas/
¦   ¦   ¦   ¦   +-- clientes/
¦   ¦   ¦   ¦   +-- analytics/
¦   ¦   ¦   ¦   +-- campanhas/
¦   ¦   ¦   +-- conteudo/
¦   ¦   ¦   ¦   +-- videos/
¦   ¦   ¦   ¦   +-- shorts/
¦   ¦   ¦   ¦   +-- imagens/
¦   ¦   ¦   ¦   +-- posts/
¦   ¦   ¦   ¦   +-- artigos/
¦   ¦   ¦   ¦   +-- blogs/
¦   ¦   ¦   ¦   +-- roteiros/
¦   ¦   ¦   ¦   +-- thumbnails/
¦   ¦   ¦   +-- automacoes/
¦   ¦   ¦   +-- agentes/
¦   ¦   ¦   +-- configuracoes/
¦   ¦   +-- components/
¦   ¦   ¦   +-- ui/           # shadcn/ui
¦   ¦   ¦   +-- layout/
¦   ¦   +-- hooks/
¦   ¦   +-- stores/           # Zustand
¦   ¦   +-- services/         # TanStack Query
¦   ¦   +-- lib/
¦   ¦
¦   +-- package.json          # Next.js 16
¦   +-- next.config.ts
¦
+-- core/                                # --- CAMADA CORE ---
¦   +-- src/
¦   ¦   +-- kernel/
¦   ¦   ¦   +-- Kernel.ts
¦   ¦   ¦   +-- EventBus.ts
¦   ¦   ¦   +-- CommandBus.ts
¦   ¦   ¦   +-- QueryBus.ts
¦   ¦   ¦
¦   ¦   +-- ai/
¦   ¦   ¦   +-- AIManager.ts
¦   ¦   ¦   +-- providers/
¦   ¦   ¦       +-- OpenAIProvider.ts
¦   ¦   ¦       +-- AnthropicProvider.ts
¦   ¦   ¦       +-- GeminiProvider.ts
¦   ¦   ¦       +-- GroqProvider.ts
¦   ¦   ¦       +-- OllamaProvider.ts
¦   ¦   ¦       +-- router/
¦   ¦   ¦           +-- LLMRouter.ts
¦   ¦   ¦
¦   ¦   +-- providers/
¦   ¦   ¦   +-- ProviderManager.ts
¦   ¦   ¦   +-- ProviderCredentialsStore.ts
¦   ¦   ¦
¦   ¦   +-- workflow/
¦   ¦   ¦   +-- WorkflowEngine.ts
¦   ¦   ¦   +-- steps/
¦   ¦   ¦
¦   ¦   +-- memory/
¦   ¦   ¦   +-- MemoryManager.ts
¦   ¦   ¦   +-- stores/
¦   ¦   ¦   ¦   +-- VectorStore.ts      # pgvector
¦   ¦   ¦   ¦   +-- RedisStore.ts       # working memory
¦   ¦   ¦   ¦   +-- SQLiteStore.ts      # local dev
¦   ¦   ¦   +-- embeddings/
¦   ¦   ¦       +-- EmbeddingService.ts
¦   ¦   ¦
¦   ¦   +-- tools/
¦   ¦   ¦   +-- ToolManager.ts
¦   ¦   ¦   +-- ToolRegistry.ts
¦   ¦   ¦   +-- built-in/
¦   ¦   ¦       +-- filesystem/
¦   ¦   ¦       +-- terminal/
¦   ¦   ¦       +-- git/
¦   ¦   ¦       +-- browser/
¦   ¦   ¦       +-- web/
¦   ¦   ¦       +-- database/
¦   ¦   ¦       +-- email/
¦   ¦   ¦
¦   ¦   +-- plugins/
¦   ¦   ¦   +-- PluginManager.ts
¦   ¦   ¦   +-- PluginLoader.ts
¦   ¦   ¦
¦   ¦   +-- scheduler/
¦   ¦   ¦   +-- Scheduler.ts
¦   ¦   ¦
¦   ¦   +-- queue/
¦   ¦   ¦   +-- QueueManager.ts
¦   ¦   ¦   +-- workers/
¦   ¦   ¦
¦   ¦   +-- auth/
¦   ¦   ¦   +-- AuthService.ts
¦   ¦   ¦   +-- strategies/
¦   ¦   ¦
¦   ¦   +-- projects/
¦   ¦   ¦   +-- ProjectService.ts
¦   ¦   ¦
¦   ¦   +-- storage/
¦   ¦   ¦   +-- StorageManager.ts
¦   ¦   ¦   +-- S3Storage.ts
¦   ¦   ¦   +-- LocalStorage.ts
¦   ¦   ¦
¦   ¦   +-- database/
¦   ¦   ¦   +-- DatabaseManager.ts
¦   ¦   ¦   +-- schema.prisma
¦   ¦   ¦   +-- drizzle/
¦   ¦   ¦
¦   ¦   +-- permissions/
¦   ¦   ¦   +-- PermissionService.ts
¦   ¦   ¦
¦   ¦   +-- api/
¦   ¦       +-- routes/
¦   ¦       ¦   +-- conversa.routes.ts
¦   ¦       ¦   +-- projetos.routes.ts
¦   ¦       ¦   +-- negocios.routes.ts
¦   ¦       ¦   +-- conteudo.routes.ts
¦   ¦       ¦   +-- automacoes.routes.ts
¦   ¦       ¦   +-- agentes.routes.ts
¦   ¦       ¦   +-- auth.routes.ts
¦   ¦       ¦   +-- providers.routes.ts
¦   ¦       ¦   +-- admin.routes.ts
¦   ¦       +-- websocket/
¦   ¦       ¦   +-- index.ts
¦   ¦       +-- mcp/
¦   ¦       ¦   +-- server.ts
¦   ¦       +-- middleware/
¦   ¦           +-- auth.ts
¦   ¦           +-- rate-limit.ts
¦   ¦           +-- error-handler.ts
¦   ¦
¦   +-- package.json
¦   +-- tsconfig.json
¦
+-- plugins/                             # --- CAMADA PLUGINS ---
¦   +-- video/
¦   ¦   +-- src/
¦   ¦   ¦   +-- index.ts
¦   ¦   ¦   +-- plugin.ts              # BeeHivePlugin
¦   ¦   ¦   +-- interfaces.ts          # PluginVideo interface
¦   ¦   ¦   +-- adapters/
¦   ¦   ¦   ¦   +-- moneyPrinterTurbo.adapter.ts
¦   ¦   ¦   ¦   +-- vidBee.adapter.ts
¦   ¦   ¦   +-- types.ts
¦   ¦   +-- package.json
¦   ¦
¦   +-- coding/
¦   ¦   +-- src/
¦   ¦   ¦   +-- index.ts
¦   ¦   ¦   +-- plugin.ts
¦   ¦   ¦   +-- interfaces.ts
¦   ¦   ¦   +-- adapters/
¦   ¦   ¦   ¦   +-- openHands.adapter.ts
¦   ¦   ¦   ¦   +-- continueDev.adapter.ts
¦   ¦   ¦   +-- types.ts
¦   ¦   +-- package.json
¦   ¦
¦   +-- browser/
¦   ¦   +-- src/
¦   ¦   ¦   +-- index.ts
¦   ¦   ¦   +-- plugin.ts
¦   ¦   ¦   +-- interfaces.ts
¦   ¦   ¦   +-- adapters/
¦   ¦   ¦   ¦   +-- browserUse.adapter.ts
¦   ¦   ¦   ¦   +-- playwright.adapter.ts
¦   ¦   ¦   +-- types.ts
¦   ¦   +-- package.json
¦   ¦
¦   +-- image/
¦   ¦   +-- src/
¦   ¦   ¦   +-- index.ts
¦   ¦   ¦   +-- plugin.ts
¦   ¦   ¦   +-- interfaces.ts
¦   ¦   ¦   +-- adapters/
¦   ¦   ¦   ¦   +-- comfyUI.adapter.ts
¦   ¦   ¦   ¦   +-- dalle.adapter.ts
¦   ¦   ¦   +-- types.ts
¦   ¦   +-- package.json
¦   ¦
¦   +-- shorts/
¦   ¦   +-- src/
¦   ¦   ¦   +-- index.ts
¦   ¦   ¦   +-- plugin.ts
¦   ¦   ¦   +-- interfaces.ts
¦   ¦   ¦   +-- pipeline/
¦   ¦   ¦   ¦   +-- downloader.py
¦   ¦   ¦   ¦   +-- transcriber.py
¦   ¦   ¦   ¦   +-- highlights.py
¦   ¦   ¦   ¦   +-- clipper.py
¦   ¦   ¦   ¦   +-- subtitles.py
¦   ¦   ¦   ¦   +-- publisher.py
¦   ¦   ¦   +-- types.ts
¦   ¦   +-- package.json
¦   ¦
¦   +-- chat/
¦       +-- src/
¦       ¦   +-- index.ts
¦       ¦   +-- plugin.ts              # ChatPlugin
¦       ¦   +-- ChatService.ts         # wrappers AI Manager
¦       ¦   +-- types.ts
¦       +-- package.json
¦
+-- shared/                              # --- TIPOS COMPARTILHADOS ---
¦   +-- src/
¦   ¦   +-- types/
¦   ¦   ¦   +-- kernel.ts
¦   ¦   ¦   +-- events.ts
¦   ¦   ¦   +-- commands.ts
¦   ¦   ¦   +-- plugins.ts
¦   ¦   ¦   +-- ai.ts
¦   ¦   ¦   +-- tools.ts
¦   ¦   ¦   +-- agents.ts
¦   ¦   ¦   +-- memory.ts
¦   ¦   ¦   +-- workflow.ts
¦   ¦   ¦   +-- auth.ts
¦   ¦   ¦   +-- storage.ts
¦   ¦   +-- constants/
¦   ¦       +-- events.ts
¦   ¦       +-- commands.ts
¦   ¦       +-- permissions.ts
¦   +-- package.json
¦
+-- docker/
¦   +-- docker-compose.yml
¦   +-- docker-compose.prod.yml
¦   +-- Dockerfile.core
¦   +-- Dockerfile.ui
¦   +-- Dockerfile.plugins
¦
+-- scripts/
+-- package.json                       # Monorepo root
+-- pnpm-workspace.yaml
+-- turbo.json
+-- tsconfig.base.json
```
---

## 6. Interfaces (Contratos entre Camadas)

### 6.1 Plugin Interface (Core ? Plugin)

Cada plugin expõe esta interface mínima. O Core conhece APENAS isto.

```typescript
// shared/src/types/plugins.ts

export interface BeeHivePlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly capabilities: PluginCapability[];

  onLoad(core: CoreAPI): Promise<void>;
  onUnload(): Promise<void>;
}

export interface PluginCapability {
  id: string;            // ex: "video:generate", "chat:converse"
  description: string;
  actions: PluginAction[];
}

export interface PluginAction {
  name: string;          // ex: "create-shorts", "generate-image"
  parameters: Record<string, unknown>;
  execute(params: unknown, context: ActionContext): Promise<ActionResult>;
}
```

### 6.2 Core API (Plugin enxerga o Core)

O plugin NÃO enxerga o Kernel inteiro. Apenas o que precisa.

```typescript
// core/src/api/CoreAPI.ts

export interface CoreAPI {
  // AI
  ai: {
    execute(req: AIRequest): Promise<AIResponse>;
    executeStream(req: AIRequest): AsyncIterable<AIStreamChunk>;
  };

  // Storage
  storage: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
  };

  // Events
  events: {
    emit(type: string, payload: unknown): Promise<void>;
    on(type: string, handler: EventHandler): void;
  };

  // Tools
  tools: {
    execute(name: string, args: unknown): Promise<unknown>;
  };

  // Logging
  log: {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
  };
}
```

### 6.3 Plugin Manager (Core gerencia Plugins)

```typescript
// core/src/plugins/PluginManager.ts

export interface IPluginManager {
  load(pluginId: string): Promise<void>;
  unload(pluginId: string): Promise<void>;
  list(): PluginInfo[];
  getCapability(capabilityId: string): PluginCapability | null;
  executeAction(
    capabilityId: string,
    action: string,
    params: unknown,
    context: ActionContext
  ): Promise<ActionResult>;
  findByCapability(capabilityId: string): BeeHivePlugin[];
}
```

### 6.4 Exemplo: Video Plugin

```typescript
// plugins/video/src/plugin.ts

import type { BeeHivePlugin, CoreAPI, PluginCapability } from '@beehive/shared';

export class VideoPlugin implements BeeHivePlugin {
  readonly id = 'plugin:video';
  readonly name = 'Video Plugin';
  readonly version = '1.0.0';
  readonly capabilities: PluginCapability[] = [
    {
      id: 'video:generate',
      description: 'Geração de vídeos a partir de conteúdo',
      actions: [
        {
          name: 'create-shorts',
          parameters: {
            url: { type: 'string', description: 'URL do YouTube' },
            niche: { type: 'string', description: 'Nicho do conteúdo' },
            duration: { type: 'number', default: 60 },
          },
          execute: async (params, ctx) => {
            // Chama MoneyPrinterTurbo ou VidBee internamente
            return ctx.adapter.generateShorts(params);
          },
        },
      ],
    },
  ];

  private adapter: VideoAdapter;

  async onLoad(core: CoreAPI): Promise<void> {
    // Decide qual adapter usar baseado na config
    const engine = process.env.VIDEO_ENGINE ?? 'money-printer-turbo';
    this.adapter = engine === 'vidbee'
      ? new VidBeeAdapter()
      : new MoneyPrinterTurboAdapter();

    core.log.info(`VideoPlugin loaded with engine: ${engine}`);
  }

  async onUnload(): Promise<void> {
    await this.adapter.dispose();
  }
}
```

### 6.5 Exemplo: Chat Plugin

```typescript
// plugins/chat/src/plugin.ts

export class ChatPlugin implements BeeHivePlugin {
  readonly id = 'plugin:chat';
  readonly name = 'Chat Plugin';
  readonly version = '1.0.0';
  readonly capabilities: PluginCapability[] = [
    {
      id: 'chat:converse',
      description: 'Conversação com IA multi-provedor',
      actions: [
        {
          name: 'send-message',
          parameters: {
            message: { type: 'string', required: true },
            provider: { type: 'string' },
            model: { type: 'string' },
          },
          execute: async (params, ctx) => {
            // Chat Plugin USA o AI Manager do Core
            return ctx.core.ai.execute({
              messages: [{ role: 'user', content: params.message }],
              model: params.model,
              provider: params.provider,
            });
          },
        },
      ],
    },
  ];

  async onLoad(core: CoreAPI): Promise<void> {
    core.log.info('ChatPlugin loaded');
  }

  async onUnload(): Promise<void> {}
}
```

Perceba: o Chat Plugin não tem provedor próprio. Ele USA o AI Manager do Core.
Isso significa que QUALQUER plugin pode conversar, basta chamar `core.ai.execute()`.

---

## 7. Core em Detalhe

### 7.1 Kernel (Event Bus)

```
EventBus (in-memory + Redis)
  +-- publish(event)       ? entrega para assinantes
  +-- subscribe(type, fn)  ? registra handler
  +-- middleware           ? logging, validação, retry
  +-- dead-letter          ? eventos que falharam

CommandBus (síncrono)
  +-- dispatch(type, payload) ? retorna resultado
  +-- handler registrado pelo módulo/plugin

QueryBus (consultas)
  +-- query(type, params)  ? retorna dados
  +-- projeções otimizadas (leituras)
```

### 7.2 Workflow Engine

```
Trigger (evento / cron / manual)
  ? WorkflowInstance criada
    ? Step 1: LLM Call (via Chat Plugin)
    ? Step 2: Tool Call (via Tool Manager)
    ? Step 3: Plugin Call (via Plugin Manager)
    ? Step 4: Emit evento
  ? WorkflowInstance concluída
```

### 7.3 AI Manager

```
AIManager
  +-- execute(req) ? Provider.resolve(model) ? Provider.chat(req)
  +-- executeStream(req) ? SSE streaming
  +-- executeWithTools(req, tools) ? loop: LLM ? tool ? LLM ? done
  +-- resolveProvider(criteria) ? LLMRouter.route()
```

### 7.4 Provider Manager

```
ProviderManager
  +-- register(provider)      ? adiciona ao catálogo
  +-- resolve(criteria)       ? roteia por modelo + capacidade
  +-- testConnection(id)      ? health check
  +-- getActive()             ? providers habilitados
  +-- failover()              ? se um cai, tenta próximo
```

---

## 8. API (REST + WebSocket + MCP)

A API é uma camada fina no Core. Ela apenas traduz HTTP/WS para CommandBus.

### 8.1 REST Endpoints

```
POST   /api/conversa/enviar       ? Chat Plugin ? AI Manager
POST   /api/conversa/stream       ? Chat Plugin ? AI Manager (SSE)
POST   /api/conteudo/shorts       ? Plugin Manager ? Video Plugin
POST   /api/conteudo/imagem       ? Plugin Manager ? Image Plugin
POST   /api/conteudo/post         ? Plugin Manager ? (via AI)
POST   /api/projetos              ? ProjectService
GET    /api/projetos              ? ProjectService
POST   /api/negocios/plano        ? BusinessService
POST   /api/automacoes            ? WorkflowEngine
POST   /api/agentes               ? AgentFramework
GET    /api/providers             ? ProviderManager
POST   /api/providers             ? ProviderManager
GET    /api/plugins               ? PluginManager
POST   /api/auth/login            ? AuthService
GET    /api/status                ? Kernel.health()
```

### 8.2 WebSocket

```
WS /ws  ? streaming de eventos do EventBus

Eventos enviados ao cliente:
  conversa:chunk         ? streaming de resposta
  workflow:progress      ? progresso de automação
  plugin:status          ? status de plugin
  notification           ? notificação push
  agente:message         ? mensagem de agente
```

### 8.3 MCP (Model Context Protocol)

```
MCP Server (stdio + SSE)
  Tools expostos:
    beehive_list_plugins      ? PluginManager.list()
    beehive_execute_action    ? PluginManager.executeAction()
    beehive_converse          ? Chat Plugin ? AI Manager
    beehive_search_memory     ? MemoryManager.search()
    beehive_create_project    ? ProjectService
    beehive_get_status        ? Kernel.health()
```

---

## 9. Menu Final

```
+---------------------------------------------------------+
¦  ?? BeeHive                                             ¦
¦                                                          ¦
¦  +---------+ +---------+ +---------+ +--------------+  ¦
¦  ¦Dashboard¦ ¦Conversa ¦ ¦Projetos ¦ ¦   Negócios   ¦  ¦
¦  ¦         ¦ ¦         ¦ ¦         ¦ ¦ Afiliados    ¦  ¦
¦  ¦         ¦ ¦         ¦ ¦         ¦ ¦ Produtos     ¦  ¦
¦  ¦         ¦ ¦         ¦ ¦         ¦ ¦ Vendas       ¦  ¦
¦  ¦         ¦ ¦         ¦ ¦         ¦ ¦ Clientes     ¦  ¦
¦  ¦         ¦ ¦         ¦ ¦         ¦ ¦ Analytics    ¦  ¦
¦  ¦         ¦ ¦         ¦ ¦         ¦ ¦ Campanhas    ¦  ¦
¦  +---------+ +---------+ +---------+ +--------------+  ¦
¦                                                          ¦
¦  +---------+ +---------+ +---------+ +--------------+  ¦
¦  ¦ Conteúdo¦ ¦Automaç. ¦ ¦ Agentes ¦ ¦ Configuraç.  ¦  ¦
¦  ¦ Vídeos  ¦ ¦         ¦ ¦         ¦ ¦ Provedores   ¦  ¦
¦  ¦ Shorts  ¦ ¦         ¦ ¦         ¦ ¦ Plugins      ¦  ¦
¦  ¦ Imagens ¦ ¦         ¦ ¦         ¦ ¦ Plano        ¦  ¦
¦  ¦ Posts   ¦ ¦         ¦ ¦         ¦ ¦              ¦  ¦
¦  ¦ Artigos ¦ ¦         ¦ ¦         ¦ ¦              ¦  ¦
¦  ¦ Blogs   ¦ ¦         ¦ ¦         ¦ ¦              ¦  ¦
¦  ¦ Roteiros¦ ¦         ¦ ¦         ¦ ¦              ¦  ¦
¦  ¦ Thumbnls¦ ¦         ¦ ¦         ¦ ¦              ¦  ¦
¦  +---------+ +---------+ +---------+ +--------------+  ¦
+---------------------------------------------------------+
```

---

## 10. Roadmap

### Fase 1 — Esqueleto (Semanas 1-3)
- [ ] Core: Kernel + EventBus + CommandBus
- [ ] Core: PluginManager + PluginLoader
- [ ] Core: AI Manager + Provider Manager
- [ ] Core: API layer (REST + WS)
- [ ] Plugin: Chat Plugin (wrap AI Manager)
- [ ] UI: Dashboard + Conversa
- [ ] Banco: PostgreSQL + Prisma schema

### Fase 2 — Plugins Essenciais (Semanas 4-6)
- [ ] Plugin: Video Plugin (adapter MP Turbo)
- [ ] Plugin: Shorts Plugin (pipeline Python)
- [ ] Plugin: Browser Plugin (adapter Browser Use)
- [ ] Plugin: Image Plugin (adapter ComfyUI)
- [ ] Core: Workflow Engine
- [ ] Core: Memory Engine (pgvector)
- [ ] UI: Conteúdo + Negócios

### Fase 3 — Automação (Semanas 7-9)
- [ ] Core: Scheduler + Queue (BullMQ + Redis)
- [ ] Core: Tool Manager + built-in tools
- [ ] Core: Agent Framework
- [ ] Plugin: Coding Plugin (adapter OpenHands)
- [ ] UI: Automações + Agentes
- [ ] Docker: docker-compose dev/prod

### Fase 4 — Escala (Semanas 10-12)
- [ ] Core: Redis EventBus (horizontal)
- [ ] Core: Auth + Permissions + Rate Limit
- [ ] Core: MCP Server
- [ ] UI: Configurações + Admin
- [ ] Testes E2E
- [ ] Deploy: Railway + Vercel
