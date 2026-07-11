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

export const config = {
  port: Number(process.env.PORT ?? 4000),

  /** Provedor ativo: 'ollama' | 'openai' | 'llmrouter' */
  aiProvider: process.env.AI_PROVIDER ?? 'openai',

  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL ?? 'llama3.2',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    baseUrl: process.env.OPENAI_BASE_URL ?? (omnirouteUrl ? `${omnirouteUrl}/v1` : 'https://api.openai.com/v1'),
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    providerName: process.env.OPENAI_PROVIDER_NAME ?? (omnirouteUrl ? 'omniroute' : 'openai'),
  },

  /** OpenRouter (modelos free, fallback) */
  openrouter: {
    a