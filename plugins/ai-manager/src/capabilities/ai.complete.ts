import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';

// Gateway real via OpenRouter (endpoint compatível com OpenAI, dá acesso a
// dezenas de modelos/provedores com uma chave só). Usado como padrão global
// enquanto o BYOK por usuário (Settings > Providers) roda no navegador.
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '';
const DEFAULT_MODEL = process.env.AI_MODEL || process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-pro';

// Cadeia do OmniRouter: se o modelo pedido falhar por falta de crédito/limite
// de taxa, tenta o próximo da lista (só quando params.omnirouter === true).
const OMNIROUTER_CHAIN = (process.env.OMNIROUTER_CHAIN
  || 'deepseek/deepseek-v4-pro,meta-llama/llama-3.1-8b-instruct:free,openai/gpt-4o-mini')
  .split(',').map((s) => s.trim()).filter(Boolean);

interface ChatMessage { role: string; content: string }

async function callOpenRouter(
  model: string,
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number },
): Promise<{ content: string; model: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://beehiveos.vercel.app',
      'X-Title': 'BeeHive',
    },
    body: JSON.stringify({
      model,
      messages,
      ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
      ...(opts.maxTokens != null ? { max_tokens: opts.maxTokens } : {}),
    }),
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok) {
    const err: any = new Error(data?.error?.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const usage = data?.usage ?? {};
  return {
    content: data?.choices?.[0]?.message?.content ?? '',
    model: data?.model ?? model,
    usage: {
      promptTokens: usage.prompt_tokens ?? 0,
      completionTokens: usage.completion_tokens ?? 0,
      totalTokens: usage.total_tokens ?? 0,
    },
  };
}

// Erros de cota/limite de taxa (é isso que o OmniRouter deve contornar
// trocando de modelo; outros erros — ex. prompt inválido — não adianta retry).
function isQuotaOrRateLimitError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  const msg = String((err as Error)?.message ?? '');
  return status === 429 || status === 402 || /insufficient|quota|rate.?limit|credit/i.test(msg);
}

export class AIComplete extends Capability {
  readonly id = 'ai.complete';
  readonly name = 'Completar IA';
  readonly description = 'Executa chamada de IA completa (não-streaming) via provider registrado';
  readonly inputs: CapabilityInput[] = [
    { name: 'model', type: 'string', description: 'Modelo de IA', required: true },
    { name: 'messages', type: 'array', description: 'Mensagens para o modelo', required: true },
    { name: 'temperature', type: 'number', description: 'Temperatura (0-2)', required: false },
    { name: 'maxTokens', type: 'number', description: 'Máximo de tokens', required: false },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'content', type: 'string', description: 'Resposta gerada' },
    { name: 'usage', type: 'object', description: 'Tokens utilizados' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    const messages = (params.messages as ChatMessage[]) ?? [];
    ctx.logger.info(`AIComplete: model=${params.model}, messages=${messages.length}`);

    // 1) Provider plugado externamente (futuro: BYOK do usuário chegando via ctx.providers)
    const provider = ctx.providers?.resolve(this.id);
    if (provider) {
      ctx.logger.info(`AIComplete: roteado para provider ${provider.id}`);
      return provider.execute(this.id, params, ctx);
    }

    // 2) Sem chave de gateway configurada → fallback simulado (comportamento antigo)
    if (!OPENROUTER_API_KEY) {
      ctx.logger.warn('AIComplete: nenhuma OPENROUTER_API_KEY configurada, usando fallback');
      return {
        success: true,
        outputs: {
          content: `[Fallback] Resposta simulada para modelo "${params.model}" com ${messages.length} mensagens. Configure um provider de IA (OpenAI, Anthropic, etc.) para respostas reais.`,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        },
        metrics: { duration: Date.now() - start },
      };
    }

    // 3) Chamada real via OpenRouter. Com omnirouter=true, tenta a cadeia de
    // fallback se o modelo pedido estiver sem crédito/rate-limited.
    const requestedModel = (params.model as string) || DEFAULT_MODEL;
    const useOmniRouter = params.omnirouter === true;
    const chain = useOmniRouter
      ? [requestedModel, ...OMNIROUTER_CHAIN.filter((m) => m !== requestedModel)]
      : [requestedModel];

    let lastErr: unknown = null;
    for (const model of chain) {
      try {
        const result = await callOpenRouter(model, messages, {
          temperature: params.temperature as number | undefined,
          maxTokens: params.maxTokens as number | undefined,
        });
        return {
          success: true,
          outputs: { content: result.content, usage: result.usage, modelUsed: result.model },
          metrics: { duration: Date.now() - start, tokensUsed: result.usage.totalTokens },
        };
      } catch (err) {
        lastErr = err;
        ctx.logger.warn(`AIComplete: falha em ${model}: ${(err as Error).message}`);
        // só continua a cadeia se o omnirouter estiver ligado E o erro for de cota/limite
        if (!useOmniRouter || !isQuotaOrRateLimitError(err)) break;
      }
    }

    const errMsg = (lastErr as Error)?.message ?? 'erro desconhecido';
    ctx.logger.error(`AIComplete: todas as tentativas falharam: ${errMsg}`);
    return {
      success: false,
      outputs: {
        content: `Não consegui falar com o provedor de IA agora (${errMsg}).`,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      },
      error: errMsg,
      metrics: { duration: Date.now() - start },
    };
  }
}