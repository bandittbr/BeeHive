import { Router, type Request, type Response } from 'express';

export function createRouter(): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', module: 'ai-manager', timestamp: new Date().toISOString() });
  });

  router.post('/complete', (req: Request, res: Response) => {
    const { model, messages, temperature, maxTokens } = req.body;
    res.json({
      content: `[AI Manager] Resposta simulada para modelo "${model || 'default'}"`,
      model: model || 'default',
      provider: 'fallback',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    });
  });

  router.get('/models', (_req: Request, res: Response) => {
    res.json({
      models: [
        { provider: 'openai', models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
        { provider: 'anthropic', models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'] },
        { provider: 'google', models: ['gemini-pro', 'gemini-ultra'] },
        { provider: 'ollama', models: ['llama3', 'mistral', 'codellama'] },
      ],
    });
  });

  return router;
}