import { config } from '../config';
import { runtime } from '../runtimeConfig';
import type { ChatTurn, IntelligenceProvider } from './types';

interface OllamaChatResponse {
  message?: { content?: string };
  error?: string;
}

/**
 * Adaptador do Ollama (provedor de inteligência local).
 *
 * Implementa o contrato `IntelligenceProvider` chamando a API local do Ollama.
 * É a ÚNICA parte do sistema que conhece o Ollama. O modelo é lido de
 * `runtime.model` a cada chamada, então trocá-lo (via Configurações) tem efeito
 * imediato, sem recriar o provedor.
 */
export function createOllamaProvider(): IntelligenceProvider {
  const { baseUrl } = config.ollama;

  return {
    get name() {
      return `ollama:${runtime.model}`;
    },

    async chat(messages: ChatTurn[]): Promise<string> {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: runtime.model, messages, stream: false, think: false }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Ollama respondeu ${response.status}. ${detail}`.trim());
      }

      const data = (await response.json()) as OllamaChatResponse;
      if (data.error) throw new Error(`Ollama: ${data.error}`);

      return (data.message?.content ?? '').trim();
    },

    async *chatStream(messages: ChatTurn[], signal?: AbortSignal): AsyncGenerator<string> {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({ model: runtime.model, messages, stream: true, think: false }),
      });

      if (!response.ok || !response.body) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Ollama respondeu ${response.status}. ${detail}`.trim());
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const chunk = JSON.parse(trimmed) as {
            message?: { content?: string };
            done?: boolean;
            error?: string;
          };
          if (chunk.error) throw new Error(`Ollama: ${chunk.error}`);
          if (chunk.message?.content) yield chunk.message.content;
          if (chunk.done) return;
        }
      }
    },
  };
}
