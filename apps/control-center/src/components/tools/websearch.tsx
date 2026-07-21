"use client";

import { Search } from "lucide-react";
import type { WebSearchToolPart } from "@/lib/tool-types";
import { Tool } from "@/components/ui/tool";
import { CollapsibleTool, CollapsibleToolContent, CollapsibleToolStep, CollapsibleToolTrigger } from "@/components/tools/collapsible-tool";

interface WebsearchToolProps {
  part: WebSearchToolPart;
}

interface SearchResult {
  title: string;
  url: string;
  description?: string;
}

function parseWebSearchResults(output: string): SearchResult[] {
  try {
    const parsed = JSON.parse(output);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.results && Array.isArray(parsed.results)) return parsed.results;
  } catch {
    // ignore
  }
  return [];
}

export function WebsearchTool({ part }: WebsearchToolProps) {
  if (part.state === "output-error") {
    return <Tool toolPart={part} />;
  }

  if (part.state !== "output-available") {
    return <Tool toolPart={part} />;
  }

  const results = parseWebSearchResults(part.output);

  return (
    <CollapsibleTool>
      <CollapsibleToolStep>
        <CollapsibleToolTrigger leftIcon={<Search className="size-4" />}>
          {results.length > 0 ? `Searching for "${part.input.query}"` : "Web search (No results)"}
        </CollapsibleToolTrigger>
        <CollapsibleToolContent className="bg-muted rounded-lg p-2">
          <div className="flex flex-wrap items-center gap-2">
            {results.map((result) => (
              <a
                key={result.url}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-background/50 px-2 py-1 text-xs hover:bg-accent transition-colors"
              >
                <img
                  src={`https://www.google.com/s2/favicons?domain=${new URL(result.url).hostname}&sz=16`}
                  alt=""
                  className="size-3.5 rounded-sm"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span className="truncate max-w-[200px]">{result.title}</span>
              </a>
            ))}
          </div>
        </CollapsibleToolContent>
      </CollapsibleToolStep>
    </CollapsibleTool>
  );
}
