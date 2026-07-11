import type { Response } from 'express';
import type { IncomingMessage } from '../core/conversationOrchestrator';

/** Sanitiza entrada de histórico — garante array de {role, content} válidos. */
export function sanitizeHistory(history: unknown): IncomingMessage[] {
  if (!Array.isArray(history)) return [];

  return history.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];

    const candidate = entry as Partial<IncomingMessage> & { role?: unknown; content?: unknown };
    if ((candidate.role !== 'user' && candidate.role !== 'assistant') || typeof candidate.content !== 'string') {
      return [];
    }

    return [{ role: candidate.role, content: candidate.content }];
  });
}

/** Sanitiza string de entrada — remove nulos, limita tamanho, devolve string limpa ou undefined. */
export function sanitizeString(value: unknown, maxLength = 5000): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\0/g, '').trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, maxLength);
}

/** Prende o cancelamento da resposta HTTP ao `close` do cliente. */
export function attachStreamAbort(res: Response, controller: AbortController): void {
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });
}

/** Escreve uma linha NDJSON na resposta. */
export function writeNdjson(res: Response, payload: Record<string, unknown>): void {
  res.write(`${JSON.stringify(payload)}\n`);
}

/**
 * Helper unificado para respostas em streaming NDJSON.
 *
 * Configura headers, liga abort no close do cliente, itera o generator,
 * escreve eventos `delta`/`done`/`error` e encerra a resposta.
 *
 * Uso típico:
 *   await streamNdjsonResponse(res, (signal) => provider.chatStream(messages, signal));
 */
export async function streamNdjsonResponse(
  res: Response,
  generate: (signal: AbortSignal) => AsyncIterable<string>,
): Promise<void> {
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders();

  const controller = new AbortController();
  attachStreamAbort(res, controller);

  try {
    for await (const token of generate(controller.signal)) {
      writeNdjson(res, { type: 'delta', content: token });
    }
    writeNdjson(res, { type: 'done' });
  } catch (err) {
    if (!controller.signal.aborted) {
      const detail = err instanceof Error ? err.message : 'erro desconhecido';
      writeNdjson(res, { type: 'error', message: detail });
    }
  } finally {
    res.end();
  }
}
