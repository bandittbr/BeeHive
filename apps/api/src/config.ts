/**
 * Configuração do backend, lida de variáveis de ambiente (.env).
 * Centralizar aqui mantém o resto do código livre de `process.env` espalhado.
 */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL ?? 'llama3.2',
  },
};
