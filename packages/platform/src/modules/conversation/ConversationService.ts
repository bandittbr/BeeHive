import { AI_MANAGER_ID } from '../../ai/AIManager';
import type { AIManager, ChatMessage, ChatOutput } from '../../ai';
import { BaseService, type ServiceContext } from '../../services';
import {
  ConversationMemory,
  type ConversationMemoryMessage,
  type IConversationMemory,
} from './ConversationMemory';
import { CONVERSATION_EVENTS, type MessagePayload } from './events';
import type { FileAttachment } from './types';

/** Id do serviço no ServiceRegistry do Kernel. */
export const CONVERSATION_SERVICE_ID = 'conversation.service';

/** Conversa usada quando quem despacha não informa um `conversationId` (Sprint 18) — mantém quem ainda não conhece esta Sprint funcionando, só que sem separar por conversa. */
export const DEFAULT_CONVERSATION_ID = 'default';

const DEFAULT_TIMEOUT_MS = 60_000;

let seq = 0;
const nextId = () => `msg-${Date.now()}-${seq++}`;

export interface ConversationServiceOptions {
  /** Tempo máximo aguardando a IA antes de abortar a solicitação. Padrão: 60s. */
  timeoutMs?: number;
  /**
   * Memória conversacional (Sprint 18) — injetável para testes; por padrão
   * uma `ConversationMemory` própria, em RAM. Só o `ConversationService`
   * conhece este tipo: nenhuma outra camada sabe como a memória funciona.
   */
  memory?: IConversationMemory;
}

export interface HandleSendMessageOptions {
  /** Cancelamento vindo de quem chamou (ex.: usuário saiu da conversa). */
  signal?: AbortSignal;
  /** Conversa a que esta mensagem pertence (Sprint 18). Ausente = `DEFAULT_CONVERSATION_ID`. */
  conversationId?: string;
  /** Arquivos anexados (imagens, documentos) para suporte multimodal. */
  files?: FileAttachment[];
}

export interface HandleSendMessageStreamOptions {
  /** Cancelamento vindo de quem chamou DENTRO do mesmo processo (ex.: outro Service). */
  signal?: AbortSignal;
  /** Correlação — se ausente, um id é gerado. Usado nos 4 eventos MessageStream* e em `cancelStream(id)`. */
  id?: string;
  /** Conversa a que esta mensagem pertence (Sprint 18). Ausente = `DEFAULT_CONVERSATION_ID`. */
  conversationId?: string;
  /** Arquivos anexados (imagens, documentos) para suporte multimodal. */
  files?: FileAttachment[];
}

/**
 * ConversationService — onde vive TODA a lógica da Conversa.
 *
 * Recebe uma mensagem, registra o turno do usuário e obtém a resposta pela
 * AI Layer real: ConversationService → AIManager → ProviderManager →
 * OllamaProvider → Ollama. O Service nunca conhece o Provider concreto —
 * fala só com o `AIManager` (descoberto pelo `ServiceContext`, como qualquer
 * outro Service). Toda saída é por EVENTO no Event Bus: o Service nunca fala
 * com a UI diretamente.
 *
 * Se a IA falhar (Provider indisponível, modelo inexistente, Ollama offline,
 * cancelamento ou timeout), o erro é propagado como está — nenhuma mensagem
 * artificial é criada. Quem despachou o Command recebe a falha normalmente.
 *
 * Sprint 18 (memória): antes de cada chamada ao `AIManager`, o histórico da
 * conversa (`ConversationMemory`) é lido e prefixado a `messages` — é o que
 * dá contexto entre mensagens. Só é gravado no histórico DEPOIS de uma
 * resposta com sucesso (mensagem do usuário + resposta do assistente,
 * juntas); erro, timeout ou cancelamento não gravam nada — sem resposta
 * parcial/inexistente na memória. A memória é um detalhe de implementação
 * deste Service: nenhuma outra camada (AIManager, Provider, Runtime, UI)
 * sabe que ela existe.
 */
export class ConversationService extends BaseService {
  readonly id = CONVERSATION_SERVICE_ID;
  readonly name = 'ConversationService';
  readonly version = '0.3.0';

  private context: ServiceContext | null = null;
  private readonly timeoutMs: number;
  private memory: IConversationMemory;
  /** Streams em andamento, por `id` — só para `cancelStream()` conseguir abortar por fora (ex.: um comando HTTP, que não tem como carregar um AbortSignal vivo). */
  private readonly inFlight = new Map<string, AbortController>();

  constructor(options: ConversationServiceOptions = {}) {
    super();
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.memory = options.memory ?? new ConversationMemory();
  }

  /**
   * Substitui a memória em tempo de execução (ex.: trocar RAM por SQLite).
   *
   * Chamado pelo RuntimeManager durante o boot, depois que o DatabaseManager
   * está pronto. Idempotente: pode ser chamado múltiplas vezes.
   */
  setMemory(memory: IConversationMemory): void {
    this.memory = memory;
  }

  initialize(context: ServiceContext): void {
    super.initialize(context);
    this.context = context;
  }

  start(context: ServiceContext): void {
    super.start(context);
    this.context = context;
  }

  /**
   * Processa uma mensagem do usuário. Emite `MessageReceived` sempre (o turno
   * do usuário já aconteceu, independente do que vier depois); emite
   * `MessageSent` só se a IA responder com sucesso.
   */
  async handleSendMessage(
    text: string,
    options: HandleSendMessageOptions = {},
  ): Promise<{ reply: string }> {
    const clean = text.trim();
    const conversationId = options.conversationId ?? DEFAULT_CONVERSATION_ID;

    this.emitMessage({ id: nextId(), role: 'user', text: clean, timestamp: Date.now() });

    const reply =
      clean.length === 0
        ? 'Mensagem vazia recebida com sucesso.'
        : await this.askAI(conversationId, clean, options.signal, options.files);

    this.emitMessage({ id: nextId(), role: 'assistant', text: reply, timestamp: Date.now() });
    this.context?.logger.info('Mensagem processada', { chars: clean.length });

    return { reply };
  }

  /**
   * Fala com a AI Layer pelo caminho obrigatório: AIManager → ProviderManager
   * → OllamaProvider → Ollama. Usa o modelo ativo do ProviderManager (via
   * `AIManager.activeModel()`) quando disponível; senão deixa o Provider usar
   * seu próprio padrão. Compõe o `signal` de quem chamou com um timeout
   * interno — o que disparar primeiro aborta a solicitação.
   *
   * Sprint 18: monta `messages = [...histórico, mensagem atual]` — histórico
   * lido de `ConversationMemory` ANTES de chamar o AIManager. Só grava o
   * par (usuário + assistente) no histórico DEPOIS do sucesso.
   */
  private async askAI(
    conversationId: string,
    text: string,
    callerSignal?: AbortSignal,
    files?: FileAttachment[],
  ): Promise<string> {
    const aiManager = this.context?.getService<AIManager>(AI_MANAGER_ID);
    if (!aiManager) {
      throw new Error(
        'ConversationService: AIManager indisponível (AI Layer não registrada no Runtime).',
      );
    }

    const controller = new AbortController();
    let timedOut = false;

    const onCallerAbort = () => controller.abort();
    if (callerSignal) {
      if (callerSignal.aborted) controller.abort();
      else callerSignal.addEventListener('abort', onCallerAbort);
    }

    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);

    // Detect if any files are images -> use 'vision' capability
    const hasImages = files?.some((f) => f.type.startsWith('image/')) ?? false;
    const capability = hasImages ? 'vision' : 'chat';

    try {
      const history = await this.memory.history(conversationId);
      const model = aiManager.activeModel();
      const response = await aiManager.execute<ChatOutput>(
        {
          capability,
          input: { messages: [...toChatMessages(history), { role: 'user', content: text, files }] },
          options: model ? { model } : undefined,
        },
        { source: CONVERSATION_SERVICE_ID, signal: controller.signal },
      );
      const reply = response.output.message.content;
      await this.remember(conversationId, text, reply);
      return reply;
    } catch (error) {
      if (timedOut) {
        throw new Error(
          `ConversationService: tempo esgotado (${this.timeoutMs}ms) aguardando a IA.`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
      if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort);
    }
  }

  /**
   * Mesmo que `handleSendMessage`, mas em streaming: a resposta chega em
   * pedaços por eventos (`MessageStream*`) ENQUANTO é gerada, em vez de tudo
   * de uma vez no fim. Emite `MessageReceived` (turno do usuário, igual ao
   * caminho síncrono) e depois `MessageStreamStarted` → N×
   * `MessageStreamChunk` → `MessageStreamCompleted` (ou `MessageStreamFailed`
   * no lugar do Completed, se a IA falhar). A Promise devolvida só resolve
   * quando o streaming termina — quem quiser reagir pedaço a pedaço escuta os
   * eventos, não o retorno.
   */
  async handleSendMessageStream(
    text: string,
    options: HandleSendMessageStreamOptions = {},
  ): Promise<{ id: string; reply: string }> {
    const clean = text.trim();
    const id = options.id ?? nextId();
    const conversationId = options.conversationId ?? DEFAULT_CONVERSATION_ID;

    this.emitMessage({ id: nextId(), role: 'user', text: clean, timestamp: Date.now() });

    if (clean.length === 0) {
      const reply = 'Mensagem vazia recebida com sucesso.';
      this.context?.events.emit(CONVERSATION_EVENTS.streamStarted, { id, timestamp: Date.now() });
      this.context?.events.emit(CONVERSATION_EVENTS.streamCompleted, {
        id,
        text: reply,
        timestamp: Date.now(),
      });
      return { id, reply };
    }

    const reply = await this.streamAI(id, conversationId, clean, options.signal, options.files);
    this.context?.logger.info('Mensagem processada (streaming)', { chars: clean.length });
    return { id, reply };
  }

  /**
   * Cancela um streaming em andamento pelo `id` (Sprint 17). É o caminho para
   * quem não tem um `AbortSignal` vivo à mão — ex.: o handler HTTP de
   * `/api/runtime/command`, que despachou `sendMessageStream` numa requisição
   * já finalizada e só pode mandar OUTRO comando (`cancelStream`) para
   * interromper a que ainda está rodando. Idempotente: cancelar um `id`
   * desconhecido ou já concluído não faz nada (sem lançar).
   */
  cancelStream(id: string): void {
    this.inFlight.get(id)?.abort();
  }

  /**
   * Equivalente a `askAI()`, mas via `AIManager.stream()`: mesma composição
   * de `signal` do chamador + timeout interno (o que disparar primeiro
   * aborta), mesma classificação de erro de timeout — só que aqui cada
   * pedaço vira um `MessageStreamChunk` NA HORA (via `onDelta`), e o texto
   * final vem de `onDone` (a mesma `AIResponse` que `execute()` devolveria).
   * O `AbortController` fica em `inFlight` enquanto dura, para `cancelStream()`
   * conseguir alcançá-lo por fora.
   *
   * Sprint 18: mesmo histórico automático de `askAI()` — lido antes de
   * streamar, gravado (par usuário+assistente) só depois de `onDone`. Se
   * falhar/expirar/for cancelado antes disso, nada é gravado (sem resposta
   * parcial no histórico).
   */
private async streamAI(
    id: string,
    conversationId: string,
    text: string,
    callerSignal?: AbortSignal,
    files?: FileAttachment[],
  ): Promise<string> {
    const aiManager = this.context?.getService<AIManager>(AI_MANAGER_ID);
    if (!aiManager) {
      throw new Error(
        'ConversationService: AIManager indisponível (AI Layer não registrada no Runtime).',
      );
    }

    const controller = new AbortController();
    this.inFlight.set(id, controller);
    let timedOut = false;

    const onCallerAbort = () => controller.abort();
    if (callerSignal) {
      if (callerSignal.aborted) controller.abort();
      else callerSignal.addEventListener('abort', onCallerAbort);
    }

    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);

    // Detect if any files are images -> use 'vision' capability
    const hasImages = files?.some((f) => f.type.startsWith('image/')) ?? false;
    const capability = hasImages ? 'vision' : 'chat';

    this.context?.events.emit(CONVERSATION_EVENTS.streamStarted, { id, timestamp: Date.now() });

    let finalText: string | null = null;
    try {
      const history = await this.memory.history(conversationId);
      const model = aiManager.activeModel();
      await aiManager.stream(
        {
          capability,
          input: { messages: [...toChatMessages(history), { role: 'user', content: text, files }] },
          options: model ? { model } : undefined,
        },
        {
          onDelta: (delta) => {
            if (!delta) return;
            this.context?.events.emit(CONVERSATION_EVENTS.streamChunk, { id, delta });
          },
          onDone: (response) => {
            finalText = (response.output as ChatOutput).message.content;
          },
        },
        { source: CONVERSATION_SERVICE_ID, signal: controller.signal },
      );

      const text2 = finalText ?? '';
      await this.remember(conversationId, text, text2);
      this.context?.events.emit(CONVERSATION_EVENTS.streamCompleted, {
        id,
        text: text2,
        timestamp: Date.now(),
      });
      return text2;
    } catch (error) {
      const message = timedOut
        ? `ConversationService: tempo esgotado (${this.timeoutMs}ms) aguardando a IA.`
        : error instanceof Error
          ? error.message
          : 'erro desconhecido';
      this.context?.events.emit(CONVERSATION_EVENTS.streamFailed, { id, error: message });
      throw timedOut ? new Error(message) : error;
    } finally {
      clearTimeout(timer);
      if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort);
      this.inFlight.delete(id);
    }
  }

  /** Histórico atual de uma conversa (Sprint 18) — cronológico, já respeitando o limite configurado da `ConversationMemory`. */
  async getHistory(conversationId: string): Promise<readonly ConversationMemoryMessage[]> {
    return this.memory.history(conversationId);
  }

  /** Limpa o histórico de uma conversa (Sprint 18) e emite `ConversationHistoryCleared`. Idempotente. */
  async clearConversation(conversationId: string): Promise<void> {
    await this.memory.clear(conversationId);
    this.context?.events.emit(CONVERSATION_EVENTS.historyCleared, {
      conversationId,
      timestamp: Date.now(),
    });
  }

  /** Grava o par usuário+assistente no histórico da conversa e emite `ConversationHistoryUpdated`. Só chamado após uma resposta com sucesso. */
  private async remember(conversationId: string, userText: string, assistantText: string): Promise<void> {
    const now = Date.now();
    await this.memory.append(conversationId, { role: 'user', content: userText, timestamp: now });
    await this.memory.append(conversationId, {
      role: 'assistant',
      content: assistantText,
      timestamp: Date.now(),
    });
    const messageCount = await this.memory.count(conversationId);
    this.context?.events.emit(CONVERSATION_EVENTS.historyUpdated, {
      conversationId,
      messageCount,
      timestamp: Date.now(),
    });
  }

  private emitMessage(message: MessagePayload): void {
    if (!this.context) return;
    const event =
      message.role === 'user' ? CONVERSATION_EVENTS.received : CONVERSATION_EVENTS.sent;
    this.context.events.emit(event, message);
  }
}

/** `ConversationMemoryMessage[]` → `ChatMessage[]` — descarta `timestamp` (a AI Layer não conhece esse campo). */
function toChatMessages(history: readonly ConversationMemoryMessage[]): ChatMessage[] {
  return history.map((m) => ({ role: m.role, content: m.content }));
}

export const conversationService = new ConversationService();
