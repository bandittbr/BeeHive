import type { Express } from 'express';
import { createConversationOrchestrator } from '../core/conversationOrchestrator';
import { sanitizeHistory, streamNdjsonResponse } from './shared';

export function mountConversationRoutes(
  app: Express,
  orchestrator: ReturnType<typeof createConversationOrchestrator>,
): void {
  app.post('/api/conversation/respond', async (req, res) => {
    const { message, history } = (req.body ?? {}) as {
      message?: { role?: string; content?: string };
      history?: unknown;
    };

    if (!message?.content || typeof message.content !== 'string') {
      res.status(400).json({ error: 'O campo message.content é obrigatório.' });
      return;
    }

    try {
      const reply = await orchestrator.respond(
        { role: 'user', content: String(message.content) },
        sanitizeHistory(history),
      );
      res.json({ messages: [reply] });
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'erro desconhecido';
      res.status(502).json({
        error: 'Não foi possível obter resposta da inteligência (Ollama).',
        detail,
      });
    }
  });

  app.post('/api/conversation/stream', async (req, res) => {
    const { message, history } = (req.body ?? {}) as {
      message?: { content?: string };
      history?: unknown;
    };

    if (!message?.content || typeof message.content !== 'string') {
      res.status(400).json({ error: 'O campo message.content é obrigatório.' });
      return;
    }

    await streamNdjsonResponse(res, (signal) =>
      orchestrator.respondStream(
        { role: 'user', content: String(message.content) },
        sanitizeHistory(history),
        signal,
      ),
    );
  });
}
