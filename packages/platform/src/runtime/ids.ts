/**
 * Ids dos gerenciadores no ServiceRegistry do Kernel.
 *
 * Vivem num arquivo próprio, SEM NENHUM import, de propósito: `apps/web`
 * (navegador) precisa deles como valores reais (strings), não só como tipos.
 * `RuntimeManager.ts` importa a AI Layer e o Tool System inteiros — incluindo
 * Tools com APIs nativas do Node (ex.: `FilesystemTool` → `node:fs`, Sprint
 * 15.0) — o que é normal em Node (`apps/api`), mas quebra o bundle do
 * navegador: em ESM nativo (como o Vite serve em dev), um `export { X } from
 * './y'` força a avaliação INTEIRA do módulo `./y`, mesmo que só `X` seja
 * usado. Isolar estas duas constantes aqui evita que buscar `AI_MANAGER_ID`/
 * `TOOL_MANAGER_ID` arraste `node:fs` para o navegador.
 */
export const AI_MANAGER_ID = 'ai.manager';
export const TOOL_MANAGER_ID = 'tool.manager';
