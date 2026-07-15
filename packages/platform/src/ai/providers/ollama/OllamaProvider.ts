import type { ILogger } from '../../../kernel';
import { BaseAIProvider } from '../../BaseAIProvider';
import type {
  AICapability,
  AIContext,
  AIProviderHealth,
  AIRequest,
  AIResponse,
  AIStreamHandlers,
  ChatInput,
  ChatOutput,
  ChatMessage,
  ToolCall,
  ToolCallResult,
} from '../../types';
import { OllamaHttpClient } from './OllamaHttpClient';
import type {
  OllamaChatMessage,
  OllamaModelInfo,
  OllamaModelSummary,
  OllamaToolCall,
  OllamaTool,
} from './types';
import type { ToolDefinition } from '../../../tools/types';

/**
 * Converte FileAttachment do formato da AI Layer para o formato do Ollama.
 * Ollama espera imagens como array de strings base64 (sem prefixo "data:...").
 */
function toOllamaMessages(messages: readonly ChatMessage[]): OllamaChatMessage[] {
  return messages.map((msg) => {
    const ollamaMsg: OllamaChatMessage = {
      role: msg.role,
      content: msg.content,
    };

    if (msg.files && msg.files.length > 0) {
      const images: string[] = [];
      for (const file of msg.files) {
        if (file.type.startsWith('image/') && file.content.startsWith('data:')) {
          // Extrai só o base64 puro (remove "data:image/png;base64,")
          const base64 = file.content.split(',')[1];
          if (base64) images.push(base64);
        }
      }
      if (images.length > 0) ollamaMsg.images = images;
    }

    return ollamaMsg;
  });
}

export interface OllamaProviderOptions {
  /** Base do servidor Ollama. Padrão: http://localhost:11434. */
  baseUrl?: string;
  /** Modelo padrão quando a solicitação não especifica um. Padrão: llama3.2. */
  model?: string;
  /** Injeção do `fetch` (testes). */
  fetchImpl?: typeof fetch;
  logger?: ILogger;
}

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.2';

/**
 * OllamaProvider — o primeiro provedor real da AI Layer.
 *
 * Implementa o contrato `AIProvider` (Sprint 6) chamando a API local do
 * Ollama através do `OllamaHttpClient` — o ÚNICO lugar do sistema que conhece
 * um endpoint de Ollama. Suporta apenas a capacidade `chat` nesta sprint.
 *
 * Ninguém deve instanciar/consumir este provedor diretamente: o caminho
 * obrigatório é Service → AIManager → AIProviderRegistry → OllamaProvider.
 * Configuração (baseUrl/model) é sempre injetada — o provedor nunca lê
 * variáveis de ambiente (P7: nada de acoplamento a infraestrutura concreta).
 */
export class OllamaProvider extends BaseAIProvider {
  readonly id = 'ollama';
  readonly name = 'Ollama';
  readonly capabilities: readonly AICapability[] = ['chat'];

  private readonly client: OllamaHttpClient;
  private readonly defaultModel: string;
  private readonly logger?: ILogger;
  private lastHealth: AIProviderHealth = { ok: true };

  constructor(options: OllamaProviderOptions = {}) {
    super();
    this.client = new OllamaHttpClient({
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      fetchImpl: options.fetchImpl,
    });
    this.defaultModel = options.model ?? DEFAULT_MODEL;
    this.logger = options.logger?.child('ai:ollama');
  }

  /**
   * Ponto de entrada do contrato AIProvider — só aceita a capacidade `chat`.
   *
   * Sprint 21: quando `request.tools` traz alguma `ToolDefinition`, traduz
   * cada uma para o formato oficial de "function calling" do Ollama
   * (`toOllamaTools()`) e envia em `tools` no corpo de `/api/chat`. Se o
   * Ollama decidir chamar alguma, a resposta traz `message.tool_calls` — que
   * vira `AIResponse.toolCalls` (via `toAIToolCalls()`), disparando o Agent
   * Loop (Sprint 19) no `AIManager`, sem nenhuma mudança lá.
   */
  async execute(request: AIRequest, context: AIContext): Promise<AIResponse> {
    if (request.capability !== 'chat') {
      throw new Error(
        `OllamaProvider não suporta a capacidade "${request.capability}" (só "chat" nesta sprint).`,
      );
    }

    const input = request.input as ChatInput;
    if (!input?.messages?.length) {
      throw new Error('OllamaProvider: "messages" é obrigatório para a capacidade chat.');
    }

    const model = request.options?.model ?? this.defaultModel;
    const tools = request.tools?.length ? toOllamaTools(request.tools) : undefined;
    const messages = toOllamaMessages(input.messages);
    const message = await this.chat(messages, {
      model,
      signal: context.signal,
      tools,
    });

    const output: ChatOutput = { message: { role: message.role, content: message.content } };
    const toolCalls = toAIToolCalls(message.tool_calls);
    return {
      capability: 'chat',
      output,
      provider: this.id,
      model,
      finishedAt: Date.now(),
      ...(toolCalls ? { toolCalls } : {}),
    };
  }

  /**
   * Segunda rodada do Agent Loop (Sprint 19) — chamada pelo `AIManager`
   * depois que o Tool System já executou as Tool Calls que `execute()`
   * pediu. Encapsula TODA a adaptação ao protocolo do Ollama: reconstrói a
   * mensagem `assistant` que pediu as Tools (com `tool_calls`) e acrescenta
   * uma mensagem `role: 'tool'` por resultado, preservando `callId`/
   * `toolId`/`status`/`output`/`error` (serializados em JSON no `content` —
   * nada se perde), e faz uma nova chamada `POST /api/chat` com o histórico
   * completo. Nenhuma outra camada monta essa forma de mensagens.
   *
   * Falhas de Tool Call (`status: 'failed'`) são enviadas ao modelo do mesmo
   * jeito que sucessos — quem decide como reagir ao erro é a IA, não este
   * Provider (o Agent Loop nunca interrompe por causa de uma falha).
   */
  async continueConversation(
    request: AIRequest,
    response: AIResponse,
    toolResults: readonly ToolCallResult[],
    context: AIContext,
  ): Promise<AIResponse> {
    if (request.capability !== 'chat') {
      throw new Error(
        `OllamaProvider não suporta continueConversation para a capacidade "${request.capability}" (só "chat" nesta sprint).`,
      );
    }
    if (toolResults.length === 0) {
      throw new Error('OllamaProvider: continueConversation requer ao menos um ToolCallResult.');
    }

    const input = request.input as ChatInput;
    const model = request.options?.model ?? this.defaultModel;

    const assistantOutput = response.output as ChatOutput | undefined;
    const assistantToolCalls: OllamaToolCall[] = (response.toolCalls ?? []).map((call) => ({
      function: { name: call.toolId, arguments: call.input },
    }));

    const messages: OllamaChatMessage[] = [
      ...(input.messages as readonly OllamaChatMessage[]),
      {
        role: 'assistant',
        content: assistantOutput?.message?.content ?? '',
        tool_calls: assistantToolCalls,
      },
      ...toolResults.map((result): OllamaChatMessage => ({
        role: 'tool',
        content: toolResultContent(result),
      })),
    ];

    const reply = await this.chat(messages, { model, signal: context.signal });

    const output: ChatOutput = { message: reply };
    return {
      capability: 'chat',
      output,
      provider: this.id,
      model,
      finishedAt: Date.now(),
    };
  }

  /**
   * Ponto de entrada de streaming do contrato `AIProvider` — só `chat`, como
   * `execute()`. Consome `OllamaHttpClient.chatStream()` (NDJSON real da API
   * do Ollama) e chama `handlers.onDelta` a cada pedaço, na ordem recebida
   * (mesmo pedaço vazio — quem decide filtrar é quem chama, aqui é
   * repasse fiel). Ao fim, monta o MESMO formato de `AIResponse` que
   * `execute()` devolveria e chama `handlers.onDone`. Erros (rede, Ollama
   * fora do ar, cancelamento) propagam como exceção — igual a `execute()` —
   * e este método NÃO chama `handlers.onError` (isso é responsabilidade do
   * `AIManager`, o único lugar que decide a política de notificação).
   */
  async stream(request: AIRequest, handlers: AIStreamHandlers, context: AIContext): Promise<void> {
    if (request.capability !== 'chat') {
      throw new Error(
        `OllamaProvider não suporta streaming para a capacidade "${request.capability}" (só "chat" nesta sprint).`,
      );
    }

    const input = request.input as ChatInput;
    if (!input?.messages?.length) {
      throw new Error('OllamaProvider: "messages" é obrigatório para a capacidade chat.');
    }

    const model = request.options?.model ?? this.defaultModel;
    let full = '';

    try {
      for await (const chunk of this.client.chatStream(
        {
          model,
          messages: toOllamaMessages(input.messages),
          stream: true,
        },
        context.signal,
      )) {
        if (chunk.error) throw new Error(`Ollama: ${chunk.error}`);
        const delta = chunk.message?.content ?? '';
        if (delta) full += delta;
        handlers.onDelta(delta);
        if (chunk.done) break;
      }

      this.markHealthy();
      const output: ChatOutput = { message: { role: 'assistant', content: full.trim() } };
      const response: AIResponse = {
        capability: 'chat',
        output,
        provider: this.id,
        model,
        finishedAt: Date.now(),
      };
      handlers.onDone?.(response);
    } catch (error) {
      this.markUnhealthy(error);
      throw error;
    }
  }

  /**
   * Gera uma resposta completa (sem streaming) para a conversa dada.
   *
   * Tipa o retorno como `{ role: 'assistant' }` (em vez de `OllamaChatMessage`
   * genérico) de propósito: desde a Sprint 19, `OllamaChatRole` inclui
   * `'tool'` (papel só de ENTRADA, para devolver resultados de Tool Calls) —
   * o Ollama nunca RESPONDE com `role: 'tool'`, então isso mantém o retorno
   * compatível com `ChatMessage` (contrato genérico da AI Layer) sem casts.
   *
   * `tool_calls` (Sprint 21) é repassado tal como o Ollama devolveu, quando
   * presente — quem chama (`execute()`) decide se/como traduzir para
   * `AIResponse.toolCalls`; este método só fala o protocolo do Ollama.
   */
  async chat(
    messages: readonly OllamaChatMessage[],
    options: { model?: string; signal?: AbortSignal; tools?: OllamaTool[] } = {},
  ): Promise<{ role: 'assistant'; content: string; tool_calls?: OllamaToolCall[] }> {
    const model = options.model ?? this.defaultModel;
    try {
      const data = await this.client.chat(
        {
          model,
          messages: [...messages],
          stream: false,
          ...(options.tools?.length ? { tools: options.tools } : {}),
        },
        options.signal,
      );
      if (data.error) throw new Error(`Ollama: ${data.error}`);
      this.markHealthy();
      const content = (data.message?.content ?? '').trim();
      const toolCalls = data.message?.tool_calls;
      return {
        role: 'assistant',
        content,
        ...(toolCalls?.length ? { tool_calls: toolCalls } : {}),
      };
    } catch (error) {
      this.markUnhealthy(error);
      throw error;
    }
  }

  /** Lista os modelos instalados no Ollama. */
  async listModels(): Promise<OllamaModelSummary[]> {
    try {
      const data = await this.client.listTags();
      this.markHealthy();
      return (data.models ?? []).map((m) => ({
        name: m.name,
        size: m.size,
        modifiedAt: m.modified_at,
      }));
    } catch (error) {
      this.markUnhealthy(error);
      throw error;
    }
  }

  /** Detalhes de um modelo específico. Lança se o modelo não existir. */
  async modelInfo(model: string): Promise<OllamaModelInfo> {
    try {
      const data = await this.client.show(model);
      if (data.error) throw new Error(`Ollama: ${data.error}`);
      this.markHealthy();
      return {
        model,
        modelfile: data.modelfile,
        parameters: data.parameters,
        details: data.details,
      };
    } catch (error) {
      this.markUnhealthy(error);
      throw error;
    }
  }

  /**
   * `health()` do contrato `AIProvider` é síncrono (Sprint 6) — devolve o
   * último estado conhecido, atualizado a cada chamada real ao Ollama.
   * Otimista até a primeira chamada (mesma postura do `BaseAIProvider`).
   */
  health(): AIProviderHealth {
    return this.lastHealth;
  }

  /** Verificação ativa (assíncrona): pinga o Ollama agora e atualiza o estado. */
  async checkHealth(): Promise<AIProviderHealth> {
    try {
      await this.client.listTags();
      this.markHealthy();
    } catch (error) {
      this.markUnhealthy(error);
    }
    return this.lastHealth;
  }

  private markHealthy(): void {
    this.lastHealth = { ok: true };
  }

  private markUnhealthy(error: unknown): void {
    const detail = error instanceof Error ? error.message : 'erro desconhecido';
    this.lastHealth = { ok: false, detail };
    this.logger?.warn('OllamaProvider indisponível', { detail });
  }
}

/** Fábrica — o padrão já usado pelos demais componentes injetáveis do Kernel. */
export function createOllamaProvider(options?: OllamaProviderOptions): OllamaProvider {
  return new OllamaProvider(options);
}

/**
 * Serializa um `ToolCallResult` para o `content` de uma mensagem `role:
 * 'tool'` enviada ao Ollama — preserva `callId`/`toolId`/`status`/`output`/
 * `error` (Sprint 19: "nada pode ser perdido entre uma chamada e outra").
 */
function toolResultContent(result: ToolCallResult): string {
  return JSON.stringify({
    callId: result.call.id,
    toolId: result.call.toolId,
    status: result.status,
    output: result.output,
    error: result.error,
  });
}

// ------------------------- Tool Calling (Sprint 21) -------------------------
//
// Tradução genérica entre o contrato da AI Layer (`ToolDefinition`/`ToolCall`,
// Sprint 20) e o protocolo oficial de "function calling" do Ollama. Nenhuma
// função aqui conhece um `toolId` específico (nada de `if (toolId ===
// 'filesystem')`) — funciona para qualquer Tool registrada.

let toolCallSeq = 0;
/** Ids únicos para `ToolCall.id` — o Ollama não devolve um id por chamada (diferente da OpenAI). */
const nextToolCallId = () => `ollama-tool-call-${Date.now()}-${toolCallSeq++}`;

/**
 * `ToolDefinition[]` (Sprint 20) → `OllamaTool[]`, o formato exato que o
 * Ollama espera em `tools` no corpo de `/api/chat`. Usa `definition.id` como
 * `function.name` (não `definition.name`, que é só um rótulo de exibição) —
 * é o `id` que o `ToolManager`/`ToolRegistry` usam para endereçar a Tool, e é
 * o mesmo valor que o Ollama devolve em `tool_calls[].function.name` quando
 * decide chamá-la, o que fecha o ciclo em `toAIToolCalls()` abaixo.
 */
function toOllamaTools(definitions: readonly ToolDefinition[]): OllamaTool[] {
  return definitions.map((definition) => ({
    type: 'function',
    function: {
      name: definition.id,
      description: definition.description,
      parameters: definition.parameters,
    },
  }));
}

/**
 * `arguments` de um `tool_calls[].function` do Ollama pode chegar como um
 * objeto já desserializado (comportamento usual da API) ou, dependendo da
 * versão/modelo, como uma string JSON — trata os dois casos sem lançar: se
 * não for string, devolve como está; se for string, tenta `JSON.parse` e,
 * falhando (não é JSON válido), devolve a string original tal como veio.
 */
function parseToolArguments(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * `OllamaToolCall[]` (formato de arame, sem `id`) → `ToolCall[]` (contrato da
 * AI Layer, Sprint 15/20 — `id`/`toolId`/`input` obrigatórios). Devolve
 * `undefined` (não `[]`) quando não há Tool Calls, para que `execute()` omita
 * `AIResponse.toolCalls` inteiramente — o mesmo padrão que os Providers fake
 * usados nos testes de `AIManager`/`ToolManager`.
 */
function toAIToolCalls(calls: readonly OllamaToolCall[] | undefined): ToolCall[] | undefined {
  if (!calls || calls.length === 0) return undefined;
  return calls.map((call) => ({
    id: nextToolCallId(),
    toolId: call.function.name,
    input: parseToolArguments(call.function.arguments),
  }));
}
