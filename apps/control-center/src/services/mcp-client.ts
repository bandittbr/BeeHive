import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export type McpServerConfig = {
  id: string;
  name: string;
  serverUrl: string;
  authType: "none" | "api-key";
  apiKey?: string;
  enabled: boolean;
};

export type McpServerStatus = "disconnected" | "connecting" | "connected" | "error";

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

export async function connectToServer(config: McpServerConfig): Promise<{
  status: "connected";
  tools: Tool[];
}> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error("Connection timeout")),
    OPERATION_TIMEOUT_MS
  );

  try {
    const client = createClient();
    const headers = createHeaders(config);
    const transport = new StreamableHTTPClientTransport(new URL(config.serverUrl), {
      requestInit: headers ? { headers } : undefined,
    });

    await client.connect(transport, {
      signal: controller.signal,
      timeout: OPERATION_TIMEOUT_MS,
    });

    let tools: Tool[] = [];
    if (client.getServerCapabilities()?.tools) {
      const result = await client.listTools(undefined, {
        signal: controller.signal,
        timeout: OPERATION_TIMEOUT_MS,
      });
      tools = result.tools;
    }

    await client.close();
    return { status: "connected", tools };
  } finally {
    clearTimeout(timeout);
  }
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
    const headers = createHeaders(config);
    const transport = new StreamableHTTPClientTransport(new URL(config.serverUrl), {
      requestInit: headers ? { headers } : undefined,
    });

    await client.connect(transport, {
      signal: controller.signal,
      timeout: OPERATION_TIMEOUT_MS,
    });

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
