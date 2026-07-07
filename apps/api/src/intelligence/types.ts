/**
 * Abstração de Inteligência (a "porta" para qualquer cérebro de IA).
 *
 * O resto do sistema depende DESTE contrato, nunca de um provedor concreto.
 * Trocar Ollama por outro provedor é implementar `IntelligenceProvider` de
 * novo — sem tocar no Core nem na interface (Princípio P7).
 */

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

export interface IntelligenceProvider {
  /** Identificação legível do provedor (ex.: "ollama:llama3.2"). */
  readonly name: string;

  /** Recebe a conversa (incluindo system) e devolve o texto da resposta. */
  chat(messages: ChatTurn[]): Promise<string>;

  /** Versão em streaming: emite a resposta em pedaços (tokens). */
  chatStream(messages: ChatTurn[], signal?: AbortSignal): AsyncIterable<string>;
}
