/**
 * AnthropicProvider — provedor cloud de IA para a API da Anthropic (Claude).
 *
 * Implementa o contrato `AIProvider` usando o Messages API da Anthropic.
 * Formato diferente da OpenAI: header `x-api-key`, body com `system` separado,
 * role `tool` com `tool_use_id`.
 *
 * Modelos suportados: Claude Sonnet, Opus, Haiku.
 */
import type { ILogger } from '../../../kernel';
import type { ToolDefinition } from '../../../tools/types';
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
  ToolCall,
  ToolCallResult,
} from '../../types';

export interface AnthropicProviderOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly fetchImpl?: typeof fetch;
  readonly logger?: ILogger;
}

const DEFAULT_BASE_URL = 'https://api.anthropic.com';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const API_VERSION = '2023-06-01';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: string;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  system?: string;
  stream?: boolean;
  temperature?: number;
  tools?: AnthropicTool[];
}

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: unknown;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicErrorResponse {
  type: string;
  error: {
    type: string;
    message: string;
  };
}

export class AnthropicProvider extends BaseAIProvider {
  readonly id = 'anthropic';
  readonly name = 'Anthropic';
  readonly capabilities: readonly AICapability[] = ['chat', 'streaming', 'tools'];

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly fetchImpl: typeof fetch;
  private readonly logger?: ILogger;
  private lastHealth: AIProviderHealth = { ok: true };

  constructor(options: AnthropicProviderOptions) {
    super();
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.defaultModel = options.model ?? DEFAULT_MODEL;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.logger = options.logger?.child('ai:anthropic');
  }

  async execute(request: AIRequest, context: AIContext): Promise<AIResponse> {
    if (request.capability !== 'chat') {
      throw new Error(`AnthropicProvider não suporta "${request.capability}" (só "chat").`);
    }

    const input = request.input as ChatInput;
    if (!input?.messages?.length) {
      throw new Error('AnthropicProvider: "messages" é obrigatório.');
    }

    const model = request.options?.model ?? this.defaultModel;
    const { system, messages } = splitSystemMessages(input.messages);
    const tools = request.tools?.length ? toAnthropicTools(request.tools) : undefined;

    const body: AnthropicRequest = {
      model,
      max_tokens: request.options?.maxTokens ?? 4096,
      messages: messages.map(toAnthropicMessage),
      ...(system ? { system } : {}),
      ...(request.options?.temperature !== undefined ? { temperature: request.options.temperature } : {}),
      ...(tools ? { tools } : {}),
    };

    try {
      const data = await this.post<AnthropicResponse>('/v1/messages', body, context.signal);
      this.markHealthy();

      const textBlocks = data.content.filter((b) => b.type === 'text');
      const content = textBlocks.map((b) => b.text ?? '').join('');
      const toolUseBlocks = data.content.filter((b) => b.type === 'tool_use');

      const output: ChatOutput = { message: { role: 'assistant', content } };
      const response: AIResponse = {
        capability: 'chat',
        output,
        provider: this.id,
        model: data.model ?? model,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
        finishedAt: Date.now(),
        ...(toolUseBlocks.length ? { toolCalls: toAIToolCalls(toolUseBlocks) } : {}),
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
    if (toolResults.length === 0) {
      throw new Error('AnthropicProvider: continueConversation requer ToolCallResults.');
    }

    const input = request.input as ChatInput;
    const model = request.options?.model ?? this.defaultModel;
    const { system, messages } = splitSystemMessages(input.messages);

    // Reconstrói: histórico + assistant (com tool_use) + tool_results
    const assistantContent: AnthropicContentBlock[] = [
      { type: 'text', text: (response.output as ChatOutput)?.message?.content ?? '' },
      ...(response.toolCalls?.map((call) => ({
        type: 'tool_use' as const,
        id: call.id,
        name: call.toolId,
        input: typeof call.input === 'string' ? JSON.parse(call.input) : call.input,
      })) ?? []),
    ];

    const toolResultContent: AnthropicContentBlock[] = toolResults.map((result) => ({
      type: 'tool_result' as const,
      tool_use_id: result.call.id,
      content: JSON.stringify({
        callId: result.call.id,
        toolId: result.call.toolId,
        status: result.status,
        output: result.output,
        error: result.error,
      }),
    }));

    const allMessages: AnthropicMessage[] = [
      ...messages.map(toAnthropicMessage),
      { role: 'assistant', content: assistantContent },
      { role: 'user', content: toolResultContent },
    ];

    const body: AnthropicRequest = {
      model,
      max_tokens: request.options?.maxTokens ?? 4096,
      messages: allMessages,
      ...(system ? { system } : {}),
    };

    try {
      const data = await this.post<AnthropicResponse>('/v1/messages', body, context.signal);
      this.markHealthy();

      const textBlocks = data.content.filter((b) => b.type === 'text');
      const content = textBlocks.map((b) => b.text ?? '').join('');

      return {
        capability: 'chat',
        output: { message: { role: 'assistant', content } },
        provider: this.id,
        model: data.model ?? model,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
        finishedAt: Date.now(),
      };
    } catch (error) {
      this.markUnhealthy(error);
      throw error;
    }
  }

  async stream(request: AIRequest, handlers: AIStreamHandlers, context: AIContext): Promise<void> {
    if (request.capability !== 'chat') {
      throw new Error(`AnthropicProvider não suporta streaming para "${request.capability}".`);
    }

    const input = request.input as ChatInput;
    if (!input?.messages?.length) {
      throw new Error('AnthropicProvider: "messages" é obrigatório.');
    }

    const model = request.options?.model ?? this.defaultModel;
    const { system, messages } = splitSystemMessages(input.messages);

    const body: AnthropicRequest = {
      model,
      max_tokens: request.options?.maxTokens ?? 4096,
      messages: messages.map(toAnthropicMessage),
      stream: true,
      ...(system ? { system } : {}),
    };

    let full = '';

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': API_VERSION,
        },
        body: JSON.stringify(body),
        signal: context.signal,
      });

      if (!response.ok) {
        const error = await response.json() as AnthropicErrorResponse;
        throw new Error(`Anthropic: ${error.error?.message ?? response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Streaming não disponível');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const event = JSON.parse(data);
            if (event.type === 'content_block_delta' && event.delta?.text) {
              full += event.delta.text;
              handlers.onDelta(event.delta.text);
            }
          } catch {
            // ignora linhas malformadas
          }
        }
      }

      this.markHealthy();
      const output: ChatOutput = { message: { role: 'assistant', content: full.trim() } };
      handlers.onDone?.({
        capability: 'chat',
        output,
        provider: this.id,
        model,
        finishedAt: Date.now(),
      });
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
      await this.post('/v1/messages', {
        model: this.defaultModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      });
      this.markHealthy();
    } catch (error) {
      this.markUnhealthy(error);
    }
    return this.lastHealth;
  }

  private async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const error = await response.json() as AnthropicErrorResponse;
      throw new Error(`Anthropic: ${error.error?.message ?? response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  private markHealthy(): void { this.lastHealth = { ok: true }; }
  private markUnhealthy(error: unknown): void {
    const detail = error instanceof Error ? error.message : 'erro desconhecido';
    this.lastHealth = { ok: false, detail };
    this.logger?.warn('AnthropicProvider indisponível', { detail });
  }
}

// ── Utilitários ──────────────────────────────────────────────────────────

function splitSystemMessages(messages: ChatInput['messages']): { system?: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> } {
  const systemParts: string[] = [];
  const rest: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemParts.push(msg.content);
    } else {
      rest.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
    }
  }

  return {
    system: systemParts.length ? systemParts.join('\n\n') : undefined,
    messages: rest,
  };
}

function toAnthropicMessage(msg: { role: string; content: string }): AnthropicMessage {
  return { role: msg.role as 'user' | 'assistant', content: msg.content };
}

function toAnthropicTools(definitions: readonly ToolDefinition[]): AnthropicTool[] {
  return definitions.map((def) => ({
    name: def.id,
    description: def.description,
    input_schema: def.parameters,
  }));
}

function toAIToolCalls(blocks: AnthropicContentBlock[]): ToolCall[] {
  return blocks.map((block) => ({
    id: block.id ?? `anthropic-tool-${Date.now()}`,
    toolId: block.name ?? '',
    input: block.input ?? {},
  }));
}

export function createAnthropicProvider(options: AnthropicProviderOptions): AnthropicProvider {
  return new AnthropicProvider(options);
}
