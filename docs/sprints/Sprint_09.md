# Sprint 9 — AI Layer

> A camada por onde **toda** a Inteligência Artificial do BeeHive passa. Nenhum
> módulo ou Service conhece um modelo/provedor concreto — tudo pelo `AIManager`,
> por abstração. Esta Sprint entrega apenas a **arquitetura**: nenhum provider,
> nenhuma integração (Ollama/OpenAI/Claude/Gemini).

- **Entregue:** `AIManager`, `AIRequest`, `AIResponse`, `AIContext`,
  `BaseAIProvider`, `AIProviderInterface` (`AIProvider`), `AIProviderRegistry`,
  contratos de capacidades e streaming.
- **Não implementado:** nenhum provedor de IA.

---

## 1. Arquitetura

```
Service (ex.: ConversationService)
   │  getService('ai.manager')  →  aiManager.execute(request)
   ▼
AIManager  ── resolve por capacidade ──►  AIProviderRegistry
   │  (nunca conhece um provider concreto)        │
   │                                    findByCapability('chat')
   ▼                                              │
AIProvider (contrato)  ◄───────────────────────────┘
   │  provider.execute(request, context)
   ▼
AIResponse  →  volta ao Service
```

- **`AIRequest<TInput>`**: `{ capability, input, options }`. A `capability`
  (chat, embeddings, vision, imageGeneration, videoGeneration, speech, ocr,
  reasoning, tools, streaming) é o CATÁLOGO — nenhuma implementada; são contratos.
- **`AIContext`**: contexto de execução criado pelo AIManager (`requestId`,
  `capability`, `source`, `signal` p/ cancelar, `startedAt`, `metadata`).
- **`AIResponse<TOutput>`**: `{ capability, output, provider, model?, usage?,
  finishedAt }`.
- **`AIProvider`** (interface): `id`, `name`, `capabilities`, `supports()`,
  `execute()`, `stream?()`, `health()`.
- **`BaseAIProvider`**: base que implementa `supports`/`health`, deixando
  `execute`/`stream` para o provedor concreto.
- **`AIProviderRegistry`**: guarda provedores e os **resolve por capacidade**
  (`findByCapability`, com preferência opcional por id).
- **`AIManager`**: a porta única. Recebe a solicitação, resolve um provedor pelo
  registro (abstração) e delega. Depende só do `AIProviderRegistry` e do contrato
  `AIProvider` — **nunca** de um provedor concreto. Dependências injetadas (DI:
  registry + logger opcional).

### Princípios
SRP (cada peça uma responsabilidade), DIP (todos dependem de contratos), baixo
acoplamento (o Manager não conhece providers), substituibilidade (trocar/rotear
providers sem tocar em quem chama).

---

## 2. Como um Provider será conectado no futuro

1. Criar uma classe que estende `BaseAIProvider`, declarando `capabilities` e
   implementando `execute` (e `stream`, se suportar streaming). Ex.: um
   `OllamaHttpProvider` que chama o backend `/api` (a integração real fica no
   provider — o resto do sistema não muda).
2. Registrá-lo no boot: `getAIProviderRegistry().register(new OllamaHttpProvider())`.

Pronto. O `AIManager` passa a resolvê-lo automaticamente por capacidade. Nenhuma
mudança no Manager, nos Services ou nos módulos.

---

## 3. Como a Conversation usará esta camada

O `ConversationService` (hoje com resposta simulada) passará a, no
`handleSendMessage`, obter a AI Layer pelo Kernel e pedir uma resposta — sem
conhecer o provedor:

```ts
const ai = context.getService<AIManager>('ai.manager');
const res = await ai.execute(
  { capability: 'chat', input: { messages }, options: { stream: false } },
  { source: 'conversation.service' },
);
// emite MessageSent com res.output ...
```

Ou, com streaming: `ai.stream({ capability: 'chat', input: { messages } }, { onDelta })`.
A UI continua só enviando Command e recebendo eventos; o Service usa a AI Layer;
o provider (registrado à parte) fala com o modelo. Cada camada ignora a de baixo.

---

## Validação

- **Teste automatizado** (Node, via esbuild): 9 asserções — roteamento por
  capacidade (chat/embeddings), preferência de provedor por abstração, `AIContext`
  (source + requestId) entregue ao provider, capacidade sem provedor → erro claro,
  streaming (deltas repassados), provider sem `stream` → erro, `capabilities()`
  unindo as capacidades. **Passou.** (Providers do teste são fakes descartáveis.)
- **Sintaxe/imports:** `ai/*` e `app/bootstrap.ts` — OK.
- **Nada quebrado:** AI Layer autocontida; o boot ganhou a criação do
  registry/manager e o registro de `ai.manager` (descobrível), aditivo.

## Arquivos criados/alterados

- Novos: `ai/types.ts`, `ai/BaseAIProvider.ts`, `ai/AIProviderRegistry.ts`,
  `ai/AIManager.ts`, `ai/index.ts`.
- Alterados: `app/bootstrap.ts` (cria AI Layer, registra `ai.manager`, expõe
  `getAIManager`/`getAIProviderRegistry`).

## Decisões

- **AIManager descobrível como serviço do Kernel** (`ai.manager`): os Services o
  acessam por `getService`, sem importar o bootstrap (baixo acoplamento).
- **Capacidades como catálogo tipado + request/response genéricos:** cobre todas
  as modalidades futuras como contrato, sem especular payloads que só serão
  definidos quando cada capacidade for implementada.
