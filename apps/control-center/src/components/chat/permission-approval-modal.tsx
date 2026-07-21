"use client";

import { Check, ChevronRight, Clock3, HardDrive, RefreshCcw, ShieldCheck, XCircle } from "lucide-react";
import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface PendingPermission {
  id: string;
  permission: string;
  patterns: string[];
  metadata?: Record<string, unknown>;
}

type PermissionPresentation = {
  title: string;
  message: string;
  permissionLabel: string;
  scopeLabel: string;
  scopeValue: string;
  isDoomLoop: boolean;
  note: string | null;
};

type PermissionDetail = {
  label: string;
  value: string;
  multiline?: boolean;
};

type PermissionApprovalModalProps = {
  permission: PendingPermission;
  open: boolean;
  busy?: boolean;
  respondPermission?: (requestID: string, reply: "once" | "always" | "reject") => void;
};

const metadataDetailKeys: Array<{ key: string; label: string; multiline?: boolean }> = [
  { key: "command", label: "Command", multiline: true },
  { key: "description", label: "Description" },
  { key: "cwd", label: "Working Directory" },
  { key: "filepath", label: "File" },
  { key: "filePath", label: "File" },
  { key: "path", label: "Path" },
  { key: "target", label: "Target" },
  { key: "parentDir", label: "Parent Directory" },
  { key: "url", label: "URL" },
  { key: "query", label: "Query", multiline: true },
  { key: "subagent_type", label: "Agent" },
  { key: "tool", label: "Tool" },
  { key: "files", label: "Files", multiline: true },
  { key: "diff", label: "Diff", multiline: true },
];

function readablePermissionLabel(permission: string): string {
  if (permission === "bash") return "Bash";
  if (permission === "edit") return "Edit File";
  if (permission === "read") return "Read File";
  if (permission === "external_directory") return "External Directory";
  if (permission === "task") return "Agent Task";
  if (permission === "todowrite") return "Todo List";
  if (permission === "question") return "Question";
  if (permission === "skill") return "Skill";
  return permission;
}

function permissionCopy(permission: string): Pick<PermissionPresentation, "title" | "message"> {
  if (permission === "bash") {
    return {
      title: "Allow command execution?",
      message: "The agent wants to run a shell command.",
    };
  }
  if (permission === "edit") {
    return {
      title: "Allow file editing?",
      message: "The agent wants to modify a file.",
    };
  }
  if (permission === "read") {
    return {
      title: "Allow file reading?",
      message: "The agent wants to read a file.",
    };
  }
  if (permission === "external_directory") {
    return {
      title: "Allow external directory access?",
      message: "The agent wants to access files outside the workspace.",
    };
  }
  if (permission === "task") {
    return {
      title: "Allow agent task creation?",
      message: "The agent wants to spawn a sub-agent.",
    };
  }
  return {
    title: `Allow ${readablePermissionLabel(permission)}?`,
    message: "The agent is requesting permission to proceed.",
  };
}

function fileChangeLine(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const path =
    (typeof record.relativePath === "string" && record.relativePath.trim()) ||
    (typeof record.filePath === "string" && record.filePath.trim()) ||
    (typeof record.path === "string" && record.path.trim()) ||
    null;
  if (!path) return null;
  const type = typeof record.type === "string" && record.type.trim() ? record.type.trim() : "change";
  return `${type}: ${path}`;
}

function metadataValue(key: string, value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (key === "files" && Array.isArray(value)) {
    const lines = value.flatMap((item) => {
      const line = fileChangeLine(item);
      return line ? [line] : [];
    });
    return lines.length ? lines.join("\n") : null;
  }
  return null;
}

function permissionDetailRows(metadata: Record<string, unknown>): PermissionDetail[] {
  const seen = new Set<string>();
  const rows: PermissionDetail[] = [];
  for (const item of metadataDetailKeys) {
    if (seen.has(item.label)) continue;
    const value = metadataValue(item.key, metadata[item.key]);
    if (!value) continue;
    seen.add(item.label);
    rows.push({
      label: item.label,
      value,
      multiline: item.multiline,
    });
  }
  return rows;
}

function stringifyMetadata(metadata: Record<string, unknown>) {
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return "Metadata unavailable";
  }
}

function describePermissionRequest(permission: PendingPermission): PermissionPresentation {
  const patterns = permission.patterns.filter((pattern) => pattern.trim().length > 0);

  if (permission.permission === "doom_loop") {
    const tool =
      permission.metadata && typeof permission.metadata === "object" && typeof permission.metadata.tool === "string"
        ? permission.metadata.tool
        : null;

    return {
      title: "Repeated tool call detected",
      message: "The agent appears to be stuck in a loop.",
      permissionLabel: "Doom Loop",
      scopeLabel: tool ? "Tool" : "Repeated Call",
      scopeValue: tool ?? (patterns.length ? patterns.join(", ") : "Unknown tool"),
      isDoomLoop: true,
      note: "Consider stopping the agent and revising the prompt.",
    };
  }

  const copy = permissionCopy(permission.permission);
  return {
    title: copy.title,
    message: copy.message,
    permissionLabel: readablePermissionLabel(permission.permission),
    scopeLabel: "Scope",
    scopeValue: patterns.join(", ") || "All",
    isDoomLoop: false,
    note: null,
  };
}

export function PermissionApprovalModal(props: PermissionApprovalModalProps) {
  const presentation = useMemo(() => describePermissionRequest(props.permission), [props.permission]);
  const metadata =
    props.permission.metadata && typeof props.permission.metadata === "object"
      ? props.permission.metadata
      : {};
  const hasMetadata = Object.keys(metadata).length > 0;
  const detailRows = permissionDetailRows(metadata as Record<string, unknown>);
  const Icon = presentation.isDoomLoop ? RefreshCcw : ShieldCheck;
  const iconClass = presentation.isDoomLoop
    ? "bg-amber-3/30 text-amber-11"
    : "bg-blue-3/30 text-blue-11";

  return (
    <Dialog open={props.open}>
      <DialogContent className="w-full max-w-xl">
        <DialogHeader>
          <div className="flex items-start gap-4 text-left">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}>
              <Icon size={23} strokeWidth={1.9} />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>{presentation.title}</DialogTitle>
              <DialogDescription>{presentation.message}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="rounded-2xl border border-border bg-muted/50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Permission
            </div>
            <div className="mt-2 font-mono text-sm leading-6 text-foreground">
              {presentation.permissionLabel}
            </div>
            {presentation.note ? (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {presentation.note}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <HardDrive size={13} />
              {presentation.scopeLabel}
            </div>
            <div className="mt-3 rounded-xl border border-border bg-muted/50 px-3.5 py-3 font-mono text-xs leading-6 text-foreground">
              <span className="block break-all">{presentation.scopeValue}</span>
            </div>
          </div>

          {detailRows.length > 0 ? (
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Details
              </div>
              <div className="mt-3 space-y-3">
                {detailRows.map((row) => (
                  <div key={row.label}>
                    <div className="text-xs font-medium text-muted-foreground">{row.label}</div>
                    <div
                      className={`mt-1 rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-xs leading-5 text-foreground ${
                        row.multiline ? "max-h-44 overflow-auto whitespace-pre-wrap" : "break-all"
                      }`}
                    >
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {hasMetadata ? (
            <details className="group rounded-xl border border-border bg-muted/30 px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium text-foreground">
                <span>Raw Details</span>
                <ChevronRight size={14} className="text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-[11px] leading-5 text-muted-foreground">
                {stringifyMetadata(metadata as Record<string, unknown>)}
              </pre>
            </details>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-xs leading-5 text-muted-foreground">
            Choose how to respond to this permission request.
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_auto_auto]">
            <Button
              variant="destructive"
              className="justify-center sm:justify-self-start"
              onClick={() => props.respondPermission?.(props.permission.id, "reject")}
              disabled={props.busy || !props.respondPermission}
            >
              <XCircle className="size-4 mr-1.5" />
              Deny
            </Button>
            <Button
              onClick={() => props.respondPermission?.(props.permission.id, "once")}
              disabled={props.busy || !props.respondPermission}
            >
              <Clock3 className="size-4 mr-1.5" />
              Allow Once
            </Button>
            <Button
              variant="outline"
              onClick={() => props.respondPermission?.(props.permission.id, "always")}
              disabled={props.busy || !props.respondPermission}
            >
              <Check className="size-4 mr-1.5" />
              Allow for Session
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PermissionApprovalPanel(props: Omit<PermissionApprovalModalProps, "open">) {
  const presentation = useMemo(() => describePermissionRequest(props.permission), [props.permission]);
  const Icon = presentation.isDoomLoop ? RefreshCcw : ShieldCheck;

  return (
    <div className="overflow-hidden border-b border-border bg-muted/20">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
            <Icon size={16} strokeWidth={1.9} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium leading-5 text-foreground">{presentation.title}</div>
            <div className="mt-0.5 text-xs leading-5 text-muted-foreground">{presentation.message}</div>
            {presentation.note ? (
              <div className="mt-1 text-xs leading-5 text-muted-foreground">{presentation.note}</div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="border-red-7/25 text-red-11 hover:bg-red-1/40"
            onClick={() => props.respondPermission?.(props.permission.id, "reject")}
            disabled={props.busy || !props.respondPermission}
          >
            <XCircle className="size-3.5 mr-1" />
            Deny
          </Button>
          <Button
            size="sm"
            onClick={() => props.respondPermission?.(props.permission.id, "once")}
            disabled={props.busy || !props.respondPermission}
          >
            <Clock3 className="size-3.5 mr-1" />
            Allow Once
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => props.respondPermission?.(props.permission.id, "always")}
            disabled={props.busy || !props.respondPermission}
          >
            <Check className="size-3.5 mr-1" />
            Allow for Session
          </Button>
        </div>
      </div>
    </div>
  );
}
