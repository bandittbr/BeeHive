"use client";

import { Globe } from "lucide-react";
import type { WebFetchToolPart } from "@/lib/tool-types";
import { cn } from "@/lib/utils";
import { Tool } from "@/components/ui/tool";

interface WebfetchToolProps {
  part: WebFetchToolPart;
}

export function WebfetchTool({ part }: WebfetchToolProps) {
  if (part.state === "output-error") {
    return <Tool toolPart={part} />;
  }

  if (part.state !== "output-available") {
    return <Tool toolPart={part} />;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Globe className="size-4 shrink-0" />
      <span>Fetching</span>
      <a
        href={part.input.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground underline underline-offset-2 hover:no-underline truncate max-w-md"
      >
        {part.input.url}
      </a>
    </div>
  );
}
