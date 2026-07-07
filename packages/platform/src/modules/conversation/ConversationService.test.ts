import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AIManager, ProviderManager } from '../../ai';
import { AI_MANAGER_ID } from '../../ai/AIManager';
import { createOllamaProvider } from '../../ai/providers/ollama';
import { ConfigurationManager, createKernel, EventBus, Logger } from '../../kernel';
import type { ServiceContext } from '../../services';
import { CONVERSATION_COMMANDS } from './commands';
import { ConversationService, conversationService } from './ConversationService';
import { conversationModule } from './index';
import {
  CONVERSATION_EVENTS,
  type ConversationHistoryClearedPayload,
  type ConversationHistoryUpdatedPayload,
  type MessagePayload,
  type MessageStreamChunkPayload,
  type MessageStreamCompletedPayload,
  type MessageStreamFailedPayload,
  type MessageStreamStartedPayload,
} from './events';

/**
 * Testes da Task 14.1 — ConversationService migrado para a AI Layer real:
 * ConversationService → AIManager → ProviderManager → OllamaProvider → Ollama.
 *
 * Nenhum teste faz rede de verdade: o `fetch` do OllamaProvider é injetado
 * (mesmo padrão da Sprint 13). Um `ServiceContext` mínimo é montado com o
 * EventBus/Logger/ConfigurationManager REAIS do Kernel (baratos de instanciar,
 * sem mocks desnecessários) e um `getService()` fake que só conhece o
 * AIManager — o suficiente para provar que o Service descobre a AI Layer
 * exclusivamente pelo `ServiceContext`, como qualquer outro Service.
 */

const BASE_URL = 'http://localhost:11434';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Fábrica de um `fetch` fake para o endpoint /api/chat. */
function chatFetch(handler: (init?: RequestInit) => Response): typeof fetch {
  return (async (_input: string | URL, init?: RequestInit) => handler(init)) as typeof fetch;
}

/** Um `fetch` fake que falha como conexão recusada (Ollama offline). */
function offlineFetch(): typeof fetch {
  return (async () => {
    throw new TypeError('fetch failed: ECONNREFUSED');
  }) as typeof fetch;
}

/**
 * Um `fetch` fake que devolve um corpo NDJSON em streaming de verdade — o
 * caminho de `/api/chat` com `stream: true` (Sprint 17). Cada item de `lines`
 * vira uma linha própria; se `signal` for abortado antes do fim, o stream
 * termina em erro (`AbortError`), como o `fetch` real.
 */
function chatStreamFetch(lines: readonly unknown[], opts: { delayMs?: number } = {}): typeof fetch {
  return (async (_input: string | URL, init?: RequestInit) => {
    const signal = init?.signal as AbortSignal | undefined;
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const line of lines) {
          if (signal?.aborted) {
            controller.error(new DOMException('A operação foi abortada.', 'AbortError'));
            return;
          }
          if (opts.delayMs) await new Promise((resolve) => setTimeout(resolve, opts.delayMs));
          controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
        }
        controller.close();
      },
    });
    return new Response(body, { status: 200 });
  }) as typeof fetch;
}

/**
 * Um `fetch` fake que nunca resolve sozinho — só rejeita quando o `signal`
 * passado é abortado (cancelamento externo OU timeout interno), exatamente
 * como o `fetch` real se comporta com um `AbortController`.
 */
function hangingFetch(): typeof fetch {
  return ((_input: string | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      const abort = () => reject(new DOMException('A operação foi abortada.', 'AbortError'));
      if (!signal) return;
      if (signal.aborted) {
        abort();
        return;
      }
      signal.addEventListener('abort', abort);
    })) as typeof fetch;
}

/**
 * Um `fetch` fake para `/api/chat` em streaming que NUNCA emite nada
 * sozinho — só termina (em erro) quando o `signal` é abortado. Usado para
 * testar timeout/cancelamento em pleno streaming, como `hangingFetch()` já
 * faz para o caminho não-streaming.
 */
function hangingChatStreamFetch(): typeof fetch {
  return (async (_input: string | URL, init?: RequestInit) => {
    const signal = init?.signal;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const abort = () =>
          controller.error(new DOMException('A operação foi abortada.', 'AbortError'));
        if (!signal) return;
        if (signal.aborted) {
          abort();
          return;
        }
        signal.addEventListener('abort', abort);
      },
    });
    return new Response(body, { status: 200 });
  }) as typeof fetch;
}

/** Monta um ServiceContext mínimo com o AIManager dado (ou nenhum). */
function makeContext(aiManager?: AIManager): { context: ServiceContext; events: EventBus } {
  const events = new EventBus();
  const logger = new Logger('test');
  const config = new ConfigurationManager('test');
  const services = new Map<string, unknown>();
  if (aiManager) services.set(AI_MANAGER_ID, aiManager);

  const context: ServiceContext = {
    events,
    config,
    logger,
    getService: <T,>(id: string) => services.get(id) as T | undefined,
    dispatch: async () => {
      throw new Error('dispatch() não é usado nestes testes');
    },
  };
  return { context, events };
}

/** Provider Manager com o OllamaProvider registrado e o `fetch` dado. */
function makeAIManager(fetchImpl: typeof fetch, model = 'llama3.2'): AIManager {
  const providerManager = new ProviderManager();
  providerManager.register(createOllamaProvider({ baseUrl: BASE_URL, fetchImpl }));
  providerManager.setDefaultModel(model);
  return new AIManager({ registry: providerManager });
}

function collectMessages(events: EventBus): MessagePayload[] {
  const received: MessagePayload[] = [];
  events.on<MessagePayload>(CONVERSATION_EVENTS.received, (event) => received.push(event.payload));
  events.on<MessagePayload>(CONVERSATION_EVENTS.sent, (event) => received.push(event.payload));
  return received;
}

test('Resposta normal — usa AIManager → ProviderManager → OllamaProvider → Ollama e emite os eventos', async () => {
  const fetchImpl = chatFetch(() =>
    jsonResponse({ message: { role: 'assistant', content: 'Oi! Como posso ajudar?' } }),
  );
  const aiManager = makeAIManager(fetchImpl);
  const { context, events } = makeContext(aiManager);
  const messages = collectMessages(events);

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  const result = await service.handleSendMessage('oi');

  assert.equal(result.reply, 'Oi! Como posso ajudar?');
  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, 'user');
  assert.equal(messages[0].text, 'oi');
  assert.equal(messages[1].role, 'assistant');
  assert.equal(messages[1].text, 'Oi! Como posso ajudar?');
});

test('Modelo inexistente — o erro do Ollama propaga, sem mensagem artificial', async () => {
  const fetchImpl = chatFetch(() => jsonResponse({ error: "model 'fantasma' not found" }, 404));
  const aiManager = makeAIManager(fetchImpl, 'fantasma');
  const { context, events } = makeContext(aiManager);
  const messages = collectMessages(events);

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  await assert.rejects(() => service.handleSendMessage('oi'), /404|not found/i);

  // MessageReceived (turno do usuário) aconteceu; MessageSent NÃO, pois a IA falhou.
  assert.equal(messages.length, 1);
  assert.equal(messages[0].role, 'user');
});

test('Ollama offline — o erro propaga normalmente, sem mensagem artificial', async () => {
  const aiManager = makeAIManager(offlineFetch());
  const { context, events } = makeContext(aiManager);
  const messages = collectMessages(events);

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  await assert.rejects(
    () => service.handleSendMessage('oi'),
    /Não foi possível conectar ao Ollama/,
  );
  assert.equal(messages.length, 1);
  assert.equal(messages[0].role, 'user');
});

test('Cancelamento — abortar o signal do chamador rejeita a solicitação', async () => {
  const aiManager = makeAIManager(hangingFetch());
  const { context } = makeContext(aiManager);

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  const controller = new AbortController();
  const pending = service.handleSendMessage('oi', { signal: controller.signal });
  queueMicrotask(() => controller.abort());

  await assert.rejects(pending, /AbortError|abortad/i);
});

test('Timeout — expira antes da IA responder e rejeita com mensagem clara', async () => {
  const aiManager = makeAIManager(hangingFetch());
  const { context } = makeContext(aiManager);

  const service = new ConversationService({ timeoutMs: 20 });
  service.initialize(context);
  service.start(context);

  await assert.rejects(() => service.handleSendMessage('oi'), /tempo esgotado/);
});

test('AIManager indisponível — erro claro em vez de resposta simulada', async () => {
  const { context } = makeContext(); // sem AIManager registrado

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  await assert.rejects(() => service.handleSendMessage('oi'), /AIManager indisponível/);
});

test('Mensagem vazia — continua tratada localmente, sem chamar a IA', async () => {
  const aiManager = makeAIManager(offlineFetch()); // se chamasse a IA, isto falharia
  const { context } = makeContext(aiManager);

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  const result = await service.handleSendMessage('   ');

  assert.equal(result.reply, 'Mensagem vazia recebida com sucesso.');
});

/**
 * Testes de streaming (Sprint 17): `handleSendMessageStream()` publica
 * `MessageStreamStarted` → N× `MessageStreamChunk` → `MessageStreamCompleted`
 * (ou `MessageStreamFailed`), todos correlacionados pelo mesmo `id` — e a
 * Promise só resolve quando o streaming termina.
 */

function collectStreamEvents(events: EventBus) {
  const started: MessageStreamStartedPayload[] = [];
  const chunks: MessageStreamChunkPayload[] = [];
  const completed: MessageStreamCompletedPayload[] = [];
  const failed: MessageStreamFailedPayload[] = [];
  events.on<MessageStreamStartedPayload>(CONVERSATION_EVENTS.streamStarted, (e) => started.push(e.payload));
  events.on<MessageStreamChunkPayload>(CONVERSATION_EVENTS.streamChunk, (e) => chunks.push(e.payload));
  events.on<MessageStreamCompletedPayload>(CONVERSATION_EVENTS.streamCompleted, (e) =>
    completed.push(e.payload),
  );
  events.on<MessageStreamFailedPayload>(CONVERSATION_EVENTS.streamFailed, (e) => failed.push(e.payload));
  return { started, chunks, completed, failed };
}

test('Streaming simples — publica Started, um Chunk e Completed, todos com o mesmo id', async () => {
  const fetchImpl = chatStreamFetch([{ message: { role: 'assistant', content: 'Oi!' }, done: true }]);
  const aiManager = makeAIManager(fetchImpl);
  const { context, events } = makeContext(aiManager);
  const stream = collectStreamEvents(events);

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  const result = await service.handleSendMessageStream('oi');

  assert.equal(result.reply, 'Oi!');
  assert.equal(stream.started.length, 1);
  assert.equal(stream.chunks.length, 1);
  assert.equal(stream.chunks[0].delta, 'Oi!');
  assert.equal(stream.completed.length, 1);
  assert.equal(stream.completed[0].text, 'Oi!');
  assert.equal(stream.failed.length, 0);

  const id = result.id;
  assert.equal(stream.started[0].id, id);
  assert.equal(stream.chunks[0].id, id);
  assert.equal(stream.completed[0].id, id);
});

test('Streaming com múltiplos chunks — cada linha NDJSON vira um MessageStreamChunk, na ordem', async () => {
  const fetchImpl = chatStreamFetch([
    { message: { role: 'assistant', content: 'Olá' }, done: false },
    { message: { role: 'assistant', content: ', como posso' }, done: false },
    { message: { role: 'assistant', content: ' ajudar?' }, done: true },
  ]);
  const aiManager = makeAIManager(fetchImpl);
  const { context, events } = makeContext(aiManager);
  const stream = collectStreamEvents(events);

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  const result = await service.handleSendMessageStream('oi');

  assert.deepEqual(
    stream.chunks.map((c) => c.delta),
    ['Olá', ', como posso', ' ajudar?'],
  );
  assert.equal(result.reply, 'Olá, como posso ajudar?');
  assert.equal(stream.completed[0].text, 'Olá, como posso ajudar?');
});

test('Cancelamento por id — cancelStream(id) interrompe o streaming em andamento e emite MessageStreamFailed', async () => {
  const aiManager = makeAIManager(hangingChatStreamFetch());
  const { context, events } = makeContext(aiManager);
  const stream = collectStreamEvents(events);

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  const pending = service.handleSendMessageStream('oi', { id: 'req-1' });
  // Dá tempo do streamAI() registrar o AbortController em `inFlight` antes de cancelar.
  await new Promise((resolve) => setTimeout(resolve, 5));
  service.cancelStream('req-1');

  await assert.rejects(pending, /AbortError|abortad/i);
  assert.equal(stream.started.length, 1);
  assert.equal(stream.completed.length, 0);
  assert.equal(stream.failed.length, 1);
  assert.equal(stream.failed[0].id, 'req-1');
});

test('Cancelamento por id desconhecido — não lança, não afeta streams em andamento (idempotente)', async () => {
  const aiManager = makeAIManager(hangingChatStreamFetch());
  const { context } = makeContext(aiManager);

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  assert.doesNotThrow(() => service.cancelStream('id-que-nao-existe'));

  // Um streaming de verdade continua intocado por um cancelStream() de outro
  // id — cancelamento por fora de um `id` que não existe não afeta o que
  // realmente está rodando. Aqui quem interrompe é o AbortSignal do CHAMADOR
  // (externo), não o timeout interno do Service — por isso o erro esperado é
  // o AbortError propagado, não a mensagem de "tempo esgotado" (essa é
  // exclusiva do temporizador interno, testada à parte).
  const pending = service.handleSendMessageStream('oi', { id: 'req-2', signal: AbortSignal.timeout(10) });
  await assert.rejects(pending, /AbortError|abortad/i);
});

test('Timeout durante streaming — expira, aborta o Provider e emite MessageStreamFailed', async () => {
  const aiManager = makeAIManager(hangingChatStreamFetch());
  const { context, events } = makeContext(aiManager);
  const stream = collectStreamEvents(events);

  const service = new ConversationService({ timeoutMs: 20 });
  service.initialize(context);
  service.start(context);

  await assert.rejects(() => service.handleSendMessageStream('oi'), /tempo esgotado/);

  assert.equal(stream.completed.length, 0);
  assert.equal(stream.failed.length, 1);
  assert.match(stream.failed[0].error, /tempo esgotado/);
});

test('Erro do Provider durante streaming — Ollama offline emite MessageStreamFailed, sem Completed', async () => {
  const aiManager = makeAIManager(offlineFetch());
  const { context, events } = makeContext(aiManager);
  const stream = collectStreamEvents(events);

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  await assert.rejects(
    () => service.handleSendMessageStream('oi'),
    /Não foi possível conectar ao Ollama/,
  );

  assert.equal(stream.completed.length, 0);
  assert.equal(stream.failed.length, 1);
  assert.match(stream.failed[0].error, /Não foi possível conectar ao Ollama/);
});

test('Mensagem vazia em streaming — Started+Completed direto, sem chamar a IA', async () => {
  const aiManager = makeAIManager(offlineFetch()); // se chamasse a IA, isto falharia
  const { context, events } = makeContext(aiManager);
  const stream = collectStreamEvents(events);

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  const result = await service.handleSendMessageStream('   ');

  assert.equal(result.reply, 'Mensagem vazia recebida com sucesso.');
  assert.equal(stream.started.length, 1);
  assert.equal(stream.completed.length, 1);
  assert.equal(stream.chunks.length, 0);
});

test('Runtime propagando eventos — um Kernel real (onAny) recebe os 4 eventos de streaming pelo Event Bus', async () => {
  const kernel = createKernel();
  const fetchImpl = chatStreamFetch([{ message: { role: 'assistant', content: 'Oi!' }, done: true }]);
  const providerManager = new ProviderManager({ events: kernel.context.events });
  providerManager.register(createOllamaProvider({ baseUrl: BASE_URL, fetchImpl }));
  const aiManager = new AIManager({ registry: providerManager });
  kernel.registerService(AI_MANAGER_ID, aiManager);

  const seen: string[] = [];
  kernel.context.events.onAny((event) => seen.push(event.name));

  const service = new ConversationService();
  service.initialize(kernel.context);
  service.start(kernel.context);

  await service.handleSendMessageStream('oi');

  // onAny é o MESMO mecanismo que `attachRuntimeEventsSocket` usa para
  // encaminhar eventos ao WebSocket — se chegam aqui, chegam à Web também,
  // sem nenhuma mudança no Runtime (Sprint 17.5).
  assert.ok(seen.includes('MessageStreamStarted'));
  assert.ok(seen.includes('MessageStreamChunk'));
  assert.ok(seen.includes('MessageStreamCompleted'));
  assert.equal(seen.includes('MessageStreamFailed'), false);
});

/**
 * Testes de memória conversacional (Sprint 18): `ConversationService` monta
 * `messages = [...histórico, mensagem atual]` automaticamente antes de cada
 * chamada ao AIManager, e só grava o par (usuário+assistente) no histórico
 * depois de uma resposta com sucesso — nada em erro, timeout ou cancelamento.
 */

/** Fábrica de `fetch` fake para `/api/chat` (stream:false) que GRAVA o corpo de cada requisição recebida. */
function chatFetchCapturing(
  requests: Array<{ messages: ReadonlyArray<{ role: string; content: string }> }>,
  reply: (callNumber: number) => string,
): typeof fetch {
  let call = 0;
  return (async (_input: string | URL, init?: RequestInit) => {
    call++;
    if (init?.body) {
      requests.push(JSON.parse(String(init.body)) as (typeof requests)[number]);
    }
    return jsonResponse({ message: { role: 'assistant', content: reply(call) } });
  }) as typeof fetch;
}

/** Mesma ideia, mas para `/api/chat` em streaming (stream:true). */
function chatStreamFetchCapturing(
  requests: Array<{ messages: ReadonlyArray<{ role: string; content: string }> }>,
  reply: (callNumber: number) => string,
): typeof fetch {
  let call = 0;
  return (async (input: string | URL, init?: RequestInit) => {
    call++;
    if (init?.body) {
      requests.push(JSON.parse(String(init.body)) as (typeof requests)[number]);
    }
    const inner = chatStreamFetch([{ message: { role: 'assistant', content: reply(call) }, done: true }]);
    return inner(input, init);
  }) as typeof fetch;
}

test('execute() preservando contexto — a 2ª mensagem inclui o histórico da 1ª no array messages enviado ao Provider', async () => {
  const requests: Array<{ messages: ReadonlyArray<{ role: string; content: string }> }> = [];
  const fetchImpl = chatFetchCapturing(requests, (call) => (call === 1 ? 'Oi! Tudo bem?' : 'Ótimo, e você?'));
  const aiManager = makeAIManager(fetchImpl);
  const { context } = makeContext(aiManager);

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  const first = await service.handleSendMessage('oi, tudo bem?', { conversationId: 'conv-1' });
  const second = await service.handleSendMessage('tudo ótimo', { conversationId: 'conv-1' });

  assert.equal(first.reply, 'Oi! Tudo bem?');
  assert.equal(second.reply, 'Ótimo, e você?');
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].messages, [{ role: 'user', content: 'oi, tudo bem?' }]);
  assert.deepEqual(requests[1].messages, [
    { role: 'user', content: 'oi, tudo bem?' },
    { role: 'assistant', content: 'Oi! Tudo bem?' },
    { role: 'user', content: 'tudo ótimo' },
  ]);
});

test('stream() preservando contexto — a 2ª mensagem em streaming inclui o histórico da 1ª', async () => {
  const requests: Array<{ messages: ReadonlyArray<{ role: string; content: string }> }> = [];
  const fetchImpl = chatStreamFetchCapturing(requests, (call) => (call === 1 ? 'Olá!' : 'De novo, oi!'));
  const aiManager = makeAIManager(fetchImpl);
  const { context } = makeContext(aiManager);

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  const first = await service.handleSendMessageStream('primeira', { conversationId: 'conv-1' });
  const second = await service.handleSendMessageStream('segunda', { conversationId: 'conv-1' });

  assert.equal(first.reply, 'Olá!');
  assert.equal(second.reply, 'De novo, oi!');
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].messages, [{ role: 'user', content: 'primeira' }]);
  assert.deepEqual(requests[1].messages, [
    { role: 'user', content: 'primeira' },
    { role: 'assistant', content: 'Olá!' },
    { role: 'user', content: 'segunda' },
  ]);
});

test('Conversas diferentes não se misturam — conversationId distintos têm históricos independentes', async () => {
  const requests: Array<{ messages: ReadonlyArray<{ role: string; content: string }> }> = [];
  const fetchImpl = chatFetchCapturing(requests, () => 'ok');
  const aiManager = makeAIManager(fetchImpl);
  const { context } = makeContext(aiManager);

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  await service.handleSendMessage('mensagem da conversa 1', { conversationId: 'conv-1' });
  await service.handleSendMessage('mensagem da conversa 2', { conversationId: 'conv-2' });

  // A 2ª chamada é de OUTRA conversa — não deve carregar o histórico da conv-1.
  assert.deepEqual(requests[1].messages, [{ role: 'user', content: 'mensagem da conversa 2' }]);
  assert.equal((await service.getHistory('conv-1')).length, 2);
  assert.equal((await service.getHistory('conv-2')).length, 2);
});

test('Erro não grava resposta — falha da IA não deixa nada na memória da conversa (execute)', async () => {
  const aiManager = makeAIManager(offlineFetch());
  const { context } = makeContext(aiManager);

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  await assert.rejects(() => service.handleSendMessage('oi', { conversationId: 'conv-1' }));

  assert.equal((await service.getHistory('conv-1')).length, 0);
});

test('Erro não grava resposta — falha da IA não deixa nada na memória da conversa (stream)', async () => {
  const aiManager = makeAIManager(offlineFetch());
  const { context } = makeContext(aiManager);

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  await assert.rejects(() =>
    service.handleSendMessageStream('oi', { conversationId: 'conv-1' }),
  );

  assert.equal((await service.getHistory('conv-1')).length, 0);
});

test('Cancelamento não grava resposta parcial — memória fica vazia após cancelStream()', async () => {
  const aiManager = makeAIManager(hangingChatStreamFetch());
  const { context } = makeContext(aiManager);

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  const pending = service.handleSendMessageStream('oi', { id: 'req-mem', conversationId: 'conv-1' });
  await new Promise((resolve) => setTimeout(resolve, 5));
  service.cancelStream('req-mem');

  await assert.rejects(pending, /AbortError|abortad/i);
  assert.equal((await service.getHistory('conv-1')).length, 0);
});

test('Timeout não grava resposta parcial — memória fica vazia após expirar', async () => {
  const aiManager = makeAIManager(hangingChatStreamFetch());
  const { context } = makeContext(aiManager);

  const service = new ConversationService({ timeoutMs: 20 });
  service.initialize(context);
  service.start(context);

  await assert.rejects(
    () => service.handleSendMessageStream('oi', { conversationId: 'conv-1' }),
    /tempo esgotado/,
  );

  assert.equal((await service.getHistory('conv-1')).length, 0);
});

test('Sem conversationId — cai numa conversa padrão implícita, sem quebrar (compatibilidade com quem não conhece a Sprint 18)', async () => {
  const fetchImpl = chatFetch(() => jsonResponse({ message: { role: 'assistant', content: 'ok' } }));
  const aiManager = makeAIManager(fetchImpl);
  const { context } = makeContext(aiManager);

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  const result = await service.handleSendMessage('oi'); // sem conversationId
  assert.equal(result.reply, 'ok');
});

test('getHistory()/clearConversation() — refletem o que foi gravado e ConversationHistoryUpdated/Cleared são emitidos', async () => {
  const fetchImpl = chatFetch(() => jsonResponse({ message: { role: 'assistant', content: 'ok' } }));
  const aiManager = makeAIManager(fetchImpl);
  const { context, events } = makeContext(aiManager);

  const updated: ConversationHistoryUpdatedPayload[] = [];
  const cleared: ConversationHistoryClearedPayload[] = [];
  events.on<ConversationHistoryUpdatedPayload>(CONVERSATION_EVENTS.historyUpdated, (e) =>
    updated.push(e.payload),
  );
  events.on<ConversationHistoryClearedPayload>(CONVERSATION_EVENTS.historyCleared, (e) =>
    cleared.push(e.payload),
  );

  const service = new ConversationService();
  service.initialize(context);
  service.start(context);

  await service.handleSendMessage('oi', { conversationId: 'conv-1' });

  const history = await service.getHistory('conv-1');
  assert.equal(history.length, 2);
  assert.equal(history[0].role, 'user');
  assert.equal(history[1].role, 'assistant');
  assert.equal(updated.length, 1);
  assert.equal(updated[0].conversationId, 'conv-1');
  assert.equal(updated[0].messageCount, 2);

  await service.clearConversation('conv-1');

  assert.equal((await service.getHistory('conv-1')).length, 0);
  assert.equal(cleared.length, 1);
  assert.equal(cleared[0].conversationId, 'conv-1');
});

test('Comandos conversation.clear/conversation.history — funcionam de ponta a ponta via Kernel real', async () => {
  const kernel = createKernel();
  const fetchImpl = chatFetch(() => jsonResponse({ message: { role: 'assistant', content: 'ok' } }));
  const providerManager = new ProviderManager();
  providerManager.register(createOllamaProvider({ baseUrl: BASE_URL, fetchImpl }));
  const aiManager = new AIManager({ registry: providerManager });
  kernel.registerService(AI_MANAGER_ID, aiManager);

  conversationModule.registerServices(kernel.context);
  conversationModule.registerCommands(kernel.context);
  // `registerServices` só REGISTRA o singleton no Kernel (o que um
  // `ServiceManager.startAll()` faria em produção) — falta inicializá-lo,
  // senão `conversationService.context` fica null e nada funciona.
  conversationService.initialize(kernel.context);
  conversationService.start(kernel.context);
  // Isola este teste do resto da suíte: como `conversationService` é um
  // singleton do módulo, garante que a conversa usada aqui não carrega
  // histórico de nenhuma outra execução.
  await conversationService.clearConversation('conv-e2e');

  await kernel.dispatch({
    type: CONVERSATION_COMMANDS.sendMessage,
    payload: { text: 'oi', conversationId: 'conv-e2e' },
  });

  const historyResult = await kernel.dispatch<{ conversationId: string; messages: unknown[] }>({
    type: CONVERSATION_COMMANDS.history,
    payload: { conversationId: 'conv-e2e' },
  });
  assert.equal(historyResult.conversationId, 'conv-e2e');
  assert.equal(historyResult.messages.length, 2);

  await kernel.dispatch({
    type: CONVERSATION_COMMANDS.clear,
    payload: { conversationId: 'conv-e2e' },
  });

  const afterClear = await kernel.dispatch<{ messages: unknown[] }>({
    type: CONVERSATION_COMMANDS.history,
    payload: { conversationId: 'conv-e2e' },
  });
  assert.equal(afterClear.messages.length, 0);
});
