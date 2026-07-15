# 🐝 BeeHive OS — Arquitetura v3.0

> **Classificação:** Documento Mestre de Arquitetura
> **Status:** Arquitetura Alvo v3.0
> **Última Revisão:** Julho 2026

---

## Sumário

1. [Filosofia e Princípios](#1-filosofia-e-princípios)
2. [Visão Geral do Sistema](#2-visão-geral-do-sistema)
3. [Estrutura de Diretórios](#3-estrutura-de-diretórios)
4. [Camadas da Arquitetura](#4-camadas-da-arquitetura)
5. [Microkernel](#5-microkernel)
6. [Event Bus](#6-event-bus)
7. [Sistema de Módulos](#7-sistema-de-módulos)
8. [Sistema de Plugins](#8-sistema-de-plugins)
9. [Engine de IA e Provedores](#9-engine-de-ia)
10. [Sistema de Memória](#10-sistema-de-memória)
11. [Tool Registry](#11-tool-registry)
12. [Workflow Engine](#12-workflow-engine)
13. [Agent Framework](#13-agent-framework)
14. [Banco de Dados](#14-banco-de-dados)
15. [Cache e Filas](#15-cache-e-filas)
16. [API e WebSocket](#16-api-e-websocket)
17. [Autenticação](#17-autenticação)
18. [Módulos de Negócio](#18-módulos-de-negócio)
19. [Integração MCP](#19-integração-mcp)
20. [Roadmap de Implementação](#20-roadmap-de-implementação)

---

## 1. Filosofia e Princípios

### 1.1 Manifesto

BeeHive OS **não é um chatbot**. É um Sistema Operacional de Inteligência Artificial — uma plataforma modular onde agentes, automações e módulos coexistem como processos independentes, comunicando-se exclusivamente por eventos.

### 1.2 Princípios Arquiteturais

| Princípio | Aplicação |
|---|---|
| **Microkernel** | Kernel mínimo (< 5% do código). Tudo o mais é módulo ou plugin. |
| **Event-Driven** | Módulos NUNCA se importam diretamente. Toda comunicação passa pelo Event Bus. |
| **SOLID** | Cada classe tem uma responsabilidade. Abstrações > Concretas. |
| **Clean Architecture** | Dependências apontam para dentro. Frameworks na periferia. |
| **DDD** | Cada módulo é um Bounded Context. Eventos entre módulos. |
| **CQRS** | Separação entre comandos (escrita) e queries (leitura). |
| **Plugin Architecture** | Tudo é extensível via contratos. |
| **BYOK** | Usuário traz seus próprios provedores de IA. |
| **Free-by-Default** | Modelos gratuitos como padrão. |

### 1.3 Contratos de Comunicação

```
Módulo → EventBus → Módulo         (eventos assíncronos)
Módulo → CommandBus → Módulo        (comandos síncronos com resposta)
Módulo → QueryBus → Módulo          (consultas com resposta)
API → CommandBus → Módulo           (entrada externa)
Módulo → RPC → Kernel               (chamadas de sistema)
```

---

## 2. Visão Geral do Sistema

### 2.1 Diagrama de Contexto (C4 - Nível 1)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BEEHIVE OS PLATFORM                              │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │  Web App  │  │  Mobile  │  │    API   │  │   MCP Clients        │   │
│  │ (Next.js) │  │  (TBD)   │  │ (REST)   │  │ (Ext. Agents)       │   │
│  └─────┬─────┘  └─────┬────┘  └─────┬────┘  └────────┬─────────────┘   │
│        └───────────────┴─────────────┴────────────────┘                 │
│                            │                                            │
│                    ┌───────┴────────┐                                   │
│                    │   API Gateway   │                                   │
│                    └───────┬────────┘                                   │
│                            │                                            │
│              ┌─────────────┼─────────────┐                              │
│              │             │             │                              │
│     ┌────────┴────┐ ┌─────┴──────┐ ┌────┴────────┐                     │
│     │  WebSocket  │ │  REST API  │ │  RPC (MCP)  │                     │
│     └────────┬────┘ └─────┬──────┘ └────────┬────┘                     │
│              └────────────┼─────────────────┘                          │
│                           │                                             │
│                    ┌──────┴──────┐                                      │
│                    │    KERNEL    │                                      │
│                    │  (EventBus)  │                                      │
│                    └──────┬──────┘                                      │
│                           │                                             │
│          ┌────────────────┼──────────────────┐                          │
│          │                │                  │                          │
│   ┌──────┴──────┐ ┌──────┴──────┐  ┌───────┴────────┐                  │
│   │   Módulos   │ │  Core Svc   │  │    Plugins     │                  │
│   │ (Negócio)   │ │ (AI, Mem..) │  │ (Extensões)    │                  │
│   └──────┬──────┘ └──────┬──────┘  └───────┬────────┘                  │
│          │               │                  │                           │
│          └───────────────┴──────────────────┘                           │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                    INFRAESTRUTURA                               │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐│    │
│  │  │PostgreSQL│ │  Redis   │ │  BullMQ  │ │S3/Minio│ │ Docker ││    │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘ └────────┘│    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Estrutura de Diretórios

```
beehive/
│
├── apps/
│   ├── web/                              # Next.js 16 Frontend
│   │   ├── src/
│   │   │   ├── app/                      # App Router (Next.js 16)
│   │   │   │   ├── (auth)/
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── projects/
│   │   │   │   │   ├── workspace/
│   │   │   │   │   ├── settings/
│   │   │   │   │   ├── modules/          # Módulos de negócio
│   │   │   │   │   │   ├── business/
│   │   │   │   │   │   ├── coding/
│   │   │   │   │   │   ├── legal/
│   │   │   │   │   │   ├── trading/
│   │   │   │   │   │   ├── content-creator/
│   │   │   │   │   │   ├── youtube/
│   │   │   │   │   │   └── browser/
│   │   │   │   │   ├── admin/
│   │   │   │   │   └── marketplace/
│   │   │   │   ├── api/                  # Next.js API Routes (BFF)
│   │   │   │   │   └── [...path]/route.ts
│   │   │   ├── components/
│   │   │   │   ├── ui/                   # shadcn/ui
│   │   │   │   ├── layout/
│   │   │   │   ├── common/
│   │   │   │   ├── modules/
│   │   │   │   └── agents/
│   │   │   ├── hooks/
│   │   │   ├── stores/                   # Zustand
│   │   │   ├── services/                 # TanStack Query
│   │   │   ├── lib/
│   │   │   └── types/
│   │   └── public/
│   │
│   └── api/                              # API Layer (Hono/Fastify)
│       ├── src/
│       │   ├── index.ts
│       │   ├── config.ts
│       │   ├── routes/
│       │   │   └── v1/
│       │   ├── websocket/
│       │   │   ├── handlers/
│       │   │   └── rooms.ts
│       │   ├── middleware/
│       │   ├── mcp/
│       │   │   ├── server.ts
│       │   │   ├── tools/
│       │   │   └── resources/
│       │   └── __tests__/
│       └── package.json
│
├── packages/
│   ├── kernel/                           # @beehive/kernel
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── kernel.ts
│   │   │   ├── event-bus/
│   │   │   ├── command-bus/
│   │   │   ├── query-bus/
│   │   │   ├── module-loader/
│   │   │   ├── plugin-loader/
│   │   │   ├── service-registry/
│   │   │   ├── scheduler/
│   │   │   ├── lifecycle/
│   │   │   ├── config/
│   │   │   ├── logger/
│   │   │   └── errors/
│   │   └── package.json
│   │
│   ├── core-services/                    # @beehive/core
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── ai/                       # AI Manager, providers
│   │   │   ├── memory/                   # Memory Engine
│   │   │   ├── tools/                    # Tool Registry
│   │   │   ├── workflow/                 # Workflow Engine
│   │   │   ├── agents/                   # Agent Framework
│   │   │   ├── skills/                   # Skill System
│   │   │   ├── auth/                     # Auth Service
│   │   │   ├── billing/                  # Billing
│   │   │   ├── workspace/                # Workspace
│   │   │   ├── notifications/            # Notifications
│   │   │   ├── analytics/                # Analytics
│   │   │   └── marketplace/              # Marketplace
│   │   └── package.json
│   │
│   └── shared/                           # @beehive/shared
│       ├── src/
│       │   ├── types/                    # Tipos compartilhados
│       │   ├── constants/                # Events, Commands
│       │   ├── validators/
│       │   └── utils/
│       └── package.json
│
├── modules/                              # Módulos de Negócio
│   ├── business/
│   ├── coding/
│   ├── content-creator/
│   ├── youtube/
│   ├── legal/
│   ├── trading/
│   ├── browser/
│   └── template/                         # Template para novos
│
├── services/                             # Python / FastAPI
│   ├── ml-pipeline/
│   └── search/
│
├── database/
│   ├── schema/                           # Prisma
│   │   └── schema.prisma
│   ├── drizzle/                          # Drizzle ORM
│   └── seeds/
│
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── Dockerfile.ml
│
├── scripts/
├── docs/
├── .github/workflows/
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── .env.example
```

---

## 4. Camadas da Arquitetura

### 4.1 Clean Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE LAYER                               │
│  Frameworks, Drivers, DB, Redis, S3, Web, HTTP, WebSocket, MCP         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  apps/web (Next.js)  │  apps/api (Hono)  │  services/*          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
┌─────────────────────────────────────┴───────────────────────────────────┐
│                      INTERFACE ADAPTERS LAYER                           │
│  Controllers, Presenters, Gateways, Route Handlers, WS Handlers         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  api/routes/v1/*  │  websocket/handlers/*  │  mcp/tools/*       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
┌─────────────────────────────────────┴───────────────────────────────────┐
│                      APPLICATION LAYER                                  │
│  Use Cases, Commands, Queries, Event Handlers, DTOs                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Módulos (modules/*) │ Core Services (core-services/*)           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
┌─────────────────────────────────────┴───────────────────────────────────┐
│                      DOMAIN LAYER                                       │
│  Entities, Value Objects, Aggregates, Domain Events, Repositories       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  packages/kernel (core domain) │ shared/types (domain types)     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Regra de Dependências

Infrastructure → Interface Adapters → Application → Domain. Todas apontam para dentro. O Domínio não conhece HTTP, banco ou Next.js.

---

## 5. Microkernel

### 5.1 Responsabilidades do Kernel

1. Gerenciar ciclo de vida (boot, shutdown, health)
2. Prover EventBus para comunicação entre módulos
3. Gerenciar módulos (load, unload, health)
4. Gerenciar plugins (load, unload)
5. Prover serviços base (config, logger, scheduler)
6. Roteamento de comandos (CommandBus)
7. Roteamento de queries (QueryBus)

### 5.2 Interface do Kernel

```typescript
export interface IKernel {
  readonly id: string;
  readonly status: KernelStatus;
  readonly version: string;

  boot(): Promise<KernelBootReport>;
  shutdown(): Promise<void>;
  health(): Promise<KernelHealth>;

  readonly events: IEventBus;
  readonly commands: ICommandBus;
  readonly queries: IQueryBus;
  readonly modules: IModuleLoader;
  readonly plugins: IPluginLoader;
  readonly services: IServiceRegistry;
  readonly scheduler: IScheduler;
  readonly config: IConfigurationManager;
  readonly logger: ILogger;
}

export type KernelStatus =
  | 'booting' | 'running' | 'degraded'
  | 'stopping' | 'stopped' | 'crashed';
```

### 5.3 Fluxo de Boot

```
1. Kernel.boot()
   ├── 1.1 Init Config (env, defaults)
   ├── 1.2 Init Logger
   ├── 1.3 Init EventBus
   ├── 1.4 Init CommandBus
   ├── 1.5 Init QueryBus
   ├── 1.6 Init ServiceRegistry
   ├── 1.7 Register Core Services
   │   ├── AI Manager
   │   ├── Tool Registry
   │   ├── Memory Engine
   │   ├── Auth Service
   │   ├── Workspace Service
   │   └── Notification Service
   ├── 1.8 Load Modules
   │   └── For each module:
   │       ├── Validate manifest
   │       ├── Load module code
   │       ├── Register event handlers
   │       ├── Register command handlers
   │       ├── Call module.onBoot()
   │       └── Mark as 'loaded'
   ├── 1.9 Load Plugins
   ├── 1.10 Init Scheduler
   └── 1.11 Emit 'kernel:booted'
```

---

## 6. Event Bus

### 6.1 Arquitetura

O Event Bus é o sistema nervoso do BeeHive. Todo módulo, serviço e plugin se comunica exclusivamente através dele.

### 6.2 Nomenclatura

```
<domínio>:<ação>:<status>

Exemplos:
  module:loaded
  agent:task:completed
  provider:status:changed
  workflow:step:completed
  user:login:succeeded
  conversation:message
```

### 6.3 Eventos Core

```typescript
export const SYSTEM_EVENTS = {
  KERNEL_BOOTED:            'kernel:booted',
  KERNEL_SHUTDOWN:          'kernel:shutdown',
  MODULE_LOADED:            'module:loaded',
  MODULE_UNLOADED:          'module:unloaded',
  MODULE_ERROR:             'module:error',
  PLUGIN_LOADED:            'plugin:loaded',
  PLUGIN_UNLOADED:          'plugin:unloaded',
  AGENT_TASK_STARTED:       'agent:task:started',
  AGENT_TASK_COMPLETED:     'agent:task:completed',
  AGENT_TASK_FAILED:        'agent:task:failed',
  AGENT_MESSAGE:            'agent:message',
  CONVERSATION_MESSAGE:     'conversation:message',
  PROVIDER_CONNECTED:       'provider:connected',
  PROVIDER_DISCONNECTED:    'provider:disconnected',
  WORKFLOW_STARTED:         'workflow:started',
  WORKFLOW_COMPLETED:       'workflow:completed',
  WORKFLOW_FAILED:          'workflow:failed',
  MEMORY_STORED:            'memory:stored',
  USER_AUTHENTICATED:       'user:authenticated',
  BILLING_INVOICE_GENERATED:'billing:invoice:generated',
  NOTIFICATION_SENT:        'notification:sent',
  ERROR_OCCURRED:           'error:occurred',
} as const;
```

### 6.4 Interfaces do Event Bus

```typescript
export interface EventEnvelope<T = unknown> {
  id: string;
  type: string;
  source: string;
  timestamp: number;
  priority: 'critical' | 'high' | 'normal' | 'low';
  payload: T;
  correlationId?: string;
  causationId?: string;
  metadata?: Record<string, unknown>;
}

export type EventHandler<T = unknown> = (
  event: EventEnvelope<T>,
  ctx: EventContext
) => Promise<void> | void;

export interface EventContext {
  kernel: IKernel;
  abort(): void;
  emit(childEvent: string, payload?: unknown): void;
}

export interface IEventBus {
  init(): Promise<void>;
  shutdown(): Promise<void>;
  emit<T>(type: string, payload: T, options?: EmitOptions): Promise<string>;
  on<T>(eventType: string, handler: EventHandler<T>, options?: SubscribeOptions): EventSubscription;
  once<T>(eventType: string, handler: EventHandler<T>): EventSubscription;
  off(subscription: EventSubscription): void;
  use(middleware: EventMiddleware): void;
  waitFor<T>(eventType: string, timeout?: number): Promise<EventEnvelope<T>>;
  getSubscriptions(eventType?: string): EventSubscription[];
  flush(): Promise<void>;
  getStats(): EventBusStats;
}
```

### 6.5 Redis Event Bus (Escala Horizontal)

O `RedisEventBus` implementa `IEventBus` usando Redis Pub/Sub e Redis Streams. Módulos em diferentes processos ou máquinas compartilham o mesmo barramento de eventos. Eventos críticos são persistidos em Streams para replay.

---

## 7. Sistema de Módulos

### 7.1 Contrato de Módulo

```typescript
export interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  dependencies?: string[];
  provides: ModuleCapability[];
  subscribesTo: string[];
  commands: string[];
  ui?: {
    routes: ModuleRoute[];
    navigation: ModuleNavItem[];
    components: string[];
  };
  permissions: string[];
  resources?: { memory?: number; cpu?: number };
}

export interface BeeHiveModule {
  readonly manifest: ModuleManifest;
  readonly status: ModuleStatus;
  onBoot(kernel: IKernel): Promise<void>;
  onShutdown(): Promise<void>;
  health(): Promise<ModuleHealth>;
  handleEvent?(event: EventEnvelope, ctx: EventContext): Promise<void>;
  handleCommand?(command: CommandEnvelope, ctx: CommandContext): Promise<unknown>;
}
```

### 7.2 Classe Base

```typescript
export abstract class BaseModule implements BeeHiveModule {
  abstract readonly manifest: ModuleManifest;
  status: ModuleStatus = 'registered';
  protected kernel!: IKernel;
  protected events!: IEventBus;
  protected commands!: ICommandBus;
  protected logger!: ILogger;

  async onBoot(kernel: IKernel): Promise<void> {
    this.kernel = kernel;
    this.events = kernel.events;
    this.commands = kernel.commands;
    this.logger = kernel.logger.child({ module: this.manifest.id });

    if (this.handleEvent) {
      for (const eventType of this.manifest.subscribesTo) {
        this.events.on(eventType, (event, ctx) => this.handleEvent!(event, ctx));
      }
    }
    if (this.handleCommand) {
      for (const cmdType of this.manifest.commands) {
        this.commands.on(cmdType, (cmd, ctx) => this.handleCommand!(cmd, ctx));
      }
    }
    this.status = 'loaded';
  }

  async onShutdown(): Promise<void> { this.status = 'unloaded'; }
  async health(): Promise<ModuleHealth> {
    return { status: this.status === 'loaded' ? 'healthy' : 'unhealthy' };
  }
  protected emit<T>(type: string, payload: T, options?: EmitOptions) {
    return this.events.emit(type, payload, { ...options, metadata: { ...options?.metadata, source: this.manifest.id } });
  }
  protected dispatch<T>(type: string, payload: T) {
    return this.commands.dispatch(type, payload, { source: this.manifest.id });
  }
}
```

### 7.3 Module Loader

O `ModuleLoader` escaneia diretórios configurados, lê `module.json` de cada módulo, valida o manifesto, carrega o módulo via import dinâmico, e o registra no Kernel. Módulos podem ser carregados/descarregados em tempo de execução via `module:load` / `module:unload` events.

---

## 8. Sistema de Plugins

### 8.1 Contrato de Plugin

```typescript
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  entryPoint: string;
  kernelVersion: string;
  permissions: string[];
  config?: Record<string, unknown>;
}

export interface BeeHivePlugin {
  readonly manifest: PluginManifest;
  isLoaded(): boolean;
  onLoad(kernel: IKernel, config?: Record<string, unknown>): Promise<void>;
  onUnload(): Promise<void>;
  getTools?(): ToolDefinition[];
  getProviders?(): AIProviderDefinition[];
  getUIComponents?(): PluginUIComponent[];
}
```

### 8.2 Plugin Loader

Plugins são módulos de terceiros, instalados via npm ou marketplace. O `PluginLoader`:

1. Escaneia diretórios (`plugins/`, `.beehive/plugins/`)
2. Verifica compatibilidade de versão do Kernel
3. Importa dinamicamente o entry point
4. Verifica permissões
5. Instancia e chama `onLoad()`
6. Registra ferramentas e providers expostos pelo plugin

---

## 9. Engine de IA

### 9.1 AI Manager

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AI MANAGER                                       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Agent Loop Controller                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │ Session       │  │ Context      │  │ Tool Exec    │          │   │
│  │  │ Manager       │  │ Builder      │  │ Engine       │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                  Provider Router                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │ Capability    │  │ Failover     │  │ Cost Tracker │          │   │
│  │  │ Matcher       │  │ Strategist   │  │              │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Interfaces

```typescript
export type AICapability =
  | 'chat' | 'streaming' | 'tool-calling' | 'vision'
  | 'image-generation' | 'embedding' | 'audio-transcription';

export interface AIRequest {
  model?: string;
  provider?: string;
  messages: AIMessage[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  stream?: boolean;
  responseFormat?: ResponseFormat;
  capabilities?: AICapability[];
  metadata?: Record<string, unknown>;
}

export interface AIResponse {
  id: string;
  model: string;
  provider: string;
  content: string;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
  finishReason: FinishReason;
  latency: number;
}

export interface IAIManager {
  execute(request: AIRequest): Promise<AIResponse>;
  executeStream(request: AIRequest): AsyncIterable<AIStreamChunk>;
  executeWithTools(request: AIRequest, tools: ToolDefinition[]): Promise<AIResponse>;
  getProviders(): AIProviderInfo[];
  getModels(filter?: ModelFilter): ModelInfo[];
}
```

### 9.3 Provider Manager

Gerencia o ciclo de vida dos providers de IA. Providers são registrados via `register()`, configurados via credenciais criptografadas no banco, e priorizados pelo `LLMRouter`. Suporta failover automático: se um provider falha, o próximo na fila de prioridade é usado.

### 9.4 LLM Router

O roteador seleciona o provider ideal baseado em:
- Modelo solicitado
- Capacidades requeridas (tool-calling, vision, etc.)
- Prioridade configurada pelo usuário
- Custo por token
- Health check do provider

### 9.5 Catálogo de Provedores

| Provider | Modelos | Capabilities | Free |
|---|---|---|---|
| OpenAI | GPT-4o, GPT-4o-mini, o3-mini | chat, streaming, tool-calling, vision, embedding | ❌ |
| Anthropic | Claude Sonnet 4, Haiku 3.5 | chat, streaming, tool-calling, vision | ❌ |
| Gemini | Gemini 2.5 Flash, 2.0 Flash | chat, streaming, tool-calling, vision, embedding | ❌ |
| Groq | Llama 3.3 70B, Mixtral | chat, streaming, tool-calling | ✔ (limitado) |
| OpenRouter | 300+ modelos | chat, streaming, tool-calling, vision | BYOK |
| Ollama | Locais (Llama, Qwen, etc.) | chat, streaming, tool-calling, embedding | ✔ Local |
| OpenCode Zen | DeepSeek V4 Flash, Nemotron 3 | chat, streaming | ✔ |

---

## 10. Sistema de Memória

### 10.1 Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      MEMORY ENGINE                                      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Memory Manager                                │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │ Working       │  │  Long-Term   │  │  Episodic    │          │   │
│  │  │ (Redis)       │  │ (pgvector)   │  │ (PostgreSQL) │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   Embedding Service                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │   │
│  │  │ OpenAI        │  │  Ollama      │  │  (fallback: local)  │  │   │
│  │  │ text-embedding│  │  nomic-embed │  │                      │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Interfaces

```typescript
export type MemoryType = 'working' | 'long-term' | 'episodic' | 'semantic';

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  agentId: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  timestamp: number;
  score?: number;
}

export interface MemoryQuery {
  content?: string;
  embedding?: number[];
  agentId?: string;
  type?: MemoryType;
  limit?: number;
  threshold?: number;
  filter?: Record<string, unknown>;
}

export interface IMemoryManager {
  store(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<string>;
  search(query: MemoryQuery): Promise<MemorySearchResult>;
  semanticSearch(text: string, options?: SearchOptions): Promise<MemorySearchResult>;
  forget(id: string): Promise<void>;
  clear(type?: MemoryType): Promise<void>;
  reindex(): Promise<void>;
}
```

---

## 11. Tool Registry

### 11.1 Interfaces

```typescript
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  required?: string[];
  category: ToolCategory;
  permissions?: string[];
  timeout?: number;
}

export type ToolCategory =
  | 'filesystem' | 'terminal' | 'git' | 'browser'
  | 'web' | 'database' | 'email' | 'ai' | 'media' | 'system' | 'custom';

export interface ITool {
  readonly definition: ToolDefinition;
  execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolExecutionResult>;
}

export interface IToolRegistry {
  register(tool: ITool): void;
  unregister(toolName: string): void;
  get(toolName: string): ITool | undefined;
  list(category?: ToolCategory): ToolDefinition[];
  execute(request: ToolExecutionRequest): Promise<ToolExecutionResult>;
}
```

### 11.2 Ferramentas Built-in

| Tool | Categoria | Descrição |
|---|---|---|
| `filesystem` | filesystem | Ler, escrever, listar arquivos |
| `terminal` | terminal | Executar comandos shell |
| `git` | git | Operações Git |
| `browser` | browser | Automação de navegador |
| `web_search` | web | Busca na web |
| `web_fetch` | web | Fetch de URLs |
| `database_query` | database | Query SQL |
| `email_send` | email | Envio de email |
| `image_generate` | media | Geração de imagens |
| `code_execute` | system | Execução segura de código |
| `vector_search` | ai | Busca semântica |

---

## 12. Workflow Engine

```typescript
export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  timeout?: number;
  maxRetries?: number;
}

export type WorkflowTrigger =
  | { type: 'event'; eventType: string }
  | { type: 'schedule'; cron: string }
  | { type: 'webhook'; path: string }
  | { type: 'manual' };

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'parallel' | 'foreach' | 'wait' | 'subworkflow' | 'llm';
  config: Record<string, unknown>;
  next?: string;
  onFailure?: string;
}

export interface IWorkflowEngine {
  register(workflow: WorkflowDefinition): void;
  start(workflowId: string, context?: Record<string, unknown>): Promise<WorkflowInstance>;
  cancel(instanceId: string): Promise<void>;
  getInstance(instanceId: string): Promise<WorkflowInstance | null>;
}
```

Workflows são executados por workers BullMQ. Cada passo é uma job na fila. Steps `parallel` disparam múltiplos jobs simultâneos. Steps `llm` usam o AI Manager.

---

## 13. Agent Framework

### 13.1 Agent Loop

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Agent Loop                                           │
│                                                                         │
│  ┌─────────┐   ┌──────────┐   ┌─────────┐   ┌──────────┐              │
│  │ Observe  │──→│  Think   │──→│  Act    │──→│  Reflect │              │
│  │ (Event)  │   │ (LLM)    │   │ (Tool)  │   │ (Memory) │              │
│  └─────────┘   └──────────┘   └─────────┘   └──────────┘              │
│       ↑                                            │                    │
│       └────────────────────────────────────────────┘                    │
│                    (loop until done)                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 13.2 Interfaces

```typescript
export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  model?: string;
  provider?: string;
  systemPrompt: string;
  tools: string[];
  skills: string[];
  maxIterations?: number;
  triggers: AgentTrigger[];
}

export type AgentTrigger =
  | { type: 'event'; eventType: string }
  | { type: 'schedule'; cron: string }
  | { type: 'conversation' }
  | { type: 'manual' };

export interface IAgentFramework {
  createAgent(def: AgentDefinition): Promise<AgentInstance>;
  destroyAgent(agentId: string): Promise<void>;
  startSession(agentId: string, initialContext?: Record<string, unknown>): Promise<AgentSession>;
  sendMessage(agentId: string, message: string, sessionId?: string): AsyncIterable<AIStreamChunk>;
  triggerAgent(agentId: string, payload?: unknown): Promise<void>;
}
```

---

## 14. Banco de Dados

### 14.1 Estratégia

| Tecnologia | Uso | ORM |
|---|---|---|
| **PostgreSQL** | Dados primários | Prisma (schema) + Drizzle (queries) |
| **pgvector** | Embeddings vetoriais | Drizzle + SQL raw |
| **Redis** | Cache, sessões, presença | ioredis |
| **SQLite** | Dev/local workspace | better-sqlite3 |

### 14.2 Modelos Principais (Prisma)

**User, Account, Session, ApiKey** — Autenticação multi-provedor (email, OAuth, API Key)

**Workspace, WorkspaceUser, Project, ProjectFile** — Organização hierárquica: Workspace → Project → Files/Agents/Workflows

**Module** — Registro de módulos ativos por workspace

**Agent, AgentMemory** — Agentes com memória vetorial (pgvector)

**Conversation, ConversationMessage** — Histórico de conversas

**Workflow, WorkflowInstance** — Definições e instâncias de workflows

**Provider** — Credenciais de provedores de IA (criptografadas)

**Subscription, Invoice** — Planos e faturamento

**AnalyticsEvent, Activity** — Eventos de analytics e log de atividades

---

## 15. Cache e Filas

### 15.1 Redis

```typescript
// Gerenciamento centralizado de Redis
export class RedisManager {
  public readonly cache: Redis;     // Cache geral (LRU)
  public readonly pub: Redis;      // Pub/Sub para EventBus
  public readonly sub: Redis;      // Subscribe connection
  public readonly queue: Redis;    // BullMQ
  public readonly session: Redis;  // Sessões de usuário
  public readonly rateLimit: Redis;// Rate limiting
}
```

### 15.2 Cache Strategy

```
Working Memory:    Redis com TTL (minutos)
Session Store:     Redis (string)
Rate Limiter:      Redis (sorted set / sliding window)
Event Bus:         Redis Pub/Sub + Streams
BullMQ Queue:      Redis (persistente)
```

### 15.3 BullMQ Filas

```typescript
export const QUEUES = {
  AI_EXECUTION:      'ai:execution',        // Chamadas de IA
  AGENT_PROCESSING:  'agent:processing',    // Loops de agente
  WORKFLOW_STEPS:    'workflow:steps',      // Steps de workflow
  SHORTS_PIPELINE:   'shorts:pipeline',     // Pipeline de vídeo
  NOTIFICATIONS:     'notifications',       // Notificações
  ANALYTICS:         'analytics',           // Eventos de analytics
  EMAIL:             'email',               // Envio de emails
  BROWSER_TASKS:     'browser:tasks',       // Automação de browser
} as const;
```

---

## 16. API e WebSocket

### 16.1 REST API

```
GET    /api/v1/health                    # Health check
GET    /api/v1/status                    # Status do sistema

# Auth
POST   /api/v1/auth/login                # Login
POST   /api/v1/auth/register             # Registrar
POST   /api/v1/auth/logout               # Logout
GET    /api/v1/auth/session              # Sessão atual

# Workspace
GET    /api/v1/workspace                 # Listar workspaces
POST   /api/v1/workspace                 # Criar workspace
PUT    /api/v1/workspace/:id             # Atualizar workspace

# Projects
GET    /api/v1/projects                  # Listar projetos
POST   /api/v1/projects                  # Criar projeto
GET    /api/v1/projects/:id              # Detalhe projeto
PUT    /api/v1/projects/:id              # Atualizar projeto
DELETE /api/v1/projects/:id              # Deletar projeto

# Modules
GET    /api/v1/modules                   # Listar módulos disponíveis
POST   /api/v1/modules/:id/enable        # Habilitar módulo
POST   /api/v1/modules/:id/disable       # Desabilitar módulo
GET    /api/v1/modules/:id/status        # Status do módulo

# Providers
GET    /api/v1/providers                 # Listar provedores
POST   /api/v1/providers                 # Adicionar provedor
PUT    /api/v1/providers/:id             # Atualizar provedor
DELETE /api/v1/providers/:id             # Remover provedor
POST   /api/v1/providers/:id/test       # Testar conexão

# Agents
GET    /api/v1/agents                    # Listar agentes
POST   /api/v1/agents                    # Criar agente
POST   /api/v1/agents/:id/chat          # Chat com agente
POST   /api/v1/agents/:id/trigger       # Trigger manual

# Conversation
POST   /api/v1/conversation/send        # Enviar mensagem
POST   /api/v1/conversation/stream      # Enviar (streaming)

# Workflows
GET    /api/v1/workflows                 # Listar workflows
POST   /api/v1/workflows                 # Criar workflow
POST   /api/v1/workflows/:id/start      # Iniciar workflow

# Billing
GET    /api/v1/billing/plan             # Plano atual
GET    /api/v1/billing/invoices         # Faturas

# Marketplace
GET    /api/v1/marketplace/modules       # Marketplace módulos
GET    /api/v1/marketplace/plugins       # Marketplace plugins

# Admin
GET    /api/v1/admin/users               # Listar usuários
GET    /api/v1/admin/system              # Status do sistema
```

### 16.2 WebSocket

```
Endpoint: /ws

Eventos do Servidor → Cliente:
  event:module:loaded        # Módulo carregado
  event:agent:message        # Nova mensagem do agente
  event:agent:status         # Status do agente
  event:workflow:progress    # Progresso do workflow
  event:notification         # Notificação
  event:system:health        # Health check periódico

Eventos do Cliente → Servidor:
  subscribe:room             # Entrar em sala
  unsubscribe:room           # Sair de sala
  agent:message              # Enviar mensagem para agente
  ping                       # Keepalive
```

---

## 17. Autenticação

### 17.1 Estratégia

- **Primary:** JWT (access + refresh tokens)
- **Social:** OAuth 2.0 (Google, GitHub)
- **API:** API Keys para acesso programático
- **M2M:** Client credentials para serviços internos

### 17.2 Fluxo

```
1. Login → Auth Service → valida credenciais → gera JWT (access 15min, refresh 7d)
2. Request → Auth Middleware → valida JWT → extrai user → injeta no contexto
3. Refresh → Auth Service → valida refresh token → gera novo access token
4. API Key → Auth Middleware → busca key no DB → valida → injeta no contexto
```

---

## 18. Módulos de Negócio

Cada módulo segue o mesmo padrão arquitetural:

```
modules/<module>/
├── src/
│   ├── index.ts              # Exporta módulo
│   ├── module.ts             # Classe do módulo (extends BaseModule)
│   ├── events.ts             # Event handlers específicos
│   ├── commands.ts           # Command handlers específicos
│   ├── services/             # Lógica de negócio
│   ├── agents/               # Agentes especializados
│   ├── workflows/            # Workflows do módulo
│   └── types.ts              # Tipos do módulo
```

### 18.1 Módulo de Negócios (Business)

Planejamento estratégico, marketing e gestão.
- Serviços: `ContentStrategistService`, `PostWriterService`, `CompetitorAnalysisService`
- Agentes: `TrendAnalyst`, `ContentDirector`, `SEOAgent`
- Workflows: `weekly-content-plan`, `competitor-analysis`, `social-media-posting`

### 18.2 Módulo de Desenvolvimento (Coding)

Ambiente de desenvolvimento assistido por IA.
- Serviços: `CodeReviewService`, `CodeGenerationService`, `RefactoringService`
- Agentes: `CodeReviewer`, `ArchitectureAgent`, `TestGenerator`
- Workflows: `code-review-pipeline`, `refactoring-plan`, `test-generation`

### 18.3 Módulo Criador de Conteúdo (Content Creator)

Criação e gestão de conteúdo multiplataforma.
- Serviços: `ContentPlanner`, `MediaGenerator`, `SEOService`
- Agentes: `ContentStrategist`, `CopyWriter`, `ImageCreator`

### 18.4 Módulo YouTube

Automação completa do YouTube (Shorts e vídeos longos).
- Serviços: `ShortsPipeline`, `Transcriber`, `Clipper`, `Publisher`
- Workers: `shorts.worker`, `publish.worker`
- Pipeline Python: download → transcrição → highlights → corte → legendas → metadados → publish

### 18.5 Módulo Jurídico (Legal / OAB)

Estudo para OAB e assistência jurídica.
- Serviços: `OABSimulator`, `LawSearchService`, `DocumentAnalyzer`
- Agentes: `JurisprudenceAgent`, `ExamTrainer`, `ContractAgent`

### 18.6 Módulo de Trading

Análise de mercado e execução de trades.
- Serviços: `MarketDataService`, `TechnicalAnalysis`, `RiskManager`
- Agentes: `MarketAnalyst`, `SignalGenerator`, `PortfolioManager`

### 18.7 Módulo Browser

Automação de navegador para tarefas web.
- Serviços: `BrowserPool`, `SessionManager`, `Recorder`
- Baseado em Playwright + stealth

---

## 19. Integração MCP

### 19.1 Arquitetura

O BeeHive implementa o protocolo MCP (Model Context Protocol) para permitir que agentes externos (Claude Code, Cursor, etc.) interajam com o ecossistema.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MCP SERVER (apps/api/src/mcp/)                       │
│                                                                         │
│  stdio/transport ←→ MCP Protocol ←→ BeeHive Kernel                     │
│                                          │                             │
│  Tools:                                  │                             │
│  ├── beehive_list_modules                │                             │
│  ├── beehive_enable_module               │                             │
│  ├── beehive_list_providers              │                             │
│  ├── beehive_configure_provider          │                             │
│  ├── beehive_execute_agent               ├── EventBus ──→ Módulos     │
│  ├── beehive_manage_workspace            │                             │
│  ├── beehive_create_project              │                             │
│  ├── beehive_search_memory               │                             │
│  └── beehive_execute_tool                │                             │
│                                                                         │
│  Resources:                              │                             │
│  ├── beehive://modules/{id}              │                             │
│  ├── beehive://providers/{id}            │                             │
│  ├── beehive://agents/{id}               │                             │
│  ├── beehive://projects/{id}             │                             │
│  └── beehive://workspace/status          │                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 19.2 MCP Server (stdio + SSE)

```typescript
// apps/api/src/mcp/server.ts
export class BeeHiveMCPServer {
  private kernel: IKernel;

  constructor(kernel: IKernel) {
    this.kernel = kernel;
  }

  async start(transport: 'stdio' | 'sse', options?: SSEServerOptions): Promise<void> {
    const server = new McpServer({
      name: 'BeeHive OS',
      version: '3.0.0',
    });

    // --- Tools ---
    server.tool(
      'beehive_list_modules',
      { status: z.string().optional() },
      async ({ status }) => {
        const modules = Array.from(this.kernel.modules.getAll().values())
          .filter(m => !status || m.status === status)
          .map(m => ({ id: m.manifest.id, name: m.manifest.name, status: m.status }));
        return { content: [{ type: 'text', text: JSON.stringify(modules, null, 2) }] };
      }
    );

    server.tool(
      'beehive_execute_agent',
      { agentId: z.string(), message: z.string() },
      async ({ agentId, message }) => {
        const result = await this.kernel.commands.dispatch('agent:execute', { agentId, message });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      }
    );

    server.tool(
      'beehive_search_memory',
      { query: z.string(), limit: z.number().optional() },
      async ({ query, limit }) => {
        const results = await this.kernel.services.get('memory').search({ content: query, limit });
        return { content: [{ type: 'text', text: JSON.stringify(results) }] };
      }
    );

    server.tool(
      'beehive_create_project',
      { name: z.string(), workspaceId: z.string() },
      async ({ name, workspaceId }) => {
        const project = await this.kernel.commands.dispatch('project:create', { name, workspaceId });
        return { content: [{ type: 'text', text: JSON.stringify(project) }] };
      }
    );

    // --- Resources ---
    server.resource(
      'modules',
      'beehive://modules/{id}',
      async (uri, { id }) => {
        const mod = this.kernel.modules.get(id);
        if (!mod) throw new Error(`Module ${id} not found`);
        return { contents: [{ uri: uri.href, text: JSON.stringify(mod.manifest) }] };
      }
    );

    server.resource(
      'workspace-status',
      'beehive://workspace/status',
      async (uri) => {
        const health = await this.kernel.health();
        return { contents: [{ uri: uri.href, text: JSON.stringify(health) }] };
      }
    );

    // Start transport
    if (transport === 'stdio') {
      server.connect(Transport.stdio());
    } else if (transport === 'sse') {
      server.connect(Transport.sse(options?.port ?? 3100));
    }
  }
}
```

---

## 20. Roadmap de Implementação

### Fase 1: Fundação (Semanas 1-4)

**Objetivo:** Kernel funcional + 1 módulo operacional

| Atividade | Tecnologia |
|---|---|
| Monorepo setup (pnpm + Turborepo) | pnpm, Turborepo |
| Kernel: EventBus, CommandBus, QueryBus | TypeScript |
| Kernel: ModuleLoader, PluginLoader | TypeScript |
| Kernel: Boot lifecycle, Health check | TypeScript |
| Core: AI Manager + Provider Manager | TypeScript |
| Core: OpenAI, Anthropic, Gemini providers | TypeScript |
| Core: Ollama provider (local) | TypeScript |
| Database: Prisma schema + migrations | PostgreSQL + Prisma |
| Database: Redis setup + cache layer | Redis + ioredis |
| Módulo: Conversa (chat básico) | TypeScript |
| API: REST endpoints core (auth, modules, providers) | Hono/Fastify |
| Web: Setup Next.js + shadcn/ui + layout | Next.js 16 |
| Web: Tela de login + dashboard v1 | React 19 |
| Testes: Kernel, AI Manager, Providers | Vitest |

**Milestone:** Sistema operacional com chat, 3+ provedores de IA, e extensão por módulos.

### Fase 2: Agentes e Memória (Semanas 5-8)

**Objetivo:** Framework de agentes completo + memória persistente

| Atividade | Tecnologia |
|---|---|
| Agent Framework: AgentLoop, Session manager | TypeScript |
| Memory Engine: Working + Long-term + Episodic | PostgreSQL + pgvector |
| Embedding Service + Vector search | pgvector |
| Tool Registry + built-in tools | TypeScript |
| WebSocket server + event streaming | ws |
| Módulo: Projetos (CRUD + arquivos) | TypeScript |
| Módulo: Business (plano de conteúdo + posts) | TypeScript |
| Web: Tela de projetos | Next.js |
| Web: Tela de negócios | Next.js |
| Web: Agent chat UI | Next.js + Zustand |
| WebSocket client + live updates | TanStack Query |

**Milestone:** Agentes autônomos com memória e ferramentas.

### Fase 3: Automação e Workflows (Semanas 9-12)

**Objetivo:** Workflow Engine + automações + módulos verticais

| Atividade | Tecnologia |
|---|---|
| Workflow Engine: Definição + execução | BullMQ |
| Workflow Steps: Condition, Parallel, Foreach | TypeScript |
| Skill System: triggers + actions | TypeScript |
| BullMQ Workers: AI, Agent, Workflow | BullMQ + Redis |
| Módulo: YouTube (Shorts pipeline) | TypeScript + Python |
| Módulo: Coding (code review, generation) | TypeScript |
| Módulo: Content Creator | TypeScript |
| Services: ML Pipeline (FastAPI + Python) | FastAPI |
| Docker: docker-compose dev + prod | Docker |
| Web: Workflow builder UI | Next.js |
| Web: YouTube module UI | Next.js |
| Web: Coding module UI | Next.js |

**Milestone:** Plataforma multi-módulo com automações agendadas.

### Fase 4: Escala e Ecossistema (Semanas 13-16)

**Objetivo:** Billing, marketplace, plugins, escala horizontal

| Atividade | Tecnologia |
|---|---|
| Redis EventBus (escala horizontal) | Redis Pub/Sub |
| MCP Integration | MCP SDK |
| Auth: OAuth (Google, GitHub) | NextAuth.js |
| Auth: API Keys + Rate limiting | Redis |
| Billing: Planos + Stripe integration | Stripe |
| Marketplace: Plugin registry + install | NPM |
| Módulo: Legal (OAB simulator) | TypeScript |
| Módulo: Trading (market data + analysis) | TypeScript |
| Módulo: Browser automation | Playwright |
| Web: Marketplace UI | Next.js |
| Web: Admin panel | Next.js |
| Web: Settings (providers, modules) | Next.js |
| CI/CD: GitHub Actions + Railway/Vercel deploy | GitHub Actions |
| Load testing + performance tuning | k6 |

**Milestone:** Plataforma pronta para produção com ecossistema extensível.

### Fase 5: Polimento (Semanas 17-20)

**Objetivo:** Produção, documentação, comunidade

| Atividade | Tecnologia |
|---|---|
| Documentação de API (OpenAPI/Swagger) | OpenAPI |
| Documentação de desenvolvimento | Markdown |
| Testes E2E | Playwright |
| SEO + Performance | Lighthouse |
| Onboarding UX improvements | React |
| Plugin SDK + docs | TypeScript |
| Comunidade: Contributing guide | GitHub |

---

## 21. Diagramas de Fluxo

### 21.1 Fluxo de Requisição (Chat)

```
User → Next.js UI → API Route (/api/conversation/stream)
  → API Handler → CommandBus.dispatch('conversation:stream')
    → Conversation Module → AIManager.executeStream()
      → ProviderManager.resolve() → LLMRouter.route()
        → Provider.chatStream()
          → OpenAI / Anthropic / Ollama
      ← Stream chunks
    ← Stream chunks via EventBus
  ← SSE stream to client
```

### 21.2 Fluxo de Evento (Automação)

```
Scheduler → EventBus.emit('schedule:tick', { cron: '0 9 * * 1' })
  → Workflow Module → WorkflowEngine.start('weekly-report')
    → WorkflowInstance created
    → Step 1: LLM Agent → AIManager.execute({...})
      → MemoryManager.search({...})  // load context
      → ToolRegistry.execute('web_search', { query })
      → AI response + tool results
    → Step 2: Emit 'notification:send'
      → Notification Module → email/slack/notification
    → Step 3: Emit 'analytics:event'
      → Analytics Module → store event
  ← Workflow:completed
```

### 21.3 Fluxo de Plugin

```
User → Marketplace → PluginRegistry.install('github-plugin')
  → npm install @beehive/plugin-github
  → PluginLoader.load('github')
    → Validate manifest
    → Check kernel version
    → Dynamic import
    → Plugin.onLoad(kernel)
      → Register tools: github_pr, github_issue
      → Register events: 'github:pr:opened'
      → Register UI: Settings panel
  → Emit 'plugin:loaded'
```

---

## 22. Métricas e Observabilidade

### 22.1 Métricas Core

```typescript
export interface SystemMetrics {
  // Kernel
  kernelUptime: number;
  moduleCount: number;
  pluginCount: number;

  // Event Bus
  eventsEmitted: number;
  eventsHandled: number;
  eventsFailed: number;
  activeSubscriptions: number;

  // AI
  totalTokensUsed: number;
  totalCost: number;
  requestsPerMinute: number;
  averageLatency: number;
  providerUsage: Record<string, { tokens: number; cost: number; requests: number }>;

  // Agents
  activeAgents: number;
  agentSessions: number;
  agentErrors: number;

  // System
  cpuUsage: number;
  memoryUsage: { heapUsed: number; heapTotal: number; rss: number };
  activeConnections: number;
  queueSizes: Record<string, number>;
}
```

### 22.2 Log Estruturado

```typescript
export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  module: string;
  action: string;
  message: string;
  duration?: number;
  correlationId?: string;
  userId?: string;
  error?: { message: string; stack?: string };
  metadata?: Record<string, unknown>;
}
```

---

> Este documento é a especificação de arquitetura alvo v3.0. O código existente em `packages/platform` e `apps/` deve ser refatorado gradualmente para convergir com esta arquitetura, seguindo o roadmap de implementação por fases. Cada fase deve produzir código funcional e testado antes de avançar para a próxima.
