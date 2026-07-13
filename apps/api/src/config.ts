/**
 * Configuração do backend, lida de variáveis de ambiente (.env).
 * Centralizar aqui mantém o resto do código livre de `process.env` espalhado.
 *
 * Suporta três modos de IA:
 *  - 'openai' (cloud, padrão): usa um único provedor OpenAI-compatível
 *  - 'llmrouter': usa múltiplos provedores com failover automático
 *  - 'ollama' (local): Ollama local
 *
 * OMNIROUTE_URL (opcional): se definido, vira o `baseUrl` padrão do modo
 * 'openai' — gateway OmniRoute (177 provedores, fallback automático, deploy
 * próprio) rodando como serviço externo. Ver docs/integrations/omniroute.md.
 * Um `OPENAI_BASE_URL` explícito sempre tem prioridade sobre isso.
 */
const omnirouteUrl = process.env.OMNIROUTE_URL?.replace(/\/+$/, '');

/**
 * Normaliza chaves de API: valores vazios ou placeholders óbvios
 * (ex.: "sk-or-v1-aqui-sua-chave", "REPLACE_ME") viram '' para que o backend
 * trate o provider como NÃO configurado e use o caminho gratuito (OpenCode Zen)
 * por padrão. Quem quiser modelo pago coloca a própria chave na UI.
 */
const PLACEHOLDER_RE = /(aqui|sua[-_]?chave|your[-_]?key|replace|placeholder|exemplo|example|xxxx|todo|chave[-_]?aqui|<|>)/i;
function cleanKey(value?: string): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  if (PLACEHOLDER_RE.test(v)) return '';
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),

  /** Provedor ativo: 'ollama' | 'openai' | 'llmrouter'
   *  Padrão 'llmrouter': usa OpenCode Zen (big-pickle e outros modelos
   *  gratuitos, sem chave). Quem quiser pago coloca a própria chave na UI. */
  aiProvider: process.env.AI_PROVIDER ?? 'llmrouter',

  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL ?? 'llama3.2',
  },

  openai: {
    apiKey: cleanKey(process.env.OPENAI_API_KEY),
    baseUrl: process.env.OPENAI_BASE_URL ?? (omnirouteUrl ? `${omnirouteUrl}/v1` : 'https://api.openai.com/v1'),
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    providerName: process.env.OPENAI_PROVIDER_NAME ?? (omnirouteUrl ? 'omniroute' : 'openai'),
  },

  /** OpenRouter (modelos free, fallback) */
  openrouter: {
    apiKey: cleanKey(process.env.OPENROUTER_API_KEY),
    baseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    model: process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.1-8b-instruct',
  },

  /** Groq (rápido, free tier generoso) */
  groq: {
    apiKey: cleanKey(process.env.GROQ_API_KEY),
    baseUrl: process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1',
    model: process.env.GROQ_MODEL ?? 'llama3-70b-8192',
  },

  /** OpenCode Zen (anomalyco) — modelos free, incluindo big-pickle */
  opencode: {
    apiKey: cleanKey(process.env.OPENCODE_API_KEY),
    baseUrl: process.env.OPENCODE_BASE_URL ?? 'https://opencode.ai/zen/v1',
    model: process.env.OPENCODE_MODEL ?? 'big-pickle',
  },

  /** Kiro (AWS) — Claude via AWS Bedrock, requer gateway local */
  kiro: {
    apiKey: cleanKey(process.env.KIRO_API_KEY),
    baseUrl: process.env.KIRO_BASE_URL ?? 'http://localhost:8000/v1',
    model: process.env.KIRO_MODEL ?? 'claude-sonnet-4-20250514',
  },
};
