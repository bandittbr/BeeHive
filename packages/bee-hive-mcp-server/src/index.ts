import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListResourcesRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { chromium, firefox, webkit, Browser, Page, BrowserContext } from "playwright";
import { spawn, ChildProcess } from "child_process";
import { z } from "zod";
import { randomUUID } from "crypto";

// Tool definitions
const TOOLS = [
  {
    name: "bash",
    description: "Execute a bash command in sandboxed environment",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Command to execute" },
        cwd: { type: "string", description: "Working directory" },
        timeout: { type: "number", description: "Timeout in ms", default: 60000 },
      },
      required: ["command"],
    },
  },
  {
    name: "browse",
    description: "Navigate to URL and return page content",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to navigate to" },
        waitUntil: { type: "string", enum: ["load", "domcontentloaded", "networkidle"], default: "networkidle" },
        timeout: { type: "number", default: 30000 },
      },
      required: ["url"],
    },
  },
  {
    name: "click",
    description: "Click an element on the page",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        button: { type: "string", enum: ["left", "right", "middle"], default: "left" },
      },
      required: ["selector"],
    },
  },
  {
    name: "type",
    description: "Type text into an input field",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        text: { type: "string", description: "Text to type" },
        delay: { type: "number", default: 50 },
      },
      required: ["selector", "text"],
    },
  },
  {
    name: "screenshot",
    description: "Take a screenshot of the page",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to save screenshot" },
        fullPage: { type: "boolean", default: false },
      },
      required: ["path"],
    },
  },
  {
    name: "eval",
    description: "Evaluate JavaScript in the page context",
    inputSchema: {
      type: "object",
      properties: {
        script: { type: "string", description: "JavaScript code to evaluate" },
      },
      required: ["script"],
    },
  },
  {
    name: "wait_for_selector",
    description: "Wait for an element to appear",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        state: { type: "string", enum: ["attached", "detached", "visible", "hidden"], default: "visible" },
        timeout: { type: "number", default: 30000 },
      },
      required: ["selector"],
    },
  },
  {
    name: "read_file",
    description: "Read a file from the sandboxed filesystem",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write a file to the sandboxed filesystem",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path" },
        content: { type: "string", description: "File content" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_files",
    description: "List files in a directory",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path", default: "." },
      },
    },
  },
];

// Sandboxed execution environment
class SandboxedEnvironment {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private workDir: string;
  private allowedPaths: string[];

  constructor(workDir: string = process.cwd()) {
    this.workDir = workDir;
    this.allowedPaths = [workDir, process.cwd()];
  }

  async initBrowser(): Promise<void> {
    if (this.browser) return;
    
    this.browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
      ],
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });
    
    this.page = await this.context.newPage();
    
    // Set default timeouts
    this.page.setDefaultTimeout(30000);
    this.page.setDefaultNavigationTimeout(30000);
  }

  async close(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  getPage(): Page {
    if (!this.page) throw new Error("Browser not initialized");
    return this.page;
  }

  // Bash execution with sandbox
  async executeBash(command: string, cwd?: string, timeout: number = 60000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const resolvedCwd = cwd || this.workDir;
    
    // Security: validate command
    const dangerousPatterns = [
      /rm\s+-rf\s+\//, /rm\s+-rf\s+~\//, />\s*\/dev\/sda/,
      /mkfs/, /dd\s+if=/, /:\(\)\{/, /fork\(\)/, /chmod\s+777/,
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        throw new Error(`Command blocked: potentially dangerous operation detected`);
      }
    }

    return new Promise((resolve, reject) => {
      const { spawn } = require("child_process");
      const isWindows = process.platform === "win32";
      const shell = process.platform === "win32" ? "cmd.exe" : "/bin/bash";
      const shellArgs = isWindows ? ["/c", command] : ["-c", command];

      const child = spawn(shell, shellArgs, {
        cwd: cwd || this.workDir,
        env: { ...process.env, HOME: this.workDir },
        shell: true,
        timeout: timeout,
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data: Buffer) => { stdout += data.toString(); });
      child.stderr?.on("data", (data: Buffer) => { stderr += data.toString(); });

      child.on("close", (code: number | null) => {
        resolve({ stdout, stderr, exitCode: code ?? 0 });
      });

      child.on("error", (err: Error) => {
        reject(err);
      });
    });
  }

  // Browser automation tools
  async browse(url: string, waitUntil: "load" | "domcontentloaded" | "networkidle" = "networkidle", timeout: number = 30000) {
    const page = this.getPage();
    await page.goto(url, { waitUntil, timeout });
    return {
      url: page.url(),
      title: await page.title(),
      content: await page.content(),
    };
  }

  async click(selector: string, button: "left" | "right" | "middle" = "left") {
    const page = this.getPage();
    await page.click(selector, { button });
  }

  async type(selector: string, text: string, delay: number = 50) {
    const page = this.getPage();
    await page.type(selector, text, { delay });
  }

  async screenshot(path: string, fullPage: boolean = false) {
    const page = this.getPage();
    await page.screenshot({ path, fullPage });
  }

  async eval(script: string) {
    const page = this.getPage();
    return await page.evaluate(script);
  }

  async waitForSelector(selector: string, state: "attached" | "detached" | "visible" | "hidden" = "visible", timeout: number = 30000) {
    const page = this.getPage();
    await page.waitForSelector(selector, { state, timeout });
  }

  // File operations
  async readFile(path: string): Promise<string> {
    const fs = require("fs").promises;
    const resolvedPath = require("path").resolve(this.workDir, path);
    
    // Security check
    if (!this.allowedPaths.some(p => resolvedPath.startsWith(p))) {
      throw new Error("Access denied: path outside allowed directories");
    }
    
    return fs.readFile(resolvedPath, "utf-8");
  }

  async writeFile(path: string, content: string): Promise<void> {
    const fs = require("fs").promises;
    const resolvedPath = require("path").resolve(this.workDir, path);
    
    if (!this.allowedPaths.some(p => resolvedPath.startsWith(p))) {
      throw new Error("Access denied: path outside allowed directories");
    }
    
    await fs.mkdir(require("path").dirname(resolvedPath), { recursive: true });
    await fs.writeFile(resolvedPath, content, "utf-8");
  }

  async listFiles(dir: string = "."): Promise<string[]> {
    const fs = require("fs").promises;
    const resolvedPath = require("path").resolve(this.workDir, dir);
    
    if (!this.allowedPaths.some(p => resolvedPath.startsWith(p))) {
      throw new Error("Access denied: path outside allowed directories");
    }
    
    return fs.readdir(resolvedPath);
  }
}

// Create MCP Server
const server = new Server(
  {
    name: "bee-hive-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

const env = new SandboxedEnvironment();

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Ensure browser is initialized for browser tools
    const browserTools = ["browse", "click", "type", "screenshot", "eval", "wait_for_selector"];
    if (browserTools.includes(name)) {
      if (!env["browser"]) {
        const envAny = env as any;
        envAny.browser = true;
        await env.initBrowser();
      }
    }

    switch (name) {
      case "bash": {
        const { command, cwd, timeout } = args as { command: string; cwd?: string; timeout?: number };
        const result = await env.executeBash(command, cwd, timeout);
        return {
          content: [
            { type: "text", text: `stdout:\n${result.stdout}` },
            { type: "text", text: `stderr:\n${result.stderr}` },
            { type: "text", text: `exit_code: ${result.exitCode}` },
          ],
        };
      }

      case "browse": {
        const { url, waitUntil, timeout } = args as { url: string; waitUntil?: string; timeout?: number };
        const result = await env.browse(url, waitUntil as any, timeout);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "click": {
        const { selector, button } = args as { selector: string; button?: string };
        await env.click(selector, button as any);
        return { content: [{ type: "text", text: `Clicked ${selector}` }] };
      }

      case "type": {
        const { selector, text, delay } = args as { selector: string; text: string; delay?: number };
        await env.type(selector, text, delay);
        return { content: [{ type: "text", text: `Typed into ${selector}` }] };
      }

      case "screenshot": {
        const { path, fullPage } = args as { path: string; fullPage?: boolean };
        await env.screenshot(path, fullPage);
        return { content: [{ type: "text", text: `Screenshot saved to ${path}` }] };
      }

      case "eval": {
        const { script } = args as { script: string };
        const result = await env.eval(script);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "wait_for_selector": {
        const { selector, state, timeout } = args as { selector: string; state?: string; timeout?: number };
        await env.waitForSelector(selector, state as any, timeout);
        return { content: [{ type: "text", text: `Element ${selector} is ${state || "visible"}` }] };
      }

      case "read_file": {
        const { path } = args as { path: string };
        const content = await env.readFile(path);
        return { content: [{ type: "text", text: content }] };
      }

      case "write_file": {
        const { path, content } = args as { path: string; content: string };
        await env.writeFile(path, content);
        return { content: [{ type: "text", text: `File written to ${path}` }] };
      }

      case "list_files": {
        const { path } = args as { path?: string };
        const files = await env.listFiles(path || ".");
        return { content: [{ type: "text", text: files.join("\n") }] };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// Resource handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "file:///workspace",
        name: "Workspace",
        description: "Sandboxed workspace directory",
        mimeType: "inode/directory",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  if (uri.startsWith("file://")) {
    const path = uri.replace("file://", "");
    try {
      const content = await require("fs").promises.readFile(path, "utf-8");
      return {
        contents: [{ uri, mimeType: "text/plain", text: content }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InvalidRequest, `Cannot read resource: ${error}`);
    }
  }
  
  throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("BeeHive MCP Server running on stdio");
  
  // Handle shutdown
  process.on("SIGINT", async () => {
    const sandbox = require("./sandbox");
    const env = sandbox.env || (globalThis as any).env;
    if (env) await env.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});