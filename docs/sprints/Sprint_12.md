# Sprint 12 — Plataforma de Packages (Workspaces)

> O BeeHive vira, de fato, uma plataforma de **packages**. Kernel, Module
> System, Service Layer, AI Layer, Tool System e Runtime — construídos e
> validados nas Sprints 6–11 dentro de `apps/web` — são extraídos para
> `packages/platform`, um pacote de workspace compartilhado. O **Runtime**
> passa a rodar como **processo próprio dentro de `apps/api`** (Node),
> expondo status/health/snapshot/logs e comandos por **HTTP**, e eventos por
> **WebSocket**. `apps/web` deixa de instanciar Kernel/Módulos/Serviços/Tools/AI
> localmente: é, na prática (não só na intenção), um **cliente remoto**.

- **Entregue:** `packages/platform` (novo pacote de workspace); Runtime
  hospedado em `apps/api` com rotas `/api/runtime/{status,health,snapshot,logs}`
  e `/api/runtime/command` (POST) + WebSocket `/api/runtime/events`; `apps/web`
  reescrito para falar com o Runtime remoto via um novo `RuntimeClient`
  (HTTP + WebSocket), sem mais nenhuma dependência local de Kernel/Módulos/
  Serviços/Tools/AI.

---

## 1. Por que agora

A Sprint 11 fechou com uma sugestão (P12, pendente de aprovação do PO): extrair
a plataforma para um pacote compartilhado e hospedá-la em `apps/api` como
processo do Runtime. Essa sprint executa exatamente isso — era a peça que
faltava para que "a Web é só um cliente" deixasse de ser uma intenção
arquitetônica e virasse um fato verificável em produção.

## 2. O que foi extraído — e o que ficou

Movidos **inteiramente** de `apps/web/src` para `packages/platform/src`,
apenas com imports internos convertidos de alias (`@/...`) para relativos
(o pacote não depende de bundler para resolver os próprios módulos):

- `kernel/` — Kernel, EventBus, CommandDispatcher, ServiceRegistry,
  ConfigurationManager, Logger, ModuleLoader, bootstrap.
- `modules/` — ModuleManager, BaseModule, o manifesto e os 9 módulos
  (`conversation` real; `business`, `legal`, `development`, `design`, `media`,
  `knowledge`, `dashboard`, `settings` — placeholders).
- `ai/` — AIManager, AIProviderRegistry, BaseAIProvider (arquitetura; nenhum
  provedor concreto ainda).
- `tools/` — ToolManager, ToolRegistry, BaseTool, manifesto (arquitetura;
  nenhuma Tool concreta ainda).
- `runtime/` — RuntimeManager, RuntimeLifecycle (o orquestrador do boot).
- `services/` — mas **só a fundação genérica** (`BaseService`, `ServiceManager`,
  contratos). Os *serviços de feature* (`services/business`,
  `services/conversation`, `services/media`, `services/settings` —
  wrappers de `fetch` que já falavam com `apps/api` desde a Sprint 3/4)
  **ficaram em `apps/web`**: são clientes de UI, não parte da plataforma.

`packages/platform` é publicado como `@beehive/platform` (workspace npm) e
consumido tanto por `apps/api` (hospeda o Runtime de verdade) quanto por
`apps/web` (importa só tipos/contratos e as constantes de comando/evento da
Conversa — nunca as classes que executam o sistema).

## 3. Onde o Runtime mora agora

`apps/api/src/beehiveRuntime.ts` cria e inicia um `RuntimeManager` no boot do
processo (top-level `await`, `apps/api` é ESM). `apps/api/src/runtimeRoutes.ts`
expõe:

```
GET  /api/runtime/status     → { status }
GET  /api/runtime/health     → RuntimeHealth (módulos, serviços, tools)
GET  /api/runtime/snapshot   → RuntimeSnapshot completo
GET  /api/runtime/logs       → LogEntry[]
POST /api/runtime/command    → { type, payload } → { result } | { error }
WS   /api/runtime/events     → todo evento do Event Bus, em tempo real
```

O `POST /command` despacha direto no `Kernel` (`runtime.context.kernel.dispatch`)
— a mesma superfície que módulos internos usam. O WebSocket assina
`events.onAny(...)` e retransmite cada evento como JSON. Os endpoints
pré-existentes (`/api/conversation/stream`, `/api/business/*`,
`/api/media/image`, `/api/models`) continuam **intactos e funcionando** — não
foram tocados. Eles não passam pelo Runtime; são o backend real de IA
(Ollama/Pollinations), como já eram desde a Sprint 3/4.

## 4. Onde a Web mudou

Novo `apps/web/src/app/runtimeClient.ts` — a única peça que fala com o Runtime
remoto: consultas por `fetch` (`/api/runtime/*`) e um WebSocket lazy (conecta
na primeira assinatura, reconecta com backoff simples se cair). `app/bootstrap.ts`
deixou de construir `Kernel`/`ModuleManager`/`ServiceManager`/`AIManager`/
`ToolManager` — hoje só cria o `RuntimeClient` e faz um "aquecimento" (um
`status()` de boas-vindas, tolerante a falha). `app/useConversationBridge.ts`
(consumido pelo painel `KernelCheck`, dentro de Configurações) trocou
`getKernel().context.dispatch/events` por `RuntimeClient.dispatch/on` — o
mesmo contrato de Command/Event de sempre, agora de fato atravessando a rede.

As telas reais (Conversa via `coreConversationService`, Business, Mídia,
Configurações) **não mudaram**: já falavam com `apps/api` por `fetch` desde
sprints anteriores, em paralelo ao Kernel de demonstração. Essa dualidade
(documentada abaixo) não foi criada por esta sprint — só ficou mais visível ao
extrair a plataforma.

## 5. Honestidade arquitetônica (P15) — o que este Sprint NÃO resolveu

O reconhecimento de código feito no início desta sprint confirmou algo
importante: a camada Kernel/Módulos/Command/Event (agora em
`packages/platform`) e o fluxo real de dados da UI (Conversa/Business/Mídia/
Configurações, via `services/*.ts` + `fetch`) são **hoje duas implementações
paralelas que não se conversam**. O módulo `conversation` do Kernel emite
respostas simuladas (sem IA); quem fala com o Ollama de verdade é
`coreConversationService.ts`, direto por HTTP. `modules/{business,media,
settings}` são placeholders sem nenhuma ligação com os services homônimos.

Esta sprint **não** unificou essas duas linhas — o escopo era extrair a
plataforma e prová-la hospedada em processo próprio, o que foi feito e
validado (seção 6). Unificar (fazer Conversa/Business/Mídia realmente
passarem pelo Kernel/Tools/Commands do Runtime, como Services e Tools de
verdade) é trabalho novo, não uma extração — fica como sugestão para a
próxima sprint (ver Decisão / Sugestão, no fim).

## 6. Validação

- **Typecheck limpo nos três workspaces:** `packages/platform`, `apps/api` e
  `apps/web` (`tsc --noEmit`) sem erros. Dois problemas pré-existentes foram
  corrigidos durante a extração (não introduzidos por ela): `ToolManager.fault()`
  não era genérico (variância de `TOutput` quebrava o typecheck real, mascarado
  até agora porque `apps/web` nunca rodava `tsc --noEmit` sozinho em CI); e
  `detectEnvironment()` dependia de `import.meta.env` (tipo exclusivo do Vite,
  incompatível com Node) — reescrito para tratar `env` como opcional, sem
  `try/catch`, funcionando nos dois hosts.
- **Build de produção da Web:** `vite build` — 390 módulos, bundle gerado sem
  erros, resolvendo `@beehive/platform` como dependência de workspace.
- **Boot real do Runtime dentro do `apps/api`:** processo sobe, Kernel inicia,
  9 módulos chegam a `Running`, `ConversationService` chega a `Running`,
  `RuntimeManager.status` → `Running`.
- **Endpoints HTTP testados de ponta a ponta:** `/api/health` (agora reporta o
  status do Runtime também), `/api/runtime/status`, `/api/runtime/health`,
  `/api/runtime/snapshot`, e `POST /api/runtime/command` com
  `conversation.sendMessage` — devolveu a resposta simulada esperada.
- **WebSocket testado de ponta a ponta:** cliente Node conectou em
  `/api/runtime/events`, despachou um comando por HTTP e recebeu, em tempo
  real, os eventos `MessageReceived` e `MessageSent` publicados pelo
  `ConversationService` no processo do `apps/api`.
- **Lint:** `eslint apps/web` — limpo, sem avisos.

## Arquivos criados/alterados

- **Novos:** `packages/platform/{package.json,tsconfig.json,src/index.ts}`;
  `packages/platform/src/{kernel,modules,ai,tools,runtime}/**` (movidos de
  `apps/web/src`); `packages/platform/src/services/{BaseService,
  ServiceManager,index,types}.ts` (movidos); `apps/api/src/beehiveRuntime.ts`;
  `apps/api/src/runtimeRoutes.ts`; `apps/web/src/app/runtimeClient.ts`.
- **Removidos de `apps/web/src`:** `kernel/`, `modules/`, `ai/`, `tools/`,
  `runtime/`, e os 4 arquivos genéricos de `services/` (os *feature services*
  — `services/{business,conversation,media,settings}` — permanecem).
- **Alterados:** `apps/web/src/app/{bootstrap.ts,useConversationBridge.ts}`
  (agora falam com `RuntimeClient`, não mais com Kernel local);
  `apps/web/vite.config.ts` (proxy `/api` com `ws: true`);
  `apps/api/src/server.ts` (boot do `beehiveRuntime`, rotas de Runtime,
  `http.Server` explícito para acoplar o WebSocket); `package.json` (raiz,
  `apps/web`, `apps/api`) — nova dependência de workspace
  `@beehive/platform`, script `typecheck` na raiz; `packages/README.md`
  (deixou de estar vazio).

## Decisão / Sugestão (P13)

Duas frentes ficam para a próxima sprint, nesta ordem sugerida:

1. **Unificar Conversa/Business/Mídia/Configurações com o Runtime real**
   (seção 5): transformar as chamadas de IA hoje soltas em `apps/api`
   (`/api/conversation/stream`, `/api/business/*`, `/api/media/image`) em
   Services e Tools de verdade, registrados no Kernel hospedado, e
   descomissionar o `ConversationService` de demonstração (resposta
   simulada) do `modules/conversation` — ou fazê-lo chamar o provedor de IA
   real. Sem isso, a plataforma extraída prova a arquitetura, mas ainda não
   é o caminho que o usuário final percorre.
2. **Persistência real:** o Business ainda grava só em `localStorage` do
   navegador (achado no reconhecimento desta sprint). Com o Runtime agora
   rodando em processo próprio, faz sentido migrar esse estado para o
   `apps/api` (arquivo/SQLite, conforme `02_Technology_Stack.md`), abrindo
   caminho para Projetos sobreviverem a um "F5" e, adiante, para multi-cliente.

Nenhuma das duas foi feita agora (fora do escopo desta sprint) — ficam como
sugestão para aprovação do PO, seguindo o mesmo princípio de honestidade
arquitetônica (P15) que fechou a Sprint 11.
