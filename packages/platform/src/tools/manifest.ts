import { createFilesystemTool } from './filesystem';
import type { Tool } from './types';

/**
 * Manifesto de Tools — a "descoberta" de Tools do BeeHive.
 *
 * Adicionar uma Tool é: criar a pasta em `tools/` (estendendo `BaseTool`) e
 * acrescentar uma linha aqui. O `RuntimeManager` (não alterado nesta Sprint)
 * já consome `TOOL_MANIFEST` via `toolManager.load(TOOL_MANIFEST)` no boot —
 * registrar uma Tool nova é só isto, sem tocar em Runtime/ToolManager.
 */
export const TOOL_MANIFEST: readonly Tool[] = [createFilesystemTool()];
