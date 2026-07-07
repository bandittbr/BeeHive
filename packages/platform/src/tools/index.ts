/**
 * Tool System do BeeHive — ponto único de importação.
 *
 * Toda ação da IA no mundo externo passa por Tools, executadas pelo ToolManager.
 * A partir da Sprint 15.0, a primeira Tool real (FilesystemTool) está registrada
 * no manifesto — o resto da arquitetura (contratos, base, registro, manager)
 * segue como na Sprint 11.
 */
export * from './types';
export { BaseTool } from './BaseTool';
export { ToolRegistry } from './ToolRegistry';
export { ToolManager, type ToolManagerDeps } from './ToolManager';
export { TOOL_MANIFEST } from './manifest';
// Só tipos: `FilesystemTool` importa `node:fs` — expor o VALOR aqui
// contaminaria qualquer consumidor deste barrel num bundle de navegador
// (ver a nota grande em `src/index.ts`). Quem precisa da classe de verdade
// (só `manifest.ts`, dentro do próprio Tool System) importa direto de
// `./filesystem`.
export type {
  DirectoryEntry,
  FilesystemOperation,
  FilesystemToolInput,
  FilesystemToolOutput,
} from './filesystem';
