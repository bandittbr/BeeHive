/**
 * Provedor OpenAI (e compatíveis) — ponto único de importação.
 *
 * Exporta o provedor e seus tipos públicos. `OpenAIClient` e os tipos de
 * protocolo HTTP (`types.ts`) são deliberadamente PRIVADOS deste módulo —
 * ninguém fora do provedor deve conhecer o formato de arame da OpenAI.
 */
export { OpenAIProvider, createOpenAIProvider, type OpenAIProviderOptions } from './OpenAIProvider';
