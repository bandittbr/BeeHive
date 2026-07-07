// Subpath dedicado (não o `.` raiz): `RuntimeManager` é o valor que carrega o
// Tool System inteiro (incluindo `node:fs` via `FilesystemTool`). O `.` raiz
// só expõe isto como TIPO, para não quebrar o bundle do navegador (`apps/web`)
// — só `apps/api` (Node) precisa do valor de verdade.
import { RuntimeManager } from '@beehive/platform/runtime';

/**
 * Boot do BeeHive Runtime dentro do apps/api.
 *
 * Sprint 12: o Runtime (Kernel → Tools → Providers → Services → Modules) deixa
 * de rodar no navegador e passa a viver aqui, como processo próprio. A Web
 * (apps/web) e qualquer outro cliente futuro (Desktop) consultam este processo
 * por HTTP/WebSocket — nunca instanciam a plataforma localmente.
 */
export async function createBeeHiveRuntime(): Promise<RuntimeManager> {
  const runtime = new RuntimeManager();
  try {
    await runtime.start();
    // eslint-disable-next-line no-console
    console.log('[BeeHive Runtime] em execução dentro do apps/api.');
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'erro desconhecido';
    // eslint-disable-next-line no-console
    console.error(`[BeeHive Runtime] falhou ao iniciar: ${detail}`);
    // Não derruba o processo: os endpoints de runtime relatam o estado
    // 'Failed', e os demais endpoints (Conversa/Business/Mídia) continuam
    // funcionando de forma independente.
  }
  return runtime;
}
