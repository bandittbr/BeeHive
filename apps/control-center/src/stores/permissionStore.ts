import { create } from "zustand";

export type PermissionType =
  | "bash"
  | "edit"
  | "read"
  | "write"
  | "external_directory"
  | "task"
  | "todowrite"
  | "question"
  | "skill"
  | "mcp";

export type PermissionDecision = "once" | "always" | "reject";

export type PendingPermission = {
  id: string;
  permission: PermissionType;
  patterns: string[];
  metadata?: Record<string, unknown>;
  timestamp: number;
};

type PermissionStore = {
  pending: PendingPermission | null;
  sessionGrants: Map<string, PermissionDecision>;
  requestPermission: (
    permission: PermissionType,
    patterns: string[],
    metadata?: Record<string, unknown>
  ) => Promise<PermissionDecision>;
  respondPermission: (id: string, reply: PermissionDecision) => void;
  isGranted: (permission: PermissionType, pattern: string) => boolean;
};

let resolvePending: ((decision: PermissionDecision) => void) | null = null;

export const usePermissionStore = create<PermissionStore>()((set, get) => ({
  pending: null,
  sessionGrants: new Map(),

  requestPermission: (
    permission: PermissionType,
    patterns: string[],
    metadata?: Record<string, unknown>
  ) => {
    const { sessionGrants } = get();

    // Check session grants first
    for (const pattern of patterns) {
      const key = `${permission}:${pattern}`;
      const grant = sessionGrants.get(key);
      if (grant === "once") {
        sessionGrants.delete(key);
        return Promise.resolve("once");
      }
      if (grant === "always") {
        return Promise.resolve("always");
      }
    }

    // Check wildcard grant
    const wildcardGrant = sessionGrants.get(`${permission}:*`);
    if (wildcardGrant === "always") {
      return Promise.resolve("always");
    }

    // Need to ask user
    return new Promise<PermissionDecision>((resolve) => {
      resolvePending = resolve;
      set({
        pending: {
          id: `perm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          permission,
          patterns,
          metadata,
          timestamp: Date.now(),
        },
      });
    });
  },

  respondPermission: (id, reply) => {
    const { pending, sessionGrants } = get();
    if (!pending || pending.id !== id) return;

    // Store "always" grants in session
    if (reply === "always") {
      for (const pattern of pending.patterns) {
        sessionGrants.set(`${pending.permission}:${pattern}`, "always");
      }
      if (pending.patterns.length === 0) {
        sessionGrants.set(`${pending.permission}:*`, "always");
      }
      set({ sessionGrants: new Map(sessionGrants) });
    }

    set({ pending: null });
    resolvePending?.(reply);
    resolvePending = null;
  },

  isGranted: (permission, pattern) => {
    const { sessionGrants } = get();
    const key = `${permission}:${pattern}`;
    const wildcard = `${permission}:*`;
    return sessionGrants.get(key) === "always" || sessionGrants.get(wildcard) === "always";
  },
}));
