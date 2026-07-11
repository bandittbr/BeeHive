/**
 * OpenAIProvider — provedor cloud de IA compatível com a API de Chat Completions
 * da OpenAI (OpenAI oficial, OpenRouter, Groq, Together, Azure, etc.).
 *
 * Implementa o contrato `AIProvider` (Sprint 6) chamando a API de Chat
 * Completions através do `OpenAIClient`. Suporta as capacidades `chat` e
 * `streaming` (via `stream`), além de Tool Calling (Sprint 21).
 *
 * Configuração (baseUrl/apiKey/model) é sempre injetada — o provedor nunca lê
 * variáveis de ambiente diretamente (P7).
 */

import type { ILogger } from '../../../kernel';
import type { ToolDefinition } from '../../../tools/types';
import { BaseAIProvider } from '../../BaseAIProvider';
import { OpenAIClient } from './OpenAIClient';
import type {
  OpenAIChatMessage,
  OpenAITool,
} from './types';
import type {
  AICapability,
  AIContext,
  AIProviderHealth,
  AIRequest,
  AIResponse,
  AIStreamHandlers,
  ChatInput,
  ChatOutput,
  ToolCall,
  ToolCallResult,
} from '../../types';

export interface OpenAIProviderOptions {
  /** Base URL (ex.: https://api.openai.com/v1). */
  baseUrl: string;
  /** Chave da API. */
  apiKey: string;
  /** Modelo padrão (ex.: gpt-4o-mini). */
  model?: string;
  /** Nome amigável do provedor. */
  providerName?: string;
  /** Injeção do `fetch` (testes). */
  fetchImpl?: typeof fetch;
  logger?: ILogger;
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * OpenAIProvider — provedor cloud de IA.
 *
 * Funciona com qualquer endpoint compatível com a API de Chat Completions
 * da OpenAI. Tool Calling (Sprint 21) segue o formato oficial de function
 * calling da OpenAI, reconhecido pela maioria dos provedores (OpenRouter,
 * Groq, Together, etc.).
 */
export class OpenAIProvider extends BaseAIProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';
  readonly capabilities: readonly AICapability[] = ['chat'];

  private readonly client: OpenAIClient;
  private readonly defaultModel: string;
  private readonly providerName: string;
  private readonly logger?: ILogger;
  private lastHealth: AIProviderHealth = { ok: true };

  constructor(options: OpenAIProviderOptions) {
    super();
    this.client = new OpenAIClient({
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      apiKey: options.apiKey,
      fetchImpl: options.fetchImpl,
    });
    this.defaultModel = options.model ?? DEFAULT_MODEL;
    this.providerName = options.providerName ?? 'openai';
    this.logger = options.logger?.child('ai:openai');
  }

  get displayName(): string {
    return `${this.providerName}:${this.defaultModel}`;
  }

  async execute(request: AIRequest, context: AIContext): Promise<AIResponse> {
    if (request.capability !== 'chat') {
      throw new Error(
        `OpenAIProvider não suporta a capacidade "${request.capability}" (só "chat" nesta sprint).`,
      );
    }

    const input = request.input as ChatInput;
    if (!input?.messages?.length) {
      throw new Error('OpenAIProvider: "messages" é obrigatório para a capacidade chat.');
    }

    const model = request.options?.model ?? this.defaultModel;
    const messages = input.messages.map(toOpenAIMessage);
    const tools = request.tools?.length ? toOpenAITools(request.tools) : undefined;

    const body = {
      model,
      messages,
      stream: false as const,
      temperature: request.options?.temperature,
      max_tokens: request.options?.maxTokens,
      ...(tools ? { tools } : {}),
    };

    try {
      const data = await this.client.chat(body, context.signal);

      this.markHealthy();

      if (data.error) {
        throw new Error(`OpenAI: ${data.error.message}`);
      }

      const choice = data.choices?.[0];
      const content = choice?.message?.content ?? '';
      const toolCalls = choice?.message?.tool_calls;

      const output: ChatOutput = { message: { role: 'assistant', content } };
      const response: AIResponse = {
        capability: 'chat',
        output,
        provider: this.id,
        model: data.model ?? model,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
        finishedAt: Date.now(),
        ...(toolCalls?.length ? { toolCalls: toAIToolCalls(toolCalls) } : {}),
      };

      return response;
    } catch (error) {
      this.markUnhealthy(error);
      throw error;
    }
  }

  async continueConversation(
    request: AIRequest,
    response: AIResponse,
    toolResults: readonly ToolCallResult[],
    context: AIContext,
  ): Promise<AIResponse> {
    if (request.capability !== 'chat') {
      throw new Error(
        `OpenAIProvider não suporta continueConversation para a capacidade "${request.capability}" (só "chat" nesta sprint).`,
      );
    }
    if (toolResults.length === 0) {
      throw new Error('OpenAIProvider: continueConversation requer ao menos um ToolCallResult.');
    }

    const input = request.input as ChatInput;
    const model = request.options?.model ?? this.defaultModel;

    // Reconstrói as mensagens: histórico original + message do assistant (com tool_calls)
    // + mensagens tool com resultados
    const assistantToolCalls = response.toolCalls?.map((call) => ({
      id: call.id,
      type: 'function' as const,
      function: {
        name: call.toolId,
        arguments: typeof call.input === 'string' ? call.input : JSON.stringify(call.input),
      },
    }));

    const messages: OpenAIChatMessage[] = [
      ...input.messages.map(toOpenAIMessage),
      {
        role: 'assistant',
        content: (response.output as ChatOutput)?.message?.content ?? '',
        ...(assistantToolCalls?.length ? { tool_calls: assistantToolCalls } : {}),
      },
      ...toolResults.map((result): OpenAIChatMessage => ({
        role: 'tool',
        tool_call_id: result.call.id,
        content: toolResultContent(result),
      })),
    ];

    const body = {
      model,
      messages,
      stream: false as const,
    };

    try {
      const data = await this.client.chat(body, context.signal);
      this.markHealthy();

      if (data.error) {
        throw new Error(`OpenAI: ${data.error.message}`);
      }

      const content = data.choices?.[0]?.message?.content ?? '';
      const output: ChatOutput = { message: { role: 'assistant', content } };

      return {
        capability: 'chat',
        output,
        provider: this.id,
        model: data.model ?? model,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
        finishedAt: Date.now(),
      };
    } catch (error) {
      this.markUnhealthy(error);
      throw error;
    }
  }

  async stream(request: AIRequest, handlers: AIStreamHandlers, context: AIContext): Promise<void> {
    if (request.capability !== 'chat') {
      throw new Error(
        `OpenAIProvider não suporta streaming para a capacidade "${request.capability}" (só "chat" nesta sprint).`,
      );
    }

    const input = request.input as ChatInput;
    if (!input?.messages?.length) {
      throw new Error('OpenAIProvider: "messages" é obrigatório para a capacidade chat.');
    }

    const model = request.options?.model ?? this.defaultModel;
    const messages = input.messages.map(toOpenAIMessage);

    const body = {
      model,
      messages,
      stream: true as const,
    };

    let full = '';

    try {
      for await (const chunk of this.client.chatStream(body, context.signal)) {
        const delta = chunk.choices?.[0]?.delta?.content ?? '';
        if (delta) full += delta;
        handlers.onDelta(delta);
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

  health(): AIProviderHealth {
    return this.lastHealth;
  }

  async checkHealth(): Promise<AIProviderHealth> {
    try {
      // Teste simples: lista modelos via GET /models
      await this.client.chat({
        model: this.defaultModel,
        messages: [{ role: 'user', content: 'ping' }],
        stream: false,
        max_tokens: 1,
      });
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
    this.logger?.warn('OpenAIProvider indisponível', { detail });
  }
}

/** Fábrica — mesmo padrão do OllamaProvider. */
export function createOpenAIProvider(options: OpenAIProviderOptions): OpenAIProvider {
  return new OpenAIProvider(options);
}

// ------------------------- Utilitários de tradução -------------------------

/** Converte ChatMessage (contrato AI Layer) para OpenAIChatMessage. */
function toOpenAIMessage(msg: ChatInput['messages'][number]): OpenAIChatMessage {
  return { role: msg.role, content: msg.content };
}

/** Converte ToolDefinition[] para OpenAITool[]. */
function toOpenAITools(definitions: readonly ToolDefinition[]): OpenAITool[] {
  return definitions.map((def) => ({
    type: 'function',
    function: {
      name: def.id,
      description: def.description,
      parameters: def.parameters,
    },
  }));
}

/** Converte OpenAIToolCall[] (da resposta) para ToolCall[] (contrato AI Layer). */
function toAIToolCalls(calls: OpenAIProviderToolCall[]): ToolCall[] {
  return calls.map((call) => ({
    id: call.id,
    toolId: call.function.name,
    input: parseToolArguments(call.function.arguments),
  }));
}

/** Tipo auxiliar para tool_calls na resposta da API. */
interface OpenAIProviderToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

/** Faz parse do arguments (sempre string JSON na API OpenAI). */
function parseToolArguments(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** Serializa ToolCallResult para content de mensagem role: 'tool'. */
function toolResultContent(result: ToolCallResult): string {
  return JSON.stringify({
    callId: result.call.id,
    toolId: result.call.toolId,
    status: result.status,
    output: result.output,
    error: result.error,
  });
}
