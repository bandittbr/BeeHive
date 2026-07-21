import { useCallback } from "react";
import { useMcpStore } from "@/stores/mcpStore";
import { callMcpTool } from "@/services/mcp-client";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export function useMcpTools() {
  const servers = useMcpStore((s) => s.servers);
  const getConnectedTools = useMcpStore((s) => s.getConnectedTools);

  const connectedTools = getConnectedTools();

  const findServerForTool = useCallback(
    (toolName: string) => {
      for (const { server, tool } of connectedTools) {
        if (tool.name === toolName) {
          return server.config;
        }
      }
      return null;
    },
    [connectedTools]
  );

  const executeTool = useCallback(
    async (toolName: string, args: Record<string, unknown>): Promise<unknown> => {
      const config = findServerForTool(toolName);
      if (!config) {
        throw new Error(`MCP tool "${toolName}" not found in any connected server`);
      }
      return callMcpTool(config, toolName, args);
    },
    [findServerForTool]
  );

  const getAllToolNames = useCallback(() => {
    return connectedTools.map(({ tool }) => tool.name);
  }, [connectedTools]);

  const getToolSchema = useCallback(
    (toolName: string): Tool | undefined => {
      return connectedTools.find(({ tool }) => tool.name === toolName)?.tool;
    },
    [connectedTools]
  );

  return {
    connectedTools,
    executeTool,
    findServerForTool,
    getAllToolNames,
    getToolSchema,
    hasTools: connectedTools.length > 0,
  };
}
