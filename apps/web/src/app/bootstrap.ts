import { getRuntimeClient, RuntimeClient } from './runtimeClient';
import { CONVERSATION_COMMANDS, TOOL_MANAGER_ID, AI_MANAGER_ID } from '@beehive/platform';

export { CONVERSATION_COMMANDS, AI_MANAGER_ID, TOOL_MANAGER_ID };

/**
 * Raiz de composição do cliente Web.
 *
 * Sprint 12: o Runtime (Kernel → Tools → Providers → Services → Modules)
 * deixou de rodar no navegador. Ele é hospedado em `apps/api` como processo
 * próprio (`@beehive/platform`), expondo status/health/snapshot/logs e
 * comandos por HTTP/WebSocket. A Web apenas inicia um `RuntimeClient` — a
 * "raiz de composição" agora é só a conexão, não mais a construção do
 * sistema operacional inteiro.
 */
export async function bootstrapApp(): Promise<{ runtime: RuntimeClient }> {
  const runtime = getRuntimeClient();
  // Aquecimento: confirma que o Runtime remoto está de pé (falha silenciosa —
  // a Conversa e as demais telas já lidam com o backend fora do ar).
  try {
    await runtime.status();
  } catch {
    // apps/api pode ainda não estar rodando; a UI segue de pé mesmo assim.
  }
  return { runtime };
}

/** Acesso ao cliente do Runtime remoto (status, health, snapshot, logs, comandos, eventos). */
export function getRuntime(): RuntimeClient {
  return getRuntimeClient();
}
