/**
 * AI Router Service — roteador de IA para o módulo Afiliados.
 *
 * Inspirado no AchadosPro: tenta múltiplos providers em ordem de prioridade
 * com fallback automático. Estratégia:
 *   1. Gemini 1.5 Flash (Google) — prioridade 1
 *   2. Groq (llama-3.1-8b-instant) — prioridade 2
 *   3. Fallback demo — retorna placeholder quando nenhum provider configurado
 */

import type { AITextProvider } from '@beehive/platform';

// ─── Gemini Provider ───────────────────────────────────────────────

function createGeminiProvider(apiKey: string): AITextProvider {
  return {
    name: 'gemini',
    priority: 1,
    isConfigured: () => !!apiKey,
    generateText: async (prompt: string): Promise<string> => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini: resposta vazia');
      return text;
    },
  };
}

// ─── Groq Provider ─────────────────────────────────────────────────

function createGroqProvider(apiKey: string): AITextProvider {
  return {
    name: 'groq',
    priority: 2,
    isConfigured: () => !!apiKey,
    generateText: async (prompt: string): Promise<string> => {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('Groq: resposta vazia');
      return text;
    },
  };
}

// ─── Demo Fallback Provider ────────────────────────────────────────

function createDemoProvider(): AITextProvider {
  return {
    name: 'demo',
    priority: 99,
    isConfigured: () => true,
    generateText: async (_prompt: string): Promise<string> => {
      // Retorna um placeholder realista para demonstração
      return JSON.stringify({
        caption: '🔥 Oferta imperdível! Confira este produto incrível com o melhor preço do mercado. Aproveite antes que acabe!',
        hashtags: ['oferta', 'promocao', 'desconto', 'imperdivel', 'compreagora'],
        mediaType: 'imagem',
      });
    },
  };
}

// ─── AI Router ─────────────────────────────────────────────────────

export interface AIRouterResult {
  text: string;
  provider: string;
}

export class AIRouter {
  private providers: AITextProvider[] = [];

  constructor(geminiKey?: string, groqKey?: string) {
    const providers: AITextProvider[] = [];

    if (geminiKey) {
      providers.push(createGeminiProvider(geminiKey));
    }
    if (groqKey) {
      providers.push(createGroqProvider(groqKey));
    }

    // Sempre adiciona o demo como fallback final
    providers.push(createDemoProvider());

    // Ordena por prioridade (menor = primeiro)
    this.providers = providers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Gera texto usando o primeiro provider disponível.
   * Faz fallback automático em caso de erro.
   */
  async generateText(prompt: string): Promise<AIRouterResult> {
    const errors: string[] = [];

    for (const provider of this.providers) {
      if (!provider.isConfigured()) {
        errors.push(`${provider.name}: não configurado`);
        continue;
      }

      try {
        const text = await provider.generateText(prompt);
        return { text, provider: provider.name };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${provider.name}: ${message}`);
        console.warn(`[AI Router] Provider ${provider.name} falhou: ${message}. Tentando próximo...`);
      }
    }

    // Se todos falharam, usa o demo como último recurso
    try {
      const text = await createDemoProvider().generateText(prompt);
      return { text, provider: 'demo' };
    } catch {
      throw new Error(`Todos os providers de IA falharam:\n${errors.join('\n')}`);
    }
  }

  /** Lista os providers ativos */
  getActiveProviders(): string[] {
    return this.providers
      .filter((p) => p.isConfigured())
      .map((p) => `${p.name} (prioridade ${p.priority})`);
  }
}

// ─── Factory ───────────────────────────────────────────────────────

let instance: AIRouter | null = null;

export function createAIRouter(geminiKey?: string, groqKey?: string): AIRouter {
  if (!instance) {
    instance = new AIRouter(geminiKey, groqKey);
  }
  return instance;
}
