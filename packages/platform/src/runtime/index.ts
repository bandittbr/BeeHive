/**
 * BeeHive Runtime — ponto único de importação.
 *
 * O orquestrador que executa todo o Sistema Operacional. A interface é apenas
 * um cliente que consulta o Runtime (status, health, snapshot, logs).
 */
export * from './types';
export { RuntimeLifecycle } from './RuntimeLifecycle';
export { RuntimeManager } from './RuntimeManager';
// Dos dois, direto de `./ids` (zero imports) — não de `./RuntimeManager`, que
// arrasta a AI Layer e o Tool System inteiros (ver `./ids` para o porquê).
export { AI_MANAGER_ID, TOOL_MANAGER_ID } from './ids';
