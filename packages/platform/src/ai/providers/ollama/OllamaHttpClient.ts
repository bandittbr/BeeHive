import type {
  OllamaChatRequestBody,
  OllamaChatResponseBody,
  OllamaChatStreamChunk,
  OllamaChatStreamRequestBody,
  OllamaShowResponse,
  OllamaTagsResponse,
} from './types';

export interface OllamaHttpClientOptions {
  /** Base do servidor Ollama (ex.: http://localhost:11434). */
  baseUrl: string;
  /** Injeção do `fetch` — permite testar sem rede real (P6/P9 de testabilidade). */
  fetchImpl?: typeof fetch;
}

/**
 * Cliente HTTP interno do Ollama.
 *
 * ÚNICO ponto do sistema que conhece os endpoints do Ollama
 * (`/api/tags`, `/api/chat`, `/api/show`). Nada fora de `OllamaProvider` deve
 * instanciar ou conhecer esta classe — ela não é exportada pelo pacote.
 */
export class OllamaHttpClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OllamaHttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /** GET /api/tags — modelos instalados. */
  listTags(signal?: AbortSignal): Promise<OllamaTagsResponse> {
    return this.request<OllamaTagsResponse>('/api/tags', { method: 'GET', signal });
  }

  /** POST /api/chat (stream: false) — uma resposta completa. */
  chat(body: OllamaChatRequestBody, signal?: AbortSignal): Promise<OllamaChatResponseBody> {
    return this.request<OllamaChatResponseBody>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(body),
      signal,
    });
  }

  /** POST /api/show — detalhes de um modelo específico. */
  show(model: string, signal?: AbortSignal): Promise<OllamaShowResponse> {
    return this.request<OllamaShowResponse>('/api/show', {
      method: 'POST',
      body: JSON.stringify({ model }),
      signal,
    });
  }

  /**
   * POST /api/chat (stream: true) — um pedaço por linha (NDJSON), até
   * `done: true` na última. Mesmo tratamento de erro de conexão que
   * `request()` (mensagem amigável, `AbortError` preservado) — só a leitura
   * do corpo é diferente (chunked, não `response.json()` de uma vez).
   */
  async *chatStream(
    body: OllamaChatStreamRequestBody,
    signal?: AbortSignal,
  ): AsyncGenerator<OllamaChatStreamChunk> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      const detail = error instanceof Error ? error.message : 'erro desconhecido';
      throw new Error(`Não foi possível conectar ao Ollama em ${this.baseUrl}. ${detail}`);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Ollama respondeu ${response.status} em /api/chat. ${detail}`.trim());
    }
    if (!response.body) {
      throw new Error('Ollama respondeu sem corpo de streaming em /api/chat.');
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
          if (!trimmed) continue;
          const chunk = JSON.parse(trimmed) as OllamaChatStreamChunk;
          yield chunk;
          if (chunk.done) return;
        }
      }
    } finally {
      // Libera o leitor sempre — cancelamento (AbortError), erro de parsing
      // ou término normal não podem deixar o stream preso (sem vazamento).
      reader.releaseLock();
    }
  }

  private async request<T>(
    path: string,
    init: { method: string; body?: string; signal?: AbortSignal },
  ): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: init.method,
        headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
        body: init.body,
        signal: init.signal,
      });
    } catch (error) {
      // Cancelamento/timeout (AbortController) não é falha de rede — repassa
      // como está, para quem chamou distinguir "abortado" de "Ollama offline".
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      // Ollama fora do ar / porta fechada / DNS — falha de rede, não de protocolo.
      const detail = error instanceof Error ? error.message : 'erro desconhecido';
      throw new Error(`Não foi possível conectar ao Ollama em ${this.baseUrl}. ${detail}`);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Ollama respondeu ${response.status} em ${path}. ${detail}`.trim());
    }

    return (await response.json()) as T;
  }
}
