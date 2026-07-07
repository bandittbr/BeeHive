import { config } from './config';

export interface RuntimeConfig {
  model: string;
  status?: string;
}

/**
 * Configuração mutável em tempo de execução.
 *
 * Ao contrário do `config` (lido do .env na inicialização), isto pode mudar
 * enquanto o servidor roda — por exemplo, quando o usuário troca o modelo de
 * inteligência pela tela de Configurações. Volta ao padrão do .env a cada
 * reinício do servidor.
 */
export const runtime: RuntimeConfig = {
  model: config.ollama.model,
};
