/**
 * Testes do RuntimeClient — cliente de comunicação com o runtime remoto.
 *
 * Roda com Vitest + jsdom. Mocka fetch e WebSocket.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventName } from '@beehive/platform/browser';
import { RuntimeClient, getRuntimeClient } from './runtimeClient';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ndjsonBody(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line + '\n'));
      }
      controller.close();
    },
  });
}

function mockFetchOnce(response: Partial<Response>) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response as Response);
}

function mockFetchStream(...lines: string[]) {
  return mockFetchOnce({ ok: true, body: ndjsonBody(lines) } as Response);
}

function mockFetchError(status: number, body: Record<string, string> = {}) {
  return mockFetchOnce({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RuntimeClient', () => {
  let client: RuntimeClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new RuntimeClient();
  });

  describe('streamNdjson (via sendConversationMessage)', () => {
    it('emite onDelta para cada linha NDJSON type=delta', async () => {
      mockFetchStream(
        JSON.stringify({ type: 'delta', content: 'Olá' }),
        JSON.stringify({ type: 'delta', content: ', mundo!' }),
        JSON.stringify({ type: 'done' }),
      );

      const deltas: string[] = [];
      await client.sendConversationMessage(
        { role: 'user', content: 'oi' },
        [],
        { onDelta: (t) => deltas.push(t), onError: () => {} },
      );

      expect(deltas).toEqual(['Olá', ', mundo!']);
    });

    it('emite onError quando o servidor retorna erro NDJSON', async () => {
      mockFetchStream(JSON.stringify({ type: 'error', message: 'Provedor offline' }));

      const errors: string[] = [];
      await client.sendConversationMessage(
        { role: 'user', content: 'oi' },
        [],
        { onDelta: () => {}, onError: (m) => errors.push(m) },
      );

      expect(errors).toEqual(['Provedor offline']);
    });

    it('emite onError quando fetch falha (offline)', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('ECONNREFUSED'));

      const errors: string[] = [];
      await client.sendConversationMessage(
        { role: 'user', content: 'oi' },
        [],
        {
          onDelta: () => {},
          onError: (m) => errors.push(m),
        },
      );

      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('Verifique');
    });

    it('emite onError quando fetch retorna status 4xx/5xx', async () => {
      mockFetchError(502, { detail: 'Ollama fora do ar' });

      const errors: string[] = [];
      await client.sendConversationMessage(
        { role: 'user', content: 'oi' },
        [],
        { onDelta: () => {}, onError: (m) => errors.push(m) },
      );

      expect(errors.some((m) => m.includes('Ollama') || m.includes('502'))).toBe(true);
    });

    it('cancela com AbortSignal — não chama handlers', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new DOMException('AbortError', 'AbortError'));

      const controller = new AbortController();
      controller.abort();

      const deltas: string[] = [];
      const errors: string[] = [];
      // O fetch rejeita com AbortError — o streamNdjson deve capturar e retornar sem erro
      await client.sendConversationMessage(
        { role: 'user', content: 'oi' },
        [],
        { onDelta: (t) => deltas.push(t), onError: (m) => errors.push(m) },
        controller.signal,
      );

      expect(deltas).toEqual([]);
      expect(errors).toEqual([]);
    });
  });

  describe('dispatch', () => {
    it('envia comando POST e retorna o resultado', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: { reply: 'ok' } }),
      } as Response);

      const result = await client.dispatch<{ reply: string }>({
        type: 'conversation.sendMessage',
        payload: { text: 'oi' },
      });

      expect(result).toEqual({ reply: 'ok' });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/runtime/command',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('conversation.sendMessage'),
        }),
      );
    });

    it('lança erro quando o servidor responde com erro', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Falha interna' }),
      } as Response);

      await expect(
        client.dispatch({ type: 'comando.teste', payload: {} }),
      ).rejects.toThrow(/Falha interna|comando.teste/);
    });
  });

  describe('on / unsubscribe', () => {
    it('registra handler e o remove no unsubscribe', () => {
      const handler = vi.fn();
      const unsub = client.on('MessageReceived' as EventName, handler);

      // O WebSocket não está realmente conectado (mock), mas o handler
      // foi registrado no Map — podemos verificar disparando internamente
      expect(handler).not.toHaveBeenCalled();

      unsub();
      // O Map não deve mais conter este handler
    });

    it('remove entrada do Map quando o último handler é removido', () => {
      const handler = vi.fn();
      const unsub = client.on('MessageReceived' as EventName, handler);
      unsub();

      // O Map pode ser acessado via reflect nos internals do cliente
      const handlers = (client as unknown as { handlers: Map<string, Set<unknown>> }).handlers;
      expect(handlers.has('MessageReceived')).toBe(false);
    });
  });

  describe('getRuntimeClient (singleton)', () => {
    it('retorna sempre a mesma instância', () => {
      const a = getRuntimeClient();
      const b = getRuntimeClient();
      expect(a).toBe(b);
    });
  });
});
