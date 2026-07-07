import type { ChatTurn, IntelligenceProvider } from '../intelligence/types';
import { SYSTEM_PROMPT } from './systemPrompt';

export interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantReply {
  role: 'assistant';
  content: string;
}

/**
 * Orquestrador da Conversa — a parte do Core responsável por conduzir um
 * pedido de conversa.
 *
 * Responsabilidade: montar o contexto (prompt de sistema + histórico + nova
 * mensagem) e pedir a resposta ao provedor de inteligência. NÃO conhece o
 * Ollama nem nenhum provedor concreto — recebe a abstração por injeção, o que
 * o torna testável e desacoplado (P6/P7).
 */
export function createConversationOrchestrator(provider: IntelligenceProvider) {
  return {
    async respond(
      userMessage: IncomingMessage,
      history: IncomingMessage[],
    ): Promise<AssistantReply> {
      const messages: ChatTurn[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: userMessage.role, content: userMessage.content },
      ];

      const content = await provider.chat(messages);
      return { role: 'assistant', content: content || '(sem resposta)' };
    },

    /** Versão em streaming: emite os pedaços da resposta conforme chegam. */
    async *respondStream(
      userMessage: IncomingMessage,
      history: IncomingMessage[],
      signal?: AbortSignal,
    ): AsyncGenerator<string> {
      const messages: ChatTurn[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: userMessage.role, content: userMessage.content },
      ];

      for await (const token of provider.chatStream(messages, signal)) {
        yield token;
      }
    },
  };
}
