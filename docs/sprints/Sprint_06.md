# Sprint 6 — Sistema de Módulos

> Sobre o Kernel (Sprint 5), esta Sprint entrega a **infraestrutura modular**: o
> BeeHive passa a ser composto por módulos independentes, com ciclo de vida,
> estado, dependências e eventos — tudo coordenado pelo Kernel. Sem negócio, sem
> IA, sem persistência.

- **Escopo (dentro):** contrato de módulo, ModuleManager (ciclo de vida completo),
  estados, dependências, eventos, logging, snapshots para observabilidade,
  placeholders das áreas, descoberta por manifesto, boot automático.
- **Escopo (fora):** qualquer implementação real de módulo/negócio/IA/persistência.

---

## 1. Como funciona o Sistema de Módulos

Um **módulo** (`BeeHiveModule`) é uma unidade independente do sistema. Ele declara
metadados (`id`, `name`, `version`, `description`), `dependencies`, hooks de
registro (`registerServices/Commands/Events`), o ciclo de vida
(`initialize/start/stop/pause/resume/dispose`) e introspecção (`health`,
`status`). Um módulo **nunca importa outro módulo**: recebe o `KernelContext` e
fala com o resto do sistema só pelo Kernel (eventos, comandos, serviços).

O **ModuleManager** orquestra tudo: resolve a ordem por dependências, executa o
pipeline, mantém o estado de cada módulo, emite eventos a cada transição, registra
logs e expõe **snapshots** para observabilidade.

O **BaseModule** dá implementações padrão (no-op) de todo o contrato, para que um
módulo concreto declare só o que precisa. Por isso os 9 placeholders são mínimos.

### Diagrama textual

```
             App Bootstrap (raiz de composição)
                        │
                        ▼
                     KERNEL  ──(context)──►  ModuleManager
                        ▲                         │
                        │                         ▼
              (eventos/comandos/serviços)   Manifesto (descoberta)
                        │                         │
                        │              ordenar por dependências
                        │                         │
                        │         validar → registrar → initialize → start
                        │                         │
                        └───────── MÓDULOS (Conversa, Business, …)
                                   cada um só fala com o Kernel
```

---

## 2. Como criar um novo módulo no futuro

1. Criar a pasta `modules/<novo>/index.ts` com uma classe que estende
   `BaseModule`, declarando `id/name/version/description` e `dependencies`.
2. Sobrescrever apenas os hooks necessários (ex.: `registerCommands`, `start`).
3. Adicionar **uma linha** no `modules/manifest.ts`.

Nada mais muda — nem o Kernel, nem o ModuleManager, nem outros módulos
(extensibilidade e baixo acoplamento).

---

## 3. Como o Kernel "descobre" um módulo

Em um pacote de navegador não há varredura de arquivos em runtime. A descoberta é
o **manifesto estático** (`modules/manifest.ts`): a lista de módulos do sistema.
No boot, o `bootstrapApp` cria o `ModuleManager` sobre o contexto do Kernel e
chama `loadAll(MODULE_MANIFEST)` — descobrir, ordenar, validar, registrar,
inicializar e iniciar, automaticamente.

---

## 4. Como o ciclo de vida funciona

```
Loading → Validate → Register → Initialize → Running
                                                │
                                    Pause ↔ Resume
                                                │
                                             Stop → Dispose
```

- **Loading:** o módulo entra na fila.
- **Validate:** dependências existem e estão `Running`? Se não → `Failed`
  (o módulo não inicia). Ciclos de dependência também → `Failed`.
- **Register:** chama `registerServices/Commands/Events` → evento `ModuleRegistered`.
- **Initialize:** `initialize()` → evento `ModuleInitialized`.
- **Start:** `start()` → estado `Running` + evento `ModuleStarted`.
- **Pause/Resume/Stop/Dispose:** controlados sob demanda, cada um com seu evento.
- Qualquer erro em qualquer etapa → `Failed` + `ModuleFailed` + log, sem derrubar
  os demais.

Cada transição emite evento no Event Bus e é registrada no Logger.

---

## 5. Componentes preparados para a próxima Sprint

- **Placeholders → módulos reais:** cada área (Conversa, Business, …) já tem seu
  módulo; a próxima etapa é mover a lógica atual das telas para dentro deles,
  registrando serviços e comandos via `KernelContext`.
- **ModuleManager.snapshots():** já entrega `nome, versão, estado, uptime,
  dependências, última atualização, último erro, saúde` — pronto para um
  **Dashboard/Central** renderizar (sem UI ainda).
- **Command Dispatcher (Kernel):** pronto para os comandos concretos que os
  módulos registrarão (ex.: `OpenConversationCommand`).
- **Event Bus:** os eventos de módulo já fluem; os de domínio virão dos módulos.

---

## Validação

- **Teste automatizado** (Node, via esbuild): 17 asserções — carregamento
  automático, ordenação por dependências (fora de ordem), dependência **ausente**
  e **em cascata** (→ Failed), ciclos, todos os eventos (Registered, Initialized,
  Started, Paused, Resumed, Stopped, Failed, Disposed), snapshots (health/uptime/
  lastError) e o **manifesto real** (9 módulos rodando, cadeia
  conversation→business→dashboard). **Passou.**
- **Sintaxe/imports:** todos os arquivos de `modules/`, `app/bootstrap.ts`,
  `main.tsx` e a edição do Kernel — OK (esbuild).
- **Nada quebrado:** o sistema de módulos é autocontido; a única mudança na UI é o
  boot (`bootstrapApp` no `main.tsx`), assíncrono e não bloqueante.

## Arquivos criados/alterados

- Novos: `modules/types.ts`, `modules/BaseModule.ts`, `modules/ModuleManager.ts`,
  `modules/manifest.ts`, `modules/index.ts`, e 9 placeholders
  `modules/<área>/index.ts`; `app/bootstrap.ts`.
- Alterados: `kernel/types.ts` (eventos de módulo — aditivo), `main.tsx` (boot).

## Decisões de arquitetura

- **Inversão de dependência:** `modules/` depende de `kernel/`, nunca o contrário.
  A raiz de composição (`app/bootstrap.ts`) é o único ponto que conhece ambos.
- **Anti-especulação:** só a infraestrutura mandada. Os placeholders são no-op
  (via `BaseModule`), sem regra de negócio.

## Sugestão (não aplicada — P12)

O Kernel ainda mantém o `ModuleLoader` simples da Sprint 5, agora **superado** pelo
`ModuleManager`. Sugere-se removê-lo numa futura limpeza, junto de `IModule`/
`IModuleLoader`, para deixar um único conceito de módulo. Mantido por ora para não
remover algo sem autorização.
