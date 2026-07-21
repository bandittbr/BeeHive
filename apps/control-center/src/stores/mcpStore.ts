import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  connectToServer,
  connectToServerWithOAuth,
  type McpServerConfig,
  type McpServerStatus,
} from "@/services/mcp-client";

export type McpServerEntry = {
  config: McpServerConfig;
  status: McpServerStatus;
  tools: Tool[];
  error?: string;
  authorizeUrl?: string;
};

type McpStore = {
  servers: McpServerEntry[];
  addServer: (config: McpServerConfig) => void;
  removeServer: (id: string) => void;
  updateServer: (id: string, config: Partial<McpServerConfig>) => void;
  connectServer: (id: string) => Promise<void>;
  disconnectServer: (id: string) => void;
  getConnectedTools: () => Array<{ server: McpServerEntry; tool: Tool }>;
};

export const useMcpStore = create<McpStore>()(
  persist(
    (set, get) => ({
      servers: [],

      addServer: (config) =>
        set((state) => ({
          servers: [
            ...state.servers,
            { config, status: "disconnected" as const, tools: [] },
          ],
        })),

      removeServer: (id) =>
        set((state) => ({
          servers: state.servers.filter((s) => s.config.id !== id),
        })),

      updateServer: (id, updates) =>
        set((state) => ({
          servers: state.servers.map((s) =>
            s.config.id === id
              ? { ...s, config: { ...s.config, ...updates } }
              : s
          ),
        })),

      connectServer: async (id) => {
        const server = get().servers.find((s) => s.config.id === id);
        if (!server || !server.config.enabled) return;

        set((state) => ({
          servers: state.servers.map((s) =>
            s.config.id === id ? { ...s, status: "connecting" as const, error: undefined } : s
          ),
        }));

        try {
          if (server.config.authType === "oauth") {
            const result = await connectToServerWithOAuth(server.config);
            set((state) => ({
              servers: state.servers.map((s) =>
                s.config.id === id
                  ? {
                      ...s,
                      status: result.status as McpServerStatus,
                      tools: result.tools,
                      authorizeUrl: result.authorizeUrl,
                      error: undefined,
                    }
                  : s
              ),
            }));
          } else {
            const result = await connectToServer(server.config);
            set((state) => ({
              servers: state.servers.map((s) =>
                s.config.id === id
                  ? { ...s, status: "connected" as const, tools: result.tools, error: undefined }
                  : s
              ),
            }));
          }
        } catch (error) {
          set((state) => ({
            servers: state.servers.map((s) =>
              s.config.id === id
                ? {
                    ...s,
                    status: "error" as const,
                    error: error instanceof Error ? error.message : "Connection failed",
                  }
                : s
            ),
          }));
        }
      },

      disconnectServer: (id) =>
        set((state) => ({
          servers: state.servers.map((s) =>
            s.config.id === id
              ? { ...s, status: "disconnected" as const, tools: [] }
              : s
          ),
        })),

      getConnectedTools: () => {
        const { servers } = get();
        const result: Array<{ server: McpServerEntry; tool: Tool }> = [];
        for (const server of servers) {
          if (server.status === "connected" && server.config.enabled) {
            for (const tool of server.tools) {
              result.push({ server, tool });
            }
          }
        }
        return result;
      },
    }),
    {
      name: "beehive-mcp-servers",
      partialize: (state) => ({
        servers: state.servers.map((s) => ({
          config: s.config,
          status: "disconnected" as const,
          tools: [],
        })),
      }),
    }
  )
);
