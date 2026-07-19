import {
  Client,
  type ClientOptions,
  type Transport,
} from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {
  McpTool,
  McpResource,
  McpPrompt,
  McpToolCall,
  McpToolResult,
  McpReadResourceResult,
  McpServerInfo,
  McpServerCapabilities,
} from "./types.js";

export interface McpClientConfig {
  /** Server command to spawn (for stdio transport) */
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  /** SSE endpoint URL (for SSE transport) */
  url?: string;
  /** Client info */
  clientInfo?: {
    name: string;
    version: string;
  };
  /** Connection timeout in ms */
  timeout?: number;
}

export class McpClient {
  private client: Client | null = null;
  private transport: Transport | null = null;
  private config: McpClientConfig;
  private connected = false;
  private serverInfo: McpServerInfo | null = null;
  private capabilities: McpServerCapabilities | null = null;
  private tools: McpTool[] = [];
  private resources: McpResource[] = [];
  private prompts: McpPrompt[] = [];
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor(config: McpClientConfig) {
    this.config = {
      clientInfo: { name: "bee-hive", version: "0.1.0" },
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    // Create transport based on config
    if (this.config.url) {
      // SSE transport
      this.transport = new SSEClientTransport(new URL(this.config.url));
    } else if (this.config.command) {
      // Stdio transport
      this.transport = new StdioClientTransport({
        command: this.config.command,
        args: this.config.args || [],
        env: { ...process.env, ...this.config.env },
      });
    } else {
      throw new Error("Either command or url must be provided");
    }

    // Create client
    this.client = new Client(
      {
        name: this.config.clientInfo!.name,
        version: this.config.clientInfo!.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
          logging: {},
        },
      }
    );

    // Set up event listeners
    this.setupEventListeners();

    // Connect
    await this.client.connect(this.transport);

    // Fetch server info
    this.serverInfo = await this.client.getServerInfo();
    this.capabilities = this.serverInfo.capabilities;

    // Fetch available tools, resources, prompts
    await this.refreshCapabilities();

    this.connected = true;
    this.emit("connected", this.serverInfo);
  }

  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.onerror = (error) => {
      this.emit("error", error);
    };

    this.client.onclose = () => {
      this.connected = false;
      this.emit("disconnected");
    };

    // Listen for notifications
    this.client.onnotification = (notification) => {
      this.emit("notification", notification);
    };
  }

  /**
   * Refresh available tools, resources, prompts
   */
  async refreshCapabilities(): Promise<void> {
    if (!this.client || !this.connected) return;

    try {
      if (this.capabilities?.tools) {
        const toolsResult = await this.client.listTools();
        this.tools = toolsResult.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));
        this.emit("toolsChanged", this.tools);
      }

      if (this.capabilities?.resources) {
        const resourcesResult = await this.client.listResources();
        this.resources = resourcesResult.resources.map((resource) => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
        }));
        this.emit("resourcesChanged", this.resources);
      }

      if (this.capabilities?.prompts) {
        const promptsResult = await this.client.listPrompts();
        this.prompts = promptsResult.prompts.map((prompt) => ({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments,
        }));
        this.emit("promptsChanged", this.prompts);
      }
    } catch (error) {
      this.emit("error", error);
    }
  }

  /**
   * Call a tool on the server
   */
  async callTool(call: McpToolCall): Promise<McpToolResult> {
    if (!this.client || !this.connected) {
      throw new Error("Not connected to MCP server");
    }

    const result = await this.client.callTool({
      name: call.name,
      arguments: call.arguments,
    });

    return {
      content: result.content.map((content) => ({
        type: content.type,
        text: content.text,
        data: (content as any).data,
        mimeType: (content as any).mimeType,
        resource: (content as any).resource,
      })),
      isError: result.isError,
    };
  }

  /**
   * Read a resource from the server
   */
  async readResource(uri: string): Promise<McpReadResourceResult> {
    if (!this.client || !this.connected) {
      throw new Error("Not connected to MCP server");
    }

    const result = await this.client.readResource({ uri });
    return {
      contents: result.contents.map((content) => ({
        uri: content.uri,
        mimeType: content.mimeType,
        text: content.text,
        blob: content.blob,
      })),
    };
  }

  /**
   * Get a prompt from the server
   */
  async getPrompt(name: string, args?: Record<string, string>): Promise<string> {
    if (!this.client || !this.connected) {
      throw new Error("Not connected to MCP server");
    }

    const result = await this.client.getPrompt({
      name,
      arguments: args,
    });

    return result.messages.map((msg) => msg.content.text).join("\n");
  }

  /**
   * Get server info
   */
  getServerInfo(): McpServerInfo | null {
    return this.serverInfo;
  }

  /**
   * Get server capabilities
   */
  getCapabilities(): McpServerCapabilities | null {
    return this.capabilities;
  }

  /**
   * Get available tools
   */
  getTools(): McpTool[] {
    return [...this.tools];
  }

  /**
   * Get available resources
   */
  getResources(): McpResource[] {
    return [...this.resources];
  }

  /**
   * Get available prompts
   */
  getPrompts(): McpPrompt[] {
    return [...this.prompts];
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.close();
      this.connected = false;
      this.emit("disconnected");
    }
  }

  // Event emitter methods
  on(event: string, listener: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  off(event: string, listener: Function): void {
    this.eventListeners.get(event)?.delete(listener);
  }

  private emit(event: string, ...args: any[]): void {
    this.eventListeners.get(event)?.forEach((listener) => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
}

/**
 * Create a stdio MCP client
 */
export function createStdioClient(config: Omit<McpClientConfig, "url">): McpClient {
  return new McpClient({ ...config, url: undefined });
}

/**
 * Create an SSE MCP client
 */
export function createSseClient(config: Omit<McpClientConfig, "command" | "args" | "env">): McpClient {
  return new McpClient({ ...config, command: undefined, args: undefined, env: undefined });
}

export type { McpClientConfig };