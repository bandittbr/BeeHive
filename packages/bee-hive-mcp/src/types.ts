import { z } from "zod";

// MCP Tool definition
export const McpToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.unknown()),
});

export type McpTool = z.infer<typeof McpToolSchema>;

// MCP Resource definition
export const McpResourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});

export type McpResource = z.infer<typeof McpResourceSchema>;

// MCP Prompt definition
export const McpPromptSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  arguments: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      required: z.boolean().optional(),
    })
  ).optional(),
});

export type McpPrompt = z.infer<typeof McpPromptSchema>;

// MCP Server capabilities
export const McpServerCapabilitiesSchema = z.object({
  tools: z.boolean().optional(),
  resources: z.boolean().optional(),
  prompts: z.boolean().optional(),
  logging: z.boolean().optional(),
});

export type McpServerCapabilities = z.infer<typeof McpServerCapabilitiesSchema>;

// MCP Tool call
export const McpToolCallSchema = z.object({
  name: z.string(),
  arguments: z.record(z.unknown()).optional(),
});

export type McpToolCall = z.infer<typeof McpToolCallSchema>;

// MCP Tool result
export const McpToolResultSchema = z.object({
  content: z.array(
    z.object({
      type: z.enum(["text", "image", "resource"]),
      text: z.string().optional(),
      data: z.string().optional(),
      mimeType: z.string().optional(),
      resource: z
        .object({
          uri: z.string(),
          mimeType: z.string().optional(),
          text: z.string().optional(),
        })
        .optional(),
    })
  ),
  isError: z.boolean().optional(),
});

export type McpToolResult = z.infer<typeof McpToolResultSchema>;

// MCP Read resource result
export const McpReadResourceResultSchema = z.object({
  contents: z.array(
    z.object({
      uri: z.string(),
      mimeType: z.string().optional(),
      text: z.string().optional(),
      blob: z.string().optional(),
    })
  ),
});

export type McpReadResourceResult = z.infer<typeof McpReadResourceResultSchema>;

// MCP Server info
export const McpServerInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  capabilities: McpServerCapabilitiesSchema,
});

export type McpServerInfo = z.infer<typeof McpServerInfoSchema>;