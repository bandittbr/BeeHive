import type { Express } from 'express';
import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { RuntimeManager } from '@beehive/platform';

/**
 * Expõe o BeeHive Runtime por HTTP (consultas + comandos) e WebSocket
 * (eventos em tempo real) — a superfície que a Web (e futuros clientes,
 * Desktop) usam para falar com o Runtime hospedado neste processo.
 */
export function mountRuntimeHttpRoutes(app: Express, runtime: RuntimeManager): void {
  app.get('/api/runtime/status', (_req, res) => {
    res.json({ status: runtime.status });
  });

  app.get('/api/runtime/health', (_req, res) => {
    res.json(runtime.health());
  });

  app.get('/api/runtime/snapshot', (_req, res) => {
    res.json(runtime.snapshot());
  });

  app.get('/api/runtime/logs', (_req, res) => {
    res.json(runtime.logs());
  });

  // Despacha um Command no Kernel do Runtime (a mesma superfície que módulos
  // e a UI usam) — { type, payload } -> { result } | { error }.
  app.post('/api/runtime/command', async (req, res) => {
    const { type, payload } = (req.body ?? {}) as { type?: string; payload?: unknown };
    if (!type || typeof type !== 'string') {
      res.status(400).json({ error: 'O campo type é obrigatório.' });
      return;
    }
    if (runtime.status !== 'Running') {
      res.status(503).json({ error: `Runtime indisponível (status: ${runtime.status}).` });
      return;
    }
    try {
      const result = await runtime.context.kernel.dispatch({ type, payload });
      res.json({ result });
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'erro desconhecido';
      res.status(502).json({ error: detail });
    }
  });
}

/** Liga o WebSocket de eventos do Runtime ao servidor HTTP existente. */
export function attachRuntimeEventsSocket(httpServer: HttpServer, runtime: RuntimeManager): void {
  const wss = new WebSocketServer({ server: httpServer, path: '/api/runtime/events' });

  wss.on('connection', (socket: WebSocket) => {
    let unsubscribe: (() => void) | undefined;
    try {
      // Lança se o Runtime ainda não terminou o start() (ex.: subiu com falha).
      unsubscribe = runtime.context.kernel.context.events.onAny((event) => {
        if (socket.readyState === socket.OPEN) {
          socket.send(JSON.stringify(event));
        }
      });
    } catch {
      // Runtime indisponível — o socket segue aberto, mas sem eventos por ora.
    }
    socket.on('close', () => unsubscribe?.());
    socket.on('error', () => unsubscribe?.());
  });
}
