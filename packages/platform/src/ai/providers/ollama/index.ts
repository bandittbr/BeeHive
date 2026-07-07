/**
 * Provedor Ollama — ponto único de importação.
 *
 * Exporta o provedor e seus tipos públicos (entrada/saída da capacidade
 * `chat`, modelos). `OllamaHttpClient` e os tipos de protocolo HTTP
 * (`types.ts`) são deliberadamente PRIVADOS deste módulo — ninguém fora do
 * provedor deve conhecer o formato de arame do Ollama.
 */
export { OllamaProvider, createOllamaProvider, type OllamaProviderOptions } from './OllamaProvider';
export type {
  OllamaChatInput,
  OllamaChatMessage,
  OllamaChatOutput,
  OllamaChatRole,
  OllamaModelInfo,
  OllamaModelSummary,
} from './types';
