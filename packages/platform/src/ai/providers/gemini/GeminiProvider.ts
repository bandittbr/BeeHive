/**
 * GeminiProvider — provedor cloud de IA para a API do Google Gemini.
 *
 * Implementa o contrato `AIProvider` usando o Google AI Generative Language API.
 * Formato próprio: `contents` com `parts`, `generationConfig`, `tools` com
 * `functionDeclarations`.
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
} from '../../types';

export interface GeminiProviderOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly fetchImpl?: typeof fetch;
  readonly logger?: ILogger;
}

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.0-flash';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string } | { functionCall: { name: string; args: unknown } }>;
}

interface GeminiTool {
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: unknown;
  }>;
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
  tools?: GeminiTool[];
}

interface GeminiResponse {
  candidates?: Array<{
    content: {
      role: string;
      parts: Array<{ text: string } | { functionCall: { name: string; args: unknown } }>;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  error?: { message: string; code: number };
}

export class GeminiProvider extends BaseAIProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly capabilities: readonly AICapability[] = ['chat', 'streaming'];

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly fetchImpl: typeof fetch;
  private readonly logger?: ILogger;
  private lastHealth: AIProviderHealth = { ok: true };

  constructor(options: GeminiProviderOptions) {
    super();
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.defaultModel = options.model ?? DEFAULT_MODEL;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.logger = options.logger?.child('ai:gemini');
  }

  async execute(request: AIRequest, context: AIContext): Promise<AIResponse> {
    if (request.capability !== 'chat') {
      throw new Error(`GeminiProvider não suporta "${request.capability}" (só "chat").`);
    }

    const input = request.input as ChatInput;
    if (!input?.messages?.length) {
      throw new Error('GeminiProvider: "messages" é obrigatório.');
    }

    const model = request.options?.model ?? this.defaultModel;
    const contents = toGeminiContents(input.messages);
    const tools = request.tools?.length ? toGeminiTools(request.tools) : undefined;

    const body: GeminiRequest = {
      contents,
      ...(request.options?.temperature !== undefined || request.options?.maxTokens !== undefined
        ? {
            generationConfig: {
              ...(request.options?.temperature !== undefined ? { temperature: request.options.temperature } : {}),
              ...(request.options?.maxTokens !== undefined ? { maxOutputTokens: request.options.maxTokens } : {}),
            },
          }
        : {}),
      ...(tools ? { tools } : {}),
    };

    try {
      const data = await this.post<GeminiResponse>(
        `/models/${model}:generateContent?key=${this.apiKey}`,
        body,
        context.signal,
      );

      this.markHealthy();

      if (data.error) {
        throw new Error(`Gemini: ${data.error.message}`);
      }

      const candidate = data.candidates?.[0];
      const textParts = candidate?.content?.parts?.filter(
        (p): p is { text: string } => 'text' in p,
      ) ?? [];
      const content = textParts.map((p) => p.text).join('');

      const functionCallParts = candidate?.content?.parts?.filter(
        (p): p is { functionCall: { name: string; args: unknown } } => 'functionCall' in p,
      ) ?? [];

      const output: ChatOutput = { message: { role: 'assistant', content } };
      const response: AIResponse = {
        capability: 'chat',
        output,
        provider: this.id,
        model,
        usage: data.usageMetadata
          ? {
              promptTokens: data.usageMetadata.promptTokenCount,
              completionTokens: data.usageMetadata.candidatesTokenCount,
              totalTokens: data.usageMetadata.totalTokenCount,
            }
          : undefined,
        finishedAt: Date.now(),
        ...(functionCallParts.length
          ? {
              toolCalls: functionCallParts.map((fc) => ({
                id: `gemini-tool-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                toolId: fc.functionCall.name,
                input: fc.functionCall.args,
              })),
            }
          : {}),
      };

      return response;
    } catch (error) {
      this.markUnhealthy(error);
      throw error;
    }
  }

  async stream(request: AIRequest, handlers: AIStreamHandlers, context: AIContext): Promise<void> {
    if (request.capability !== 'chat') {
      throw new Error(`GeminiProvider não suporta streaming para "${request.capability}".`);
    }

    const input = request.input as ChatInput;
    if (!input?.messages?.length) {
      throw new Error('GeminiProvider: "messages" é obrigatório.');
    }

    const model = request.options?.model ?? this.defaultModel;
    const contents = toGeminiContents(input.messages);

    const body: GeminiRequest = {
      contents,
      ...(request.options?.temperature !== undefined
        ? { generationConfig: { temperature: request.options.temperature } }
        : {}),
    };

    let full = '';

    try {
      const response = await this.fetchImpl(
        `${this.baseUrl}/models/${model}:streamGenerateContent?key=${this.apiKey}&alt=sse`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: context.signal,
        },
      );

      if (!response.ok) {
        const error = await response.json() as GeminiResponse;
        throw new Error(`Gemini: ${error.error?.message ?? response.statusText}`);
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
          try {
            const event = JSON.parse(line.slice(6)) as GeminiResponse;
            const text = event.candidates?.[0]?.content?.parts
              ?.filter((p): p is { text: string } => 'text' in p)
              .map((p) => p.text)
              .join('') ?? '';
            if (text) {
              full += text;
              handlers.onDelta(text);
            }
          } catch {
            // ignora linhas malformadas
          }
        }
      }

      this.markHealthy();
      handlers.onDone?.({
        capability: 'chat',
        output: { message: { role: 'assistant', content: full.trim() } },
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

  private async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const error = await response.json() as GeminiResponse;
      throw new Error(`Gemini: ${error.error?.message ?? response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  private markHealthy(): void { this.lastHealth = { ok: true }; }
  private markUnhealthy(error: unknown): void {
    const detail = error instanceof Error ? error.message : 'erro desconhecido';
    this.lastHealth = { ok: false, detail };
    this.logger?.warn('GeminiProvider indisponível', { detail });
  }
}

// ── Utilitários ──────────────────────────────────────────────────────────

function toGeminiContents(messages: ChatInput['messages']): GeminiContent[] {
  const contents: GeminiContent[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      // Gemini usa `systemInstruction` em vez de mensagem system no contents.
      // Por simplicidade, prefixamos como user message com contexto.
      contents.push({ role: 'user', parts: [{ text: `[System Instruction] ${msg.content}` }] });
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
  }

  return contents;
}

function toGeminiTools(definitions: readonly ToolDefinition[]): GeminiTool[] {
  return [
    {
      functionDeclarations: definitions.map((def) => ({
        name: def.id,
        description: def.description,
        parameters: def.parameters,
      })),
    },
  ];
}

export function createGeminiProvider(options: GeminiProviderOptions): GeminiProvider {
  return new GeminiProvider(options);
}
