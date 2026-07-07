import type { Tool, ToolCategory, ToolDefinition } from './types';

/**
 * Registro de Tools.
 *
 * Responsabilidade única: guardar Tools e permitir descobri-las (por id,
 * categoria ou capacidade). É onde as Tools serão conectadas no futuro; o
 * ToolManager as descobre por aqui.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool já registrada: ${tool.id}`);
    }
    this.tools.set(tool.id, tool);
  }

  unregister(id: string): void {
    this.tools.delete(id);
  }

  get(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  has(id: string): boolean {
    return this.tools.has(id);
  }

  list(): readonly Tool[] {
    return [...this.tools.values()];
  }

  findByCategory(category: ToolCategory): Tool[] {
    return this.list().filter((tool) => tool.category === category);
  }

  findByCapability(capability: string): Tool[] {
    return this.list().filter((tool) => tool.capabilities.includes(capability));
  }

  /** As `ToolDefinition` de todas as Tools registradas (Sprint 20), na ordem de registro. */
  definitions(): readonly ToolDefinition[] {
    return this.list().map((tool) => tool.definition);
  }
}
