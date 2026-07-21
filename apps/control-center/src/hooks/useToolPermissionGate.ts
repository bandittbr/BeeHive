import { useCallback } from "react";
import { usePermissionStore, type PermissionType, type PermissionDecision } from "@/stores/permissionStore";

type ToolPermissionRequest = {
  permission: PermissionType;
  toolName: string;
  patterns: string[];
  metadata?: Record<string, unknown>;
};

export function useToolPermissionGate() {
  const requestPermission = usePermissionStore((s) => s.requestPermission);
  const isGranted = usePermissionStore((s) => s.isGranted);

  const gate = useCallback(
    async (request: ToolPermissionRequest): Promise<boolean> => {
      // Check if already granted via session
      for (const pattern of request.patterns) {
        if (isGranted(request.permission, pattern)) {
          return true;
        }
      }
      if (request.patterns.length === 0 && isGranted(request.permission, "*")) {
        return true;
      }

      // Request permission from user
      const decision = await requestPermission(
        request.permission,
        request.patterns,
        {
          tool: request.toolName,
          ...request.metadata,
        }
      );

      return decision !== "reject";
    },
    [requestPermission, isGranted]
  );

  const gateBash = useCallback(
    (command: string, description?: string, workdir?: string) =>
      gate({
        permission: "bash",
        toolName: "bash",
        patterns: [command],
        metadata: { command, description, cwd: workdir },
      }),
    [gate]
  );

  const gateEdit = useCallback(
    (filePath: string) =>
      gate({
        permission: "edit",
        toolName: "edit",
        patterns: [filePath],
        metadata: { filePath },
      }),
    [gate]
  );

  const gateRead = useCallback(
    (filePath: string) =>
      gate({
        permission: "read",
        toolName: "read",
        patterns: [filePath],
        metadata: { filePath },
      }),
    [gate]
  );

  const gateWrite = useCallback(
    (filePath: string) =>
      gate({
        permission: "write",
        toolName: "write",
        patterns: [filePath],
        metadata: { filePath },
      }),
    [gate]
  );

  const gateMcp = useCallback(
    (toolName: string, args: Record<string, unknown>) =>
      gate({
        permission: "mcp",
        toolName,
        patterns: [toolName],
        metadata: { args },
      }),
    [gate]
  );

  return { gate, gateBash, gateEdit, gateRead, gateWrite, gateMcp };
}
