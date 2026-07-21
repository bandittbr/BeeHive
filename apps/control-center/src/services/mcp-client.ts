import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { auth, type OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { McpOAuthProvider } from "./mcp-oauth-provider";

export type McpServerConfig = {
  id: string;
  name: string;
  serverUrl: string;
  authType: "none" | "api-key" | "oauth";
  apiKey?: string;
  enabled: boolean;
};

export type McpServerStatus = "disconnected" | "connecting" | "connected" | "error" | "needs_auth";

export type McpServerState = {
  config: McpServerConfig;
  status: McpServerStatus;
  tools: Tool[];
  error?: string;
};

const OPERATION_TIMEOUT_MS = 30_000;

function createClient(): Client {
  return new Client({ name: "BeeHive", version: "1.0.0" }, { capabilities: {} });
}

function createHeaders(config: McpServerConfig): Record<string, string> | undefined {
  if (config.authType === "api-key" && config.apiKey) {
    return { Authorization: `Bearer ${config.apiKey}` };
  }
  return undefined;
}

async function runWithOAuth(
  config: McpServerConfig,
  operation: (client: Client, transport: StreamableHTTPClientTransport) => Promise<void>
): Promise<{ status: "connected" | "needs_auth"; tools?: Tool[]; authorizeUrl?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error("Connection timeout")),
    OPERATION_TIMEOUT_MS
  );

  try {
    const client = createClient();

    if (config.authType === "oauth") {
      const provider = new McpOAuthProvider({
        connectionId: config.id,
        serverUrl: config.serverUrl,
      });

      const transport = new StreamableHTTPClientTransport(new URL(config.serverUrl), {
        authProvider: provider,
      });

      try {
        await client.connect(transport, {
          signal: controller.signal,
          timeout: OPERATION_TIMEOUT_MS,
        });
      } catch (error: any) {
        if (error?.name === "UnauthorizedError" || error?.message?.includes("401")) {
          // Save the server URL in the provider so callback can find it
          await provider.saveDiscoveryState({ issuer: config.serverUrl });
          const result = await auth(provider, { serverUrl: config.serverUrl });
          if (result === "REDIRECT") {
            return { status: "needs_auth", authorizeUrl: provider.authorizeUrl };
          }
        }
        throw error;
      }

      const tools: Tool[] = [];
      if (client.getServerCapabilities()?.tools) {
        const result = await client.listTools(undefined, {
          signal: controller.signal,
          timeout: OPERATION_TIMEOUT_MS,
        });
        tools.push(...result.tools);
      }

      await client.close();
      return { status: "connected", tools };
    }

    // Non-OAuth: simple header-based auth
    const headers = createHeaders(config);
    const transport = new StreamableHTTPClientTransport(new URL(config.serverUrl), {
      requestInit: headers ? { headers } : undefined,
    });

    await client.connect(transport, {
      signal: controller.signal,
      timeout: OPERATION_TIMEOUT_MS,
    });

    const tools: Tool[] = [];
    if (client.getServerCapabilities()?.tools) {
      const result = await client.listTools(undefined, {
        signal: controller.signal,
        timeout: OPERATION_TIMEOUT_MS,
      });
      tools.push(...result.tools);
    }

    await client.close();
    return { status: "connected", tools };
  } finally {
    clearTimeout(timeout);
  }
}

export async function connectToServer(config: McpServerConfig): Promise<{
  status: "connected";
  tools: Tool[];
}> {
  const result = await runWithOAuth(config, async () => {});
  if (result.status === "needs_auth") {
    throw new Error("OAuth authorization required. Please authorize in the settings.");
  }
  return { status: "connected", tools: result.tools ?? [] };
}

export async function connectToServerWithOAuth(config: McpServerConfig): Promise<{
  status: "connected" | "needs_auth";
  tools: Tool[];
  authorizeUrl?: string;
}> {
  const result = await runWithOAuth(config, async () => {});
  return {
    status: result.status,
    tools: result.tools ?? [],
    authorizeUrl: result.authorizeUrl,
  };
}

export async function callMcpTool(
  config: McpServerConfig,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error("Tool call timeout")),
    OPERATION_TIMEOUT_MS
  );

  try {
    const client = createClient();

    if (config.authType === "oauth") {
      const provider = new McpOAuthProvider({
        connectionId: config.id,
        serverUrl: config.serverUrl,
      });

      const transport = new StreamableHTTPClientTransport(new URL(config.serverUrl), {
        authProvider: provider,
      });

      await client.connect(transport, {
        signal: controller.signal,
        timeout: OPERATION_TIMEOUT_MS,
      });
    } else {
      const headers = createHeaders(config);
      const transport = new StreamableHTTPClientTransport(new URL(config.serverUrl), {
        requestInit: headers ? { headers } : undefined,
      });

      await client.connect(transport, {
        signal: controller.signal,
        timeout: OPERATION_TIMEOUT_MS,
      });
    }

    const result = await client.callTool(
      { name: toolName, arguments: args },
      undefined,
      { signal: controller.signal, timeout: OPERATION_TIMEOUT_MS }
    );

    await client.close();

    if ("isError" in result && result.isError) {
      const content = result.content;
      const text = Array.isArray(content)
        ? content.map((c: any) => c.text ?? "").join("\n")
        : String(content);
      throw new Error(text || "MCP tool returned an error");
    }

    return result.content;
  } finally {
    clearTimeout(timeout);
  }
}

export async function listMcpTools(config: McpServerConfig): Promise<Tool[]> {
  const result = await connectToServer(config);
  return result.tools;
}
