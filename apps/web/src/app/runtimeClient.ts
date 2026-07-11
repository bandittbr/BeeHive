import {
  CONVERSATION_COMMANDS,
  type BeeHiveEvent,
  type Command,
  type ConversationHistoryResult,
  type EventName,
  type LogEntry,
  type RuntimeHealth,
  type RuntimeSnapshot,
  type RuntimeStatus,
  type Unsubscribe,
} from '@beehive/platform';

type EventHandler<P = unknown> = (event: BeeHiveEvent<P>) => void;

/** Callbacks de uma resposta em streaming (NDJSON: delta a delta). */
export interface NdjsonHandlers {
  onDelta: (text: string) => void;
  onError: (message: string) => void;
}

interface NdjsonEvent {
  type?: 'delta' | 'done' | 'error';
  content?: string;
  message?: string;
}

export interface ChatTurn {
  role: string;
  content: string;
}

export interface ContentPlanInput {
  niche: string;
  brand?: string;
}

export interface PostsInput {
  niche: string;
  brand?: string;
  plan?: string;
}

export interface ModelsInfo {
  models: string[];
  current: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

async function getJSON<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Runtime respondeu ${response.status} em ${path}`);
  }
  return (await response.json()) as T;
}

/** Lê o corpo como JSON sem lançar — usado para extrair `error`/`detail` de respostas de erro. */
async function safeJson<T>(response: Response): Promise<Partial<T>> {
  try {
    return (await response.json()) as Partial<T>;
  } catch {
    return {};
  }
}

/**
 * RuntimeClient — a raiz por onde a Web fala com o BeeHive Runtime.
 *
 * A partir desta Sprint (12), o Runtime NÃO roda mais no navegador: ele é um
 * processo próprio hospedado em `apps/api` (ver `@beehive/platform`). A Web é
 * só um CLIENTE — consulta status/health/snapshot/logs por HTTP, despacha
 * Commands por HTTP e escuta Events por WebSocket. Nunca instancia Kernel,
 * Modules, Services, Tools ou AI localmente.
 */
export class RuntimeClient {
  private socket: WebSocket | null = null;
  private readonly handlers = new Map<EventName, Set<EventHandler>>();
  private reconnectTimer: number | null = null;

  status(): Promise<{ status: RuntimeStatus }> {
    return getJSON('/runtime/status');
  }

  health(): Promise<RuntimeHealth> {
    return getJSON('/runtime/health');
  }

  snapshot(): Promise<RuntimeSnapshot> {
    return getJSON('/runtime/snapshot');
  }

  logs(): Promise<readonly LogEntry[]> {
    return getJSON('/runtime/logs');
  }

  /** Despacha um Command no Runtime remoto (POST) e devolve o resultado. */
  async dispatch<R = unknown>(command: Command): Promise<R> {
    const response = await fetch(`${API_BASE}/runtime/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
    const data = (await response.json().catch(() => ({}))) as { result?: R; error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? `Comando falhou: ${command.type}`);
    }
    return data.result as R;
  }

  // ------------------------------ Conversa ------------------------------

  /** Gera a resposta da Conversa em streaming (NDJSON), delta a delta. */
  sendConversationMessage(
    message: ChatTurn,
    history: readonly ChatTurn[],
    handlers: NdjsonHandlers,
    signal?: AbortSignal,
  ): Promise<void> {
    return this.streamNdjson(
      '/conversation/stream',
      { message, history },
      handlers,
      signal,
      'Não consegui falar com o Core do BeeHive. Verifique se o servidor e o Ollama estão em execução.',
    );
  }

  /** Limpa o histórico (memória de sessão, Sprint 18) de uma conversa no Runtime. */
  async clearConversation(conversationId: string): Promise<void> {
    await this.dispatch({ type: CONVERSATION_COMMANDS.clear, payload: { conversationId } });
  }

  /** Histórico atual (memória de sessão, Sprint 18) de uma conversa no Runtime. */
  getConversationHistory(conversationId: string): Promise<ConversationHistoryResult> {
    return this.dispatch<ConversationHistoryResult>({
      type: CONVERSATION_COMMANDS.history,
      payload: { conversationId },
    });
  }

  // ------------------------------ Business -------------------------------

  /** Agente estrategista — gera o plano de conteúdo em streaming (NDJSON). */
  streamBusinessContentPlan(
    input: ContentPlanInput,
    handlers: NdjsonHandlers,
    signal?: AbortSignal,
  ): Promise<void> {
    return this.streamNdjson(
      '/business/content-plan',
      input,
      handlers,
      signal,
      'Não consegui falar com o Core do BeeHive. Verifique o servidor e o Ollama.',
    );
  }

  /** Agente redator — gera os posts em streaming (NDJSON). */
  streamBusinessPosts(input: PostsInput, handlers: NdjsonHandlers, signal?: AbortSignal): Promise<void> {
    return this.streamNdjson(
      '/business/posts',
      input,
      handlers,
      signal,
      'Não consegui falar com o Core do BeeHive. Verifique o servidor e o Ollama.',
    );
  }

  // -------------------------------- Mídia ---------------------------------

  /** Gera uma imagem (provedor na nuvem) e devolve a URL. */
  async generateImage(prompt: string, seed?: number): Promise<string> {
    const response = await fetch(`${API_BASE}/media/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, seed }),
    });
    if (!response.ok) {
      const data = await safeJson<{ error?: string }>(response);
      throw new Error(data.error ?? `Erro ${response.status}`);
    }
    const data = (await response.json()) as { url: string };
    return data.url;
  }

  // ----------------------------- Configurações ----------------------------

  /** Lista os modelos de inteligência instalados e qual está ativo. */
  async listModels(): Promise<ModelsInfo> {
    const response = await fetch(`${API_BASE}/models`);
    if (!response.ok) {
      const data = await safeJson<{ error?: string; detail?: string }>(response);
      throw new Error(data.detail ?? data.error ?? `Erro ${response.status}`);
    }
    return (await response.json()) as ModelsInfo;
  }

  /** Troca o modelo de inteligência ativo. */
  async setActiveModel(model: string): Promise<string> {
    const response = await fetch(`${API_BASE}/settings/model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    });
    if (!response.ok) {
      const data = await safeJson<{ error?: string }>(response);
      throw new Error(data.error ?? `Erro ${response.status}`);
    }
    const data = (await response.json()) as { current: string };
    return data.current;
  }

  // --------------------------------- Eventos -------------------------------

  /** Assina um evento do Runtime remoto. Conecta o WebSocket sob demanda. */
  on<P = unknown>(name: EventName, handler: EventHandler<P>): Unsubscribe {
    this.ensureSocket();
    const set = this.handlers.get(name) ?? new Set<EventHandler>();
    set.add(handler as EventHandler);
    this.handlers.set(name, set);
    return () => {
      set.delete(handler as EventHandler);
      if (set.size === 0) {
        this.handlers.delete(name);
      }
    };
  }

  /**
   * Lê uma resposta NDJSON em streaming e repassa os eventos aos handlers.
   * Base compartilhada de Conversa e Business (mesmo protocolo de transporte).
   */
  private async streamNdjson(
    path: string,
    body: unknown,
    handlers: NdjsonHandlers,
    signal: AbortSignal | undefined,
    offlineMessage: string,
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify(body),
      });

      if (!response.ok || !response.body) {
        const data = await safeJson<{ error?: string; detail?: string }>(response);
        handlers.onError(data.detail ?? data.error ?? `Erro ${response.status}`);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let event: NdjsonEvent;
          try {
            event = JSON.parse(trimmed) as NdjsonEvent;
          } catch {
            continue;
          }
          if (event.type === 'delta' && event.content) {
            handlers.onDelta(event.content);
          } else if (event.type === 'error') {
            handlers.onError(event.message ?? 'Erro na geração.');
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      handlers.onError(offlineMessage);
    }
  }

  private ensureSocket(): void {
    const openOrConnecting =
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING);
    if (openOrConnecting) return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${window.location.host}${API_BASE}/runtime/events`);

    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data as string) as BeeHiveEvent;
        const set = this.handlers.get(event.name);
        if (!set) return;
        for (const handler of [...set]) handler(event);
      } catch {
        // Mensagem não reconhecida — ignorada silenciosamente.
      }
    };

    socket.onclose = () => {
      this.socket = null;
      if (this.handlers.size > 0 && this.reconnectTimer === null) {
        this.reconnectTimer = window.setTimeout(() => {
          this.reconnectTimer = null;
          this.ensureSocket();
        }, 2000);
      }
    };

    this.socket = socket;
  }
}

let instance: RuntimeClient | null = null;

/** Acesso ao cliente do Runtime (singleton do lado da Web). */
export function getRuntimeClient(): RuntimeClient {
  if (!instance) instance = new RuntimeClient();
  return instance;
}
