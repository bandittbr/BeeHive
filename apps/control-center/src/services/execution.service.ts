/**
 * Execution Service - Handles command execution for Cowork terminal
 * Supports both local shell execution and MCP server execution
 */

import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { McpClient, createStdioClient, createSseClient, type McpClientConfig, type McpToolCall, type McpToolResult } from "@beehive/mcp";

export interface ExecutionOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number;
}

export interface ExecutionEvent {
  type: "stdout" | "stderr" | "exit" | "error";
  data: string;
  timestamp: number;
}

export interface ExecutionConfig {
  /** Working directory for commands */
  cwd: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Default shell to use */
  shell?: string;
  /** Command timeout in ms */
  timeout?: number;
  /** MCP client configuration for remote execution */
  mcp?: {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
  };
}

/**
 * Local shell execution service
 */
export class LocalExecutionService extends EventEmitter {
  private config: ExecutionConfig;
  private currentProcess: ChildProcess | null = null;
  private activeExecutions: Map<string, ChildProcess> = new Map();

  constructor(config: ExecutionConfig) {
    super();
    this.config = {
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/bash",
      timeout: 60000,
      ...config,
    };
  }

  /**
   * Execute a command locally
   */
  async execute(command: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const executionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const cwd = options.cwd || this.config.cwd;
    const env = { ...process.env, ...this.config.env, ...options.env };
    const shell = options.shell || this.config.shell;
    const timeout = options.timeout || this.config.timeout;

    return new Promise((resolve, reject) => {
      const isWindows = process.platform === "win32";
      const shellArgs = isWindows ? ["/c", command] : ["-c", command];

      const process = spawn(shell, shellArgs, {
        cwd,
        env,
        shell: true,
        timeout,
      });

      this.activeExecutions.set(executionId, process);

      let stdout = "";
      let stderr = "";

      process.stdout?.on("data", (data) => {
        const text = data.toString();
        stdout += text;
        this.emit("data", { type: "stdout", data: text, executionId });
      });

      process.stderr?.on("data", (data) => {
        const text = data.toString();
        stderr += text;
        this.emit("data", { type: "stderr", data: text, executionId });
      });

      process.on("error", (error) => {
        this.activeExecutions.delete(executionId);
        this.emit("error", { error, executionId });
        reject({
          stdout,
          stderr: error.message,
          exitCode: -1,
          duration: Date.now() - startTime,
        });
      });

      process.on("close", (code) => {
        this.activeExecutions.delete(executionId);
        const duration = Date.now() - startTime;
        this.emit("exit", { code, executionId });
        resolve({
          stdout,
          stderr,
          exitCode: code,
          duration,
        });
      });
    });
  }

  /**
   * Execute multiple commands in sequence
   */
  async executeSequence(commands: string[], options: ExecutionOptions = {}): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    for (const command of commands) {
      const result = await this.execute(command, options);
      results.push(result);
      if (result.exitCode !== 0) {
        break;
      }
    }
    return results;
  }

  /**
   * Kill a specific execution
   */
  kill(executionId: string): boolean {
    const process = this.activeExecutions.get(executionId);
    if (process) {
      process.kill("SIGTERM");
      return true;
    }
    return false;
  }

  /**
   * Kill all active executions
   */
  killAll(): void {
    for (const process of this.activeExecutions.values()) {
      process.kill("SIGTERM");
    }
    this.activeExecutions.clear();
  }

  /**
   * Get active execution count
   */
  getActiveCount(): number {
    return this.activeExecutions.size;
  }
}

/**
 * MCP-based execution service for remote/secure execution
 */
export class McpExecutionService extends EventEmitter {
  private client: McpClient | null = null;
  private config: McpClientConfig | null = null;
  private connected = false;

  /**
   * Initialize MCP client
   */
  async initialize(config: McpClientConfig): Promise<void> {
    this.config = config;
    this.client = new McpClient(config);
    await this.client.connect();
    this.connected = true;
    this.emit("connected");
  }

  /**
   * Execute a command via MCP
   */
  async execute(command: string): Promise<McpToolResult> {
    if (!this.client || !this.connected) {
      throw new Error("MCP client not connected");
    }

    // For now, assume there's a "bash" or "exec" tool available
    // In practice, the MCP server would need to expose an execution tool
    const result = await this.client.callTool({
      name: "execute",
      arguments: { command },
    });

    return result;
  }

  /**
   * Read a file via MCP
   */
  async readFile(uri: string): Promise<string> {
    if (!this.client || !this.connected) {
      throw new Error("MCP client not connected");
    }
    const result = await this.client.readResource(uri);
    return result.contents.map((c) => c.text || "").join("\n");
  }

  /**
   * Write a file via MCP
   */
  async writeFile(uri: string, content: string): Promise<void> {
    if (!this.client || !this.connected) {
      throw new Error("MCP client not connected");
    }
    // This would require a write tool on the MCP server
    await this.client.callTool({
      name: "write",
      arguments: { uri, content },
    });
  }

  /**
   * Get available tools
   */
  getTools() {
    return this.client?.getTools() || [];
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.connected && this.client?.isConnected() === true;
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.connected = false;
    }
  }
}

/**
 * Unified execution service - combines local and MCP execution
 */
export class UnifiedExecutionService extends EventEmitter {
  private local: LocalExecutionService;
  private mcp: McpExecutionService;
  private useMcp = false;

  constructor(localConfig: ExecutionConfig, mcpConfig?: McpClientConfig) {
    super();
    this.local = new LocalExecutionService(localConfig);
    this.mcp = new McpExecutionService();

    // Forward local events
    this.local.on("data", (event) => this.emit("data", event));
    this.local.on("exit", (event) => this.emit("exit", event));
    this.local.on("error", (event) => this.emit("error", event));

    if (mcpConfig) {
      this.mcp.on("connected", () => this.emit("mcpConnected"));
      this.mcp.on("error", (error) => this.emit("mcpError", error));
    }
  }

  /**
   * Initialize MCP connection
   */
  async initMcp(config: McpClientConfig): Promise<void> {
    await this.mcp.initialize(config);
    this.useMcp = true;
  }

  /**
   * Execute command - uses MCP if available, otherwise local
   */
  async execute(command: string, options: ExecutionOptions = {}): Promise<ExecutionResult | McpToolResult> {
    if (this.useMcp && this.mcp.isConnected()) {
      try {
        return await this.mcp.execute(command);
      } catch (error) {
        console.warn("MCP execution failed, falling back to local:", error);
      }
    }
    return this.local.execute(command, options);
  }

  /**
   * Execute locally (bypass MCP)
   */
  async executeLocal(command: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    return this.local.execute(command, options);
  }

  /**
   * Execute via MCP only
   */
  async executeMcp(command: string): Promise<McpToolResult> {
    return this.mcp.execute(command);
  }

  /**
   * Check if MCP is available
   */
  isMcpAvailable(): boolean {
    return this.useMcp && this.mcp.isConnected();
  }

  /**
   * Get local execution service
   */
  getLocalService(): LocalExecutionService {
    return this.local;
  }

  /**
   * Get MCP service
   */
  getMcpService(): McpExecutionService {
    return this.mcp;
  }
}

/**
 * Create execution service with default config
 */
export function createExecutionService(config?: Partial<ExecutionConfig>): UnifiedExecutionService {
  const defaultConfig: ExecutionConfig = {
    cwd: process.cwd(),
    env: {},
    shell: process.platform === "win32" ? "cmd.exe" : "/bin/bash",
    timeout: 60000,
    ...config,
  };
  return new UnifiedExecutionService(defaultConfig);
}

/**
 * Create MCP execution service
 */
export async function createMcpExecutionService(
  config: McpClientConfig
): Promise<McpExecutionService> {
  const service = new McpExecutionService();
  await service.initialize(config);
  return service;
}

export { LocalExecutionService, McpExecutionService };
export type { ExecutionConfig, ExecutionOptions, ExecutionResult, ExecutionEvent, McpClientConfig };