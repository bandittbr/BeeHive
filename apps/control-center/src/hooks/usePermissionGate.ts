import { useCallback } from "react";
import { usePermissionStore, type PermissionType } from "@/stores/permissionStore";

type ToolPermissionConfig = {
  permission: PermissionType;
  patterns: string[];
  metadata?: Record<string, unknown>;
};

export function usePermissionGate() {
  const requestPermission = usePermissionStore((s) => s.requestPermission);
  const isGranted = usePermissionStore((s) => s.isGranted);

  const withPermission = useCallback(
    async <T>(
      config: ToolPermissionConfig,
      action: () => Promise<T>
    ): Promise<T | null> => {
      // Check if already granted
      for (const pattern of config.patterns) {
        if (isGranted(config.permission, pattern)) {
          return action();
        }
      }

      // Request permission
      const decision = await requestPermission(
        config.permission,
        config.patterns,
        config.metadata
      );

      if (decision === "reject") {
        return null;
      }

      return action();
    },
    [requestPermission, isGranted]
  );

  const requestBashPermission = useCallback(
    (command: string, description?: string, workdir?: string) =>
      withPermission(
        {
          permission: "bash",
          patterns: [command],
          metadata: { command, description, cwd: workdir },
        },
        () => Promise.resolve({ approved: true } as const)
      ),
    [withPermission]
  );

  const requestEditPermission = useCallback(
    (filePath: string) =>
      withPermission(
        {
          permission: "edit",
          patterns: [filePath],
          metadata: { filePath },
        },
        () => Promise.resolve({ approved: true } as const)
      ),
    [withPermission]
  );

  const requestReadPermission = useCallback(
    (filePath: string) =>
      withPermission(
        {
          permission: "read",
          patterns: [filePath],
          metadata: { filePath },
        },
        () => Promise.resolve({ approved: true } as const)
      ),
    [withPermission]
  );

  return {
    withPermission,
    requestBashPermission,
    requestEditPermission,
    requestReadPermission,
  };
}
