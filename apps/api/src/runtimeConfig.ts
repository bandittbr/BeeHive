import { config } from './config';

export interface RuntimeConfig {
  model: string;
  status?: string;
}

/**
 * Configuração mutável em tempo de execução.
 *
 * Ao contrário do `config` (lido do .env na inicialização), isto pode mudar
 * enquanto o servidor roda. Volta ao padrão do .env a cada reinício.
 *
 * O modelo padrão é escolhido conforme o provedor ativo (AI_PROVIDER).
 */
function defaultModel(): string {
  return config.aiProvider === 'openai' ? config.openai.model : config.ollama.model;
}

export const runtime: RuntimeConfig = {
  model: defaultModel(),
};
