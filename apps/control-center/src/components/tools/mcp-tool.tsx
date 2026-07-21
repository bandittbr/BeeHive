"use client";

import { Wrench, LoaderCircle, CircleAlert } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { isToolPartInFlight } from "@/lib/tool-activity";
import type { DynamicToolUIPart } from "@/lib/tool-types";

interface McpToolRendererProps {
  part: DynamicToolUIPart;
}

const formatValue = (value: unknown): string => {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

export function McpToolRenderer({ part }: McpToolRendererProps) {
  const inFlight = isToolPartInFlight(part);
  const isError = part.state === "output-error";
  const hasInput = part.input !== null && part.input !== undefined;
  const hasOutput = "output" in part && part.output !== undefined;

  const label = part.toolName.replace(/[_-]+/g, " ");

  return (
    <Collapsible defaultOpen={false}>
      <div className="flex min-w-0 items-center gap-2" aria-live="polite">
        <CollapsibleTrigger
          className="group text-muted-foreground hover:text-foreground flex min-w-0 flex-1 cursor-pointer items-center justify-start gap-2 overflow-hidden text-start text-sm transition-colors"
        >
          <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
            <span className="transition-opacity group-hover:opacity-0">
              {inFlight ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : isError ? (
                <CircleAlert className="text-destructive size-4" />
              ) : (
                <Wrench className="size-3.5" />
              )}
            </span>
          </span>
          <span className="min-w-0 truncate">{label}</span>
          {isError && (
            <span className="text-destructive shrink-0 text-xs">failed</span>
          )}
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="overflow-hidden transition-all duration-150 ease-out data-[state=closed]:h-0 data-[state=open]:h-auto">
        <div className="bg-muted mt-2 flex flex-col gap-2 rounded-lg p-2 text-xs">
          {hasInput && (
            <pre className="whitespace-pre-wrap wrap-break-word">
              {formatValue(part.input)}
            </pre>
          )}
          {hasOutput && (
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap wrap-break-word opacity-80">
              {formatValue(part.output)}
            </pre>
          )}
          {isError && "errorText" in part && part.errorText && (
            <pre className="text-destructive whitespace-pre-wrap wrap-break-word">
              {part.errorText}
            </pre>
          )}
          {inFlight && !hasInput && (
            <span className="text-muted-foreground">Waiting for input...</span>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
