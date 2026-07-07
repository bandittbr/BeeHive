# Sprint 7 — Service Layer

> Sobre o Kernel (S5) e o Sistema de Módulos (S6), esta Sprint entrega a **Service
> Layer**: a camada onde viverá TODA a regra de negócio do BeeHive. Módulos não
> contêm regra — apenas registram Services, Commands e Events. Sem nenhum Service
> de negócio: só a infraestrutura.

- **Escopo (dentro):** contrato `BeeHiveService`, `BaseService`, `ServiceContext`,
  `ServiceManager` (ciclo de vida, estados, eventos, snapshots), descoberta pelo
  Kernel e integração no boot.
- **Escopo (fora):** qualquer Service concreto (Conversation, Business, ...),
  IA, persistência, APIs.

---

## 1. Arquitetura

Um **Service** (`BeeHiveService`) é a unidade de regra de negócio. Contrato:
`id`, `name`, `version`, `initialize`, `start`, `stop`, `dispose`, `health`,
`status`. Ele recebe um **`ServiceContext`** (mais restrito que o contexto de um
módulo): `events`, `config`, `logger`, `getService`, `dispatch`. Um Service NÃO
registra outros Services/Commands — fornece capacidade e conversa pelo Event Bus.

O **`ServiceManager`** descobre e gerencia o ciclo de vida dos Services. O
**`BaseService`** dá os no-ops padrão. A **descoberta** reutiliza o
`ServiceRegistry` do Kernel: o ServiceManager assina o evento `ServiceRegistered`
e, quando um objeto com o formato de Service aparece no registry, o inscreve.

### Estados
`Registered → Initializing → Running → Stopped → Disposed`, com `Failed` em caso
de erro. (`Paused` está no enum, reservado para uso futuro — o contrato atual não
tem `pause`/`resume`.)

---

## 2. Como um Module registra um Service

No hook `registerServices` do módulo (que recebe o `KernelContext`):

```ts
class BusinessModule extends BaseModule {
  registerServices(ctx: KernelContext) {
    ctx.registerService(businessService.id, businessService); // um BeeHiveService
  }
}
```

O módulo só registra — não inicia nem contém a lógica. A lógica vive no Service.

## 3. Como um Service é descoberto pelo Kernel

`ctx.registerService(id, service)` grava no `ServiceRegistry` do Kernel e emite
`ServiceRegistered`. O `ServiceManager` (que assina esse evento) busca o objeto no
registry, confirma pelo *type guard* que ele cumpre o contrato de Service e o
inscreve (estado `Registered`). Depois, `startAll()` o inicializa e inicia. Ou
seja: **descoberta reativa por evento**, sem o ServiceManager conhecer nenhum
Service concreto.

## 4. Fluxo completo

```
Module.registerServices(ctx)
        │  ctx.registerService(id, service)
        ▼
KERNEL (ServiceRegistry)  ──emite──►  EVENT BUS: ServiceRegistered
        │                                   │
        │                                   ▼
        │                            ServiceManager.enroll(id)   (descoberta)
        │                                   │
        │                         startAll(): initialize → start
        │                                   │
        └───────── EVENT BUS: ServiceInitialized / ServiceStarted
                                            │
                                            ▼
                                     RESULTADO (Service em Running,
                                     capacidade disponível via getService,
                                     estado observável em snapshots)
```

Boot (em `app/bootstrap.ts`): cria Kernel → cria **ServiceManager (já escutando)**
→ cria ModuleManager → `loadAll` (módulos registram Services) →
`serviceManager.startAll()` (o Kernel inicializa os Services).

---

## 5. Componentes preparados para as próximas Sprints

- **Services de negócio** (ConversationService, BusinessService, MediaService, ...)
  passam a ser criados estendendo `BaseService` e registrados pelos respectivos
  módulos — toda a regra migra das telas/hooks para os Services.
- **ServiceManager.snapshots()** já entrega estado/uptime/saúde/erro por Service —
  pronto para Dashboard/Central.
- **ServiceContext.dispatch/getService** prontos para Services colaborarem via
  comandos e descoberta, sempre pelo Kernel.

---

## Validação

- **Teste automatizado** (Node, via esbuild): 14 asserções — um módulo registra
  Services; o ServiceManager os descobre pelo evento; `startAll` inicializa/inicia;
  um Service descobre outro via `ServiceContext.getService`; um Service que falha
  em `start` vai a `Failed` (+ `ServiceFailed`); objeto sem lifecycle **não** é
  inscrito (type guard); snapshots (health/uptime/lastError); `stop`/`dispose`.
  **Passou.**
- **Sintaxe/imports:** `services/*`, `kernel/types.ts` (aditivo), `app/bootstrap.ts`
  — OK (esbuild).
- **Nada quebrado:** a Service Layer é autocontida; o boot ganhou o `startAll`,
  aditivo e assíncrono.

## Arquivos criados/alterados

- Novos: `services/types.ts`, `services/BaseService.ts`, `services/ServiceManager.ts`,
  `services/index.ts`.
- Alterados: `kernel/types.ts` (eventos de service — aditivo), `app/bootstrap.ts`
  (wire do ServiceManager).

## Decisões

- **Descoberta por evento + type guard** mantém o Kernel/ServiceManager sem
  conhecer Services concretos e reutiliza o `ServiceRegistry` existente (integração
  pedida), sem duplicar armazenamento.
- **ServiceContext ≠ KernelContext:** um Service tem uma superfície mais restrita
  (não registra outros) — responsabilidade única e menor acoplamento.
- **Anti-especulação:** nenhum Service concreto; `Paused` reservado no enum, sem
  métodos `pause`/`resume` (fora do contrato pedido).
