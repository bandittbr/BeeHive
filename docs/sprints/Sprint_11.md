# Sprint 11 — BeeHive Runtime

> A arquitetura de execução do BeeHive. O **Runtime** passa a ser o responsável
> por EXECUTAR todo o Sistema Operacional; a interface (Web/Desktop) torna-se
> apenas um **cliente** que o consulta. Sem Providers, sem Tools reais, sem
> Ollama — apenas o Runtime.

- **Entregue:** `RuntimeManager`, `RuntimeContext`, `RuntimeLifecycle`,
  `RuntimeHealth`, `RuntimeStatus`, `RuntimeSnapshot`, com Startup/Shutdown
  ordenados e preparação Local/Cloud.

---

## 1. Como o Runtime se integra ao Kernel

O Runtime é a **raiz de composição e orquestração** acima do Kernel. No `start()`:

```
Boot         → bootstrapKernel()  (o Kernel sobe primeiro)
Loading      → compõe Tools, AI (Providers), Services, Modules
               registra ai.manager / tool.manager no Kernel
Initializing → RuntimeLifecycle.startUp() na ORDEM:
                 1. Tools    (ToolManager.load)
                 2. Modules  (ModuleManager.loadAll → registram Services/Commands)
                 3. Services (ServiceManager.startAll)
                 [4. Agents  — ponto de extensão futuro]
Running      → sistema no ar; expõe RuntimeContext, health, snapshot, logs
```

O `stop()` faz o **Shutdown na ordem inversa** (Services → Modules → Tools) e
depois `kernel.stop()`. O `RuntimeLifecycle` garante isso: inicia na ordem, para
na ordem inversa, só o que efetivamente subiu.

O Kernel continua sendo o coordenador interno (Event Bus, comandos, serviços); o
Runtime é quem **liga, monitora e desliga** o conjunto. Ele agrega `health()`
(de módulos, serviços e tools), `snapshot()` (retrato completo) e `logs()`.

## 2. Como Web/Desktop conversarão com ele

O Runtime é **agnóstico de ambiente** (TypeScript puro, sem React/DOM) — o mesmo
código roda no backend (Node), num processo desktop ou no navegador. A interface
deixa de "ser o sistema" e passa a ser um **cliente**:

- **Hoje:** o cliente Web inicia o Runtime no mesmo processo (`bootstrapApp` cria
  o `RuntimeManager` e chama `start()`), e o consulta por `getRuntime()` →
  `status`/`health`/`snapshot`/`logs`.
- **Amanhã (caminho, ver Sugestão):** o Runtime roda como **processo próprio**
  (backend/desktop) e expõe `snapshot`/`health`/`logs` + comandos por
  **HTTP/WebSocket**. A Web/Desktop consome essa API. Como o cliente já fala com
  o sistema só por comandos e eventos (Sprint 8), a troca do transporte
  (in-process → rede) não muda a interface.

## 3. Como isso permite centenas de agentes simultâneos

- **Tudo é unidade de ciclo de vida gerenciada e isolada:** módulos, serviços,
  tools — e, no mesmo padrão, os futuros **Agents** (um `AgentManager` entra como
  mais um passo do `RuntimeLifecycle`). Cada agente tem estado próprio, health e
  isolamento; iniciar/parar centenas é registrar centenas de unidades.
- **Comunicação desacoplada pelo Event Bus:** agentes não se conhecem nem se
  chamam diretamente; publicam/assinam eventos. Isso escala horizontalmente sem
  criar uma teia de dependências.
- **Observabilidade nativa:** `snapshot()`/`health()`/`logs()` dão visão de todo o
  enxame (estado, uptime, erros) — pré-requisito para operar em escala.
- **Local → Cloud sem reescrita:** o `RuntimeContext` carrega o ambiente (do
  ConfigurationManager). O mesmo Runtime que roda no seu PC roda num servidor;
  agentes 24h vivem no Runtime em nuvem (Fase 3/4 do Roadmap), com a Web/Desktop
  como clientes remotos.

---

## Validação

- **Teste automatizado** (Node, via esbuild): 12 asserções — `Boot` inicial;
  `start()` → `Running`; snapshot com os **9 módulos Running** e o
  **ConversationService (real) Running**; health agregada OK; uptime e ambiente
  expostos; `ai.manager`/`tool.manager` descobríveis no Kernel; logs disponíveis;
  `stop()` → `Stopped` (shutdown ordenado). **Passou.**
- **Sintaxe/imports:** `runtime/*` e `app/bootstrap.ts` — OK.
- **Nada quebrado:** o boot foi centralizado no Runtime; `bootstrapApp` mantém a
  API e a UI (`getKernel` etc.) segue funcionando — a mudança é internamente a UI
  virar cliente do Runtime.

## Arquivos criados/alterados

- Novos: `runtime/{types,RuntimeLifecycle,RuntimeManager,index}.ts`.
- Alterados: `app/bootstrap.ts` (passa a criar e iniciar o Runtime; expõe
  `getRuntime` e delega os demais getters ao `RuntimeContext`).

## Decisão / Sugestão (P12)

O Runtime foi construído **agnóstico de ambiente** de propósito. Para cumprir
plenamente "a Web será só um cliente", a **próxima etapa** é extrair a plataforma
(`kernel`, `modules`, `services`, `ai`, `tools`, `runtime`) para um **pacote
compartilhado** e hospedá-la em `apps/api` como processo do Runtime, expondo
`snapshot`/`health`/comandos por HTTP/WebSocket. Não foi feito agora (fora do
escopo "criar apenas o Runtime") e é uma refatoração estrutural — fica como
sugestão para aprovação do PO.
