# Sprint 5 — O Kernel do BeeHive

> Início oficial da construção do **Kernel**: a infraestrutura central sobre a
> qual todos os módulos do Sistema Operacional serão construídos. Sem negócio,
> sem IA, sem persistência — apenas a fundação. Realiza o conceito de **Core /
> Orquestração** de `01_Architecture.md`.

- **Objetivo:** entregar a infraestrutura de coordenação do sistema, com
  qualidade arquitetural (SOLID, Clean Architecture, baixo acoplamento, DI).

- **Escopo (dentro):** 7 componentes de infraestrutura.
- **Escopo (fora):** IA/Ollama, Business, Jurídico, Agentes, banco, APIs externas,
  automações, persistência, qualquer módulo concreto.

---

## Arquitetura criada

Localização: `apps/web/src/kernel/`. TypeScript puro (sem React), o que permite
extraí-lo para um pacote compartilhado no futuro sem reescrever.

Princípio-chave: **contratos primeiro**. Tudo depende de `types.ts` (interfaces);
as implementações são injetadas pelo `bootstrap`. Trocar qualquer peça é mudar
apenas o bootstrap (Inversão de Dependência).

### Diagrama textual

```
                         UI (React / Áreas)
                               │
                               ▼
                        ┌───────────────┐
                        │    KERNEL      │   pequeno; só coordena
                        │  (KernelContext)│
                        └──────┬─────────┘
        ┌──────────────┬───────┼────────────┬───────────────┐
        ▼              ▼       ▼            ▼               ▼
   EVENT BUS   COMMAND DISPATCHER   SERVICE REGISTRY   MODULE LOADER
   (pub/sub)    (Command → handler)   (id → serviço)    (carrega módulos)
        │              │                    │               │
        └──────────────┴─── observados por ─┴───────────────┘
                               │
                     CONFIG MANAGER + LOGGER
                   (leitura de config / auditoria)
                               │
                               ▼
                   MÓDULOS (Conversa, Business, …)  ← próximas sprints
                               │
                               ▼
                   SERVIÇOS (registrados pelos módulos)
```

Regra de ouro: **nenhum módulo importa outro módulo.** Todos recebem o
`KernelContext` e conversam pelo Kernel (eventos, comandos, serviços).

---

## Por que cada componente existe

1. **Kernel** (`Kernel.ts`) — o coordenador. Deliberadamente pequeno: conecta as
   peças e expõe o `KernelContext`. Não tem regra de negócio. Existe para ser o
   ponto único de mediação ("tudo passa pelo Kernel").
2. **Event Bus** (`EventBus.ts`) — desacopla quem age de quem reage. Componentes
   se comunicam por eventos, sem se conhecer. `onAny` habilita auditoria.
3. **Service Registry** (`ServiceRegistry.ts`) — permite registrar/descobrir
   serviços por id, evitando dependências diretas. Novos serviços entram sem
   tocar no Kernel.
4. **Module Loader** (`ModuleLoader.ts`) — carrega módulos (chamando `register`)
   e os anuncia. Não conhece nenhum módulo concreto; novos módulos são só passados
   para `load`.
5. **Command Dispatcher** (`CommandDispatcher.ts`) — toda ação é um `Command`
   (dado), encaminhado ao handler. Emite `CommandExecuted`/`CommandFailed`.
   Separa "pedir uma ação" de "executá-la".
6. **Configuration Manager** (`ConfigurationManager.ts`) — leitura central de
   config, com noção de ambiente (local/cloud/dev/prod/test). Ninguém lê
   ambiente direto.
7. **Logger** (`Logger.ts`) — logs centralizados (console + histórico em memória),
   futura fonte de Central, Dashboard e Auditoria. Loggers por escopo.

Peça de fiação: **`KernelContext`** (em `types.ts`) — a superfície que módulos e
serviços recebem; é o que impede acoplamento direto entre eles.

---

## Como isso permite evoluir por muitos anos

- **Substituibilidade:** tudo depende de interfaces. Trocar o EventBus em memória
  por um distribuído, ou o Logger por um que envia à nuvem, é mudar só o
  `bootstrap` — nada mais.
- **Crescimento sem cirurgia:** adicionar módulos, serviços e comandos é *encaixe*
  (passar para `load` / `registerService` / `registerCommand`), nunca alteração
  do Kernel. O núcleo permanece pequeno e estável.
- **Observabilidade nativa:** cada evento e comando deixa rastro (auditoria via
  `onAny` + Logger), pré-requisito para autonomia com controle.
- **Testabilidade:** componentes puros e injetados; o Kernel foi validado por um
  teste que exercita todo o fluxo (15/15 asserções).
- **Local → Nuvem:** o Configuration Manager já carrega a noção de ambiente,
  preparando as fases do Roadmap.

---

## Componentes prontos para receber implementação nas próximas sprints

- **Module Loader** → registrar os módulos reais (Conversa, Business, …), cada um
  se registrando via `KernelContext`, sem se importarem entre si.
- **Command Dispatcher** → comandos concretos (ex.: `CreateProjectCommand`,
  `OpenConversationCommand`), migrando ações que hoje as telas fazem direto.
- **Service Registry** → registrar os serviços atuais (conversa, business, mídia)
  como serviços do Kernel, descobríveis por id.
- **Event Bus** → passar a emitir os eventos de domínio já catalogados
  (`ProjectCreated`, `MessageSent`, …) a partir dos módulos.
- **Logger** → alimentar a futura **Central**/**Dashboard**/**Auditoria** com
  `getEntries()`.
- **Configuration Manager** → centralizar as configs hoje espalhadas (ex.: base
  da API, modelo, endpoints).

---

## Validação

- **Teste unitário** (Node, via esbuild): 15/15 asserções — eventos de ciclo de
  vida, registro/descoberta de serviço, comando executado e falho (com eventos),
  carregamento de módulo com contexto, config e logs. **Passou.**
- **Sintaxe/imports:** `bootstrap.ts`, `index.ts`, `main.tsx` e todos os arquivos
  do kernel — OK (esbuild).
- **Nada quebrado:** o Kernel é autocontido; a integração no `main.tsx`
  (`bootstrapKernel()`) é aditiva e não altera a UI nem o comportamento existente.

## Arquivos criados

`apps/web/src/kernel/`: `types.ts`, `EventBus.ts`, `ServiceRegistry.ts`,
`CommandDispatcher.ts`, `ConfigurationManager.ts`, `Logger.ts`, `ModuleLoader.ts`,
`Kernel.ts`, `bootstrap.ts`, `index.ts`. Alterado: `main.tsx` (boot do Kernel).

## Decisão de escopo (anti-especulação)

Só entrou o que é fundação indispensável e imediatamente exercitável. Não foram
criados módulos, comandos de negócio, persistência de logs, nem abstrações "por
via das dúvidas". A migração dos serviços/áreas atuais para cima do Kernel é
trabalho das próximas sprints.
