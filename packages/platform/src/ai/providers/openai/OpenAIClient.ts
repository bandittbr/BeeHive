/**
 * Cliente HTTP para a API de Chat Completions da OpenAI (e compatíveis).
 *
 * ÚNICO ponto do sistema que conhece o endpoint `/chat/completions` da OpenAI.
 * Nada fora de `OpenAIProvider` deve instanciar ou conhecer esta classe — ela
 * não é exportada pelo pacote (apenas tipos de entrada/saída via o barrel).
 */

import type {
  OpenAIChatRequest,
  OpenAIChatResponse,
  OpenAIChatStreamChunk,
} from './types';

export interface OpenAIClientOptions {
  /** Base URL da API (ex.: https://api.openai.com/v1). */
  baseUrl: string;
  /** Chave da API (Bearer token). */
  apiKey: string;
  /** Injeção do `fetch` para testes. */
  fetchImpl?: typeof fetch;
}

/**
 * Cliente HTTP mínimo para a API de Chat Completions da OpenAI.
 *
 * Suporta qualquer endpoint compatível (OpenAI oficial, OpenRouter, Groq,
 * Together, Azure, etc.) — basta configurar `baseUrl` e `apiKey`.
 */
export class OpenAIClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenAIClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /** POST /chat/completions (stream: false) — resposta completa. */
  async chat(body: OpenAIChatRequest, signal?: AbortSignal): Promise<OpenAIChatResponse> {
    return this.request<OpenAIChatResponse>('/chat/completions', {
      method: 'POST',
      headers: this.defaultHeaders(),
      body: JSON.stringify(body),
      signal,
    });
  }

  /**
   * POST /chat/completions (stream: true) — SSE de chunks.
   * Cada chunk é um objeto JSON após "data: ".
   * O fluxo termina com "data: [DONE]".
   */
  async *chatStream(
    body: Omit<OpenAIChatRequest, 'stream'> & { stream: true },
    signal?: AbortSignal,
  ): AsyncGenerator<OpenAIChatStreamChunk> {
    const response = await this.fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.defaultHeaders(),
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`API respondeu ${response.status} em /chat/completions. ${detail}`.trim());
    }
    if (!response.body) {
      throw new Error('API respondeu sem corpo de streaming em /chat/completions.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          const chunk = JSON.parse(trimmed.slice(6)) as OpenAIChatStreamChunk;
          yield chunk;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async request<T>(
    path: string,
    init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal },
  ): Promise<T> {
    const response = await this.fetch(`${this.baseUrl}${path}`, init);

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`API respondeu ${response.status} em ${path}. ${detail}`.trim());
    }

    return (await response.json()) as T;
  }

  private defaultHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  private async fetch(url: string, init: RequestInit): Promise<Response> {
    try {
      return await this.fetchImpl(url, init);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      const detail = error instanceof Error ? error.message : 'erro desconhecido';
      throw new Error(`Não foi possível conectar à API em ${this.baseUrl}. ${detail}`);
    }
  }
}
