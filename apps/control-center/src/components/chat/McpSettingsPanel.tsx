"use client";

import { useState } from "react";
import { Plus, Trash2, RefreshCcw, Wifi, WifiOff, AlertCircle, Loader2, ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMcpStore, type McpServerEntry } from "@/stores/mcpStore";
import { cn } from "@/lib/utils";

function generateId() {
  return `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ServerCard({ entry }: { entry: McpServerEntry }) {
  const { removeServer, updateServer, connectServer, disconnectServer } = useMcpStore();
  const [expanded, setExpanded] = useState(false);
  const { config, status, tools, error } = entry;

  const statusColors = {
    disconnected: "text-muted-foreground",
    connecting: "text-amber-500",
    connected: "text-green-500",
    error: "text-red-500",
  };

  const statusLabels = {
    disconnected: "Disconnected",
    connecting: "Connecting...",
    connected: "Connected",
    error: "Error",
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {status === "connected" ? (
            <Wifi className="size-4 text-green-500 shrink-0" />
          ) : status === "connecting" ? (
            <Loader2 className="size-4 text-amber-500 shrink-0 animate-spin" />
          ) : status === "error" ? (
            <AlertCircle className="size-4 text-red-500 shrink-0" />
          ) : (
            <WifiOff className="size-4 text-muted-foreground shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{config.name}</div>
            <div className="text-xs text-muted-foreground truncate">{config.serverUrl}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-xs", statusColors[status])}>
            {statusLabels[status]}
          </span>
          {tools.length > 0 && (
            <span className="text-xs bg-muted rounded-full px-1.5 py-0.5">
              {tools.length} tools
            </span>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={config.name}
                onChange={(e) => updateServer(config.id, { name: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Server URL</Label>
              <Input
                value={config.serverUrl}
                onChange={(e) => updateServer(config.id, { serverUrl: e.target.value })}
                placeholder="https://example.com/mcp"
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Auth Type</Label>
              <select
                value={config.authType}
                onChange={(e) => updateServer(config.id, { authType: e.target.value as "none" | "api-key" })}
                className="mt-1 w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="none">None</option>
                <option value="api-key">API Key</option>
              </select>
            </div>
            {config.authType === "api-key" && (
              <div>
                <Label className="text-xs">API Key</Label>
                <Input
                  type="password"
                  value={config.apiKey ?? ""}
                  onChange={(e) => updateServer(config.id, { apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="mt-1 h-8 text-xs"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Enabled</Label>
              <button
                onClick={() => updateServer(config.id, { enabled: !config.enabled })}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                  config.enabled ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                    config.enabled ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-500 bg-red-500/10 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {tools.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Discovered Tools ({tools.length})</Label>
              <div className="max-h-40 overflow-auto space-y-1 mt-1">
                {tools.map((tool) => (
                  <div
                    key={tool.name}
                    className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2 py-1.5"
                  >
                    <Wrench className="size-3 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{tool.name}</span>
                    {tool.description && (
                      <span className="text-muted-foreground truncate flex-1">
                        — {tool.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {status === "connected" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnectServer(config.id)}
                className="h-7 text-xs"
              >
                <WifiOff className="size-3 mr-1" />
                Disconnect
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => connectServer(config.id)}
                disabled={status === "connecting" || !config.enabled || !config.serverUrl}
                className="h-7 text-xs"
              >
                {status === "connecting" ? (
                  <Loader2 className="size-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCcw className="size-3 mr-1" />
                )}
                {status === "connecting" ? "Connecting..." : "Connect"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => removeServer(config.id)}
              className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
            >
              <Trash2 className="size-3 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function McpSettingsPanel() {
  const { servers, addServer } = useMcpStore();

  const handleAddServer = () => {
    addServer({
      id: generateId(),
      name: "New MCP Server",
      serverUrl: "",
      authType: "none",
      enabled: true,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">MCP Servers</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect to Model Context Protocol servers for extended tool capabilities.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleAddServer} className="h-8 text-xs">
          <Plus className="size-3.5 mr-1" />
          Add Server
        </Button>
      </div>

      {servers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <WifiOff className="size-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No MCP servers configured</p>
          <p className="text-xs mt-1">Add a server to get started with extended tools.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {servers.map((entry) => (
            <ServerCard key={entry.config.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
