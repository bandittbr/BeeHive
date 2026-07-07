# Sprint 8 — Primeiro Fluxo Vertical (ConversationModule)

> Sem nova infraestrutura. Esta Sprint **prova** que a fundação (Kernel → Módulos
> → Services) funciona ponta a ponta, com o primeiro módulo real: a Conversa.
> Resposta **simulada** (sem IA), para validar a arquitetura.

- **Entregue:** `ConversationModule` (real), `ConversationService` (a lógica),
  `ConversationCommands`, `ConversationEvents`, e um bridge de UI.
- **Não tocado:** a Conversa com IA (Ollama) do produto segue intacta — este é um
  fluxo vertical de validação, em paralelo.

---

## Fluxo completo (o caminho da mensagem)

```
UI (KernelCheck / useConversationBridge)
   │  send('ola')  →  dispatch Command { type:'conversation.sendMessage' }
   ▼
KERNEL → Command Dispatcher
   │  encontra o handler que o ConversationModule registrou
   ▼
ConversationModule (handler)  →  getService('conversation.service')
   │  delega — não contém lógica
   ▼
ConversationService.handleSendMessage()   ← TODA a lógica aqui
   │  emite eventos no EVENT BUS:
   │    • MessageReceived  (turno do usuário)
   │    • MessageSent      (resposta simulada)
   │  retorna { reply }
   ▼
EVENT BUS → UI (useConversationBridge escuta) atualiza a tela
   Dispatcher emite CommandExecuted
```

- **Commands executados:** `conversation.sendMessage` (→ `CommandExecuted`); um
  comando desconhecido gera `CommandFailed`.
- **Eventos disparados:** `MessageReceived`, `MessageSent` (domínio); mais os de
  infraestrutura já em uso: `SystemStarted`, `ModuleStarted`, `ServiceRegistered`,
  `ServiceInitialized`, `ServiceStarted`, `CommandExecuted`.

---

## Papéis (a separação que a Sprint prova)

- **UI** (`useConversationBridge` + `KernelCheck`): só **envia** um Command e
  **recebe** eventos. Não conhece o Service.
- **Module** (`ConversationModule`): só **registra** Service, Command e um
  observador de evento. Zero regra de negócio.
- **Service** (`ConversationService`): **toda a lógica**. Recebe a mensagem,
  registra o turno do usuário e emite a resposta — tudo por evento.
- **Kernel**: recebe o Command, encaminha pelo Dispatcher, media a descoberta do
  Service e transporta os eventos pelo Event Bus.

---

## Toda a arquitetura foi utilizada?

Sim — validado por teste automatizado (papel da UI), 9 asserções:

| Camada | Prova no teste |
|--------|----------------|
| Kernel | `SystemStarted` emitido; dispatch e Event Bus operando |
| Module System | `ModuleStarted`; módulo real carregado e registrando |
| Service Layer | `ServiceStarted`; ConversationService descoberto e em Running |
| Command Dispatcher | `conversation.sendMessage` → `CommandExecuted`; inexistente → `CommandFailed` |
| Event Bus | `MessageReceived` + `MessageSent` recebidos pela "UI" |
| Resultado | `dispatch` resolveu com a resposta simulada |

---

## Prova visível (sem quebrar o produto)

Em **Configurações** há um painel "Verificação da arquitetura": digite algo e
clique em Enviar — a UI despacha o Command e a resposta simulada aparece, vinda
por eventos do ConversationService. A Conversa com IA do produto não foi alterada.

## Arquivos criados/alterados

- Novos: `modules/conversation/{events,commands,ConversationService}.ts`;
  `app/useConversationBridge.ts`; `features/settings/components/KernelCheck.{tsx,css}`.
- Alterados: `modules/conversation/index.ts` (placeholder → módulo real);
  `features/settings/SettingsView.{tsx,css}` (painel de verificação).

## Decisões

- **Discovery via Kernel:** o handler do Command busca o Service por
  `getService`, não por import direto — prova o registry/descoberta.
- **ServiceContext capturado:** o Service guarda seu contexto no
  `initialize/start` e emite eventos por ele — nunca fala com a UI diretamente.
- **Anti-especulação:** nenhuma IA, nenhuma nova infra; o mínimo para provar o
  fluxo. A migração da Conversa real (Ollama) para este módulo é sprint futura.
