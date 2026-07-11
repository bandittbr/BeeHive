/**
 * Provedor OpenAI (e compatíveis: OpenRouter, Azure, etc.).
 *
 * Implementa o contrato `IntelligenceProvider` (legado) chamando a API de Chat
 * Completion da OpenAI (ou qualquer endpoint compatível — OpenRouter, Together,
 * etc.). É a ÚNICA parte do sistema que conhece a API OpenAI.
 *
 * Suporta:
 *  - OpenAI oficial (api.openai.com)
 *  - OpenRouter (openrouter.ai/api/v1)
 *  - Qualquer endpoint compatível com a API de Chat da OpenAI
 *
 * Uso:
 *   const provider = createOpenAIProvider({
 *     apiKey: process.env.OPENAI_API_KEY,
 *     baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
 *     model: 'gpt-4o-mini',
 *   });
 */

import { config } from '../config';
import type { ChatTurn, IntelligenceProvider } from './types';

interface ChatCompletionMessage {
  role: string;
  content: string;
}

interface ChatCompletionChunk {
  choices?: Array<{
    delta?: { content?: string; role?: string };
    finish_reason?: string | null;
  }>;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: ChatCompletionMessage;
    finish_reason?: string;
  }>;
  error?: { message: string };
}

export interface OpenAIProviderOptions {
  /** Chave da API. */
  apiKey: string;
  /** Base URL (padrão: https://api.openai.com/v1). */
  baseUrl?: string;
  /** Modelo padrão. */
  model?: string;
  /** Nome do provedor para exibição. */
  providerName?: string;
}

/**
 * Cria um provedor de IA compatível com a API de Chat da OpenAI.
 *
 * Aceita qualquer endpoint compatível (OpenAI oficial, OpenRouter, Together,
 * Azure, etc.) — basta configurar `baseUrl` e `apiKey`.
 */
export function createOpenAIProvider(options?: Partial<OpenAIProviderOptions>): IntelligenceProvider {
  const {
    apiKey = config.openai.apiKey,
    baseUrl = config.openai.baseUrl,
    model = config.openai.model,
    providerName = config.openai.providerName,
  } = options ?? {};

  const base = baseUrl.replace(/\/+$/, '');
  const chatUrl = `${base}/chat/completions`;
  const defaultModel = model;

  return {
    get name() {
      return `${providerName}:${defaultModel}`;
    },

    async chat(messages: ChatTurn[]): Promise<string> {
      const body = {
        model: defaultModel,
        messages,
        stream: false,
      };

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`API respondeu ${response.status}. ${detail}`.trim());
      }

      const data = (await response.json()) as ChatCompletionResponse;

      if (data.error) {
        throw new Error(`API: ${data.error.message}`);
      }

      return (data.choices?.[0]?.message?.content ?? '').trim();
    },

    async *chatStream(messages: ChatTurn[], signal?: AbortSignal): AsyncGenerator<string> {
      const body = {
        model: defaultModel,
        messages,
        stream: true,
      };

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok || !response.body) {
        const detail = await response.text().catch(() => '');
        throw new Error(`API respondeu ${response.status}. ${detail}`.trim());
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

            // Ignora linhas vazias e o marcador [DONE]
            if (!trimmed || trimmed === 'data: [DONE]') continue;

            // SSE: espera linhas começando com "data: "
            if (!trimmed.startsWith('data: ')) continue;

            try {
              const data = JSON.parse(trimmed.slice(6)) as ChatCompletionChunk;
              const delta = data.choices?.[0]?.delta?.content ?? '';

              if (delta) yield delta;
            } catch {
              // Ignora linhas mal formatadas (ex.: keep-alive)
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
}
