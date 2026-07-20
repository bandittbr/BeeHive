"use client";

import * as React from "react";
import { ChevronDown, Sparkles, Settings2, BrainCircuit } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Command,
  CommandCollection,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandHeader,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import { ProviderIcon } from "./ProviderIcon";
import { cn } from "@/lib/utils";

export type ModelRef = {
  providerID: string;
  modelID: string;
};

export type ModelOption = {
  providerID: string;
  modelID: string;
  title: string;
  description?: string;
  isFree?: boolean;
  supportsImages?: boolean;
  behaviorTitle?: string;
  behaviorLabel?: string;
  behaviorDescription?: string;
  behaviorValue?: string | null;
};

type ModelSelectItem = {
  kind: "model";
  id: string;
  option: ModelOption;
};

type ModelSelectGroup = {
  value: string;
  items: ModelSelectItem[];
  promo?: boolean;
};

function getProviderDisplayName(providerId: string) {
  return providerId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function groupByProvider(modelOptions: ModelOption[]): ModelSelectGroup[] {
  const groups = new Map<string, ModelSelectItem[]>();

  for (const option of modelOptions) {
    const providerLabel = option.description ?? getProviderDisplayName(option.providerID);
    const item: ModelSelectItem = {
      kind: "model",
      id: `${option.providerID}:${option.modelID}`,
      option,
    };
    const existing = groups.get(providerLabel);

    if (existing) {
      existing.push(item);
      continue;
    }

    groups.set(providerLabel, [item]);
  }

  return [...groups.entries()]
    .map(([providerLabel, options]) => ({
      value: providerLabel,
      items: [...options].sort((a, b) => a.option.title.localeCompare(b.option.title)),
      promo: false,
    }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

function isSameModel(a: ModelRef, b: ModelOption) {
  return a.providerID === b.providerID && a.modelID === b.modelID;
}

interface ModelSelectProps {
  open: boolean;
  value: ModelRef;
  onOpenChange: (open: boolean) => void;
  onChange: (model: ModelRef) => void;
  options: ModelOption[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ModelSelect({
  open,
  value,
  onOpenChange,
  onChange,
  options,
  disabled = false,
  placeholder = "Select model",
  className,
}: ModelSelectProps) {
  const [search, setSearch] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const focusSearchInput = React.useCallback(() => {
    window.requestAnimationFrame(() => {
      const input = searchInputRef.current;
      if (!input) return;
      input.focus();
      input.select();
    });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    focusSearchInput();
  }, [focusSearchInput, open]);

  const selectedOption = options?.find((option) => isSameModel(value, option));

  const groups = React.useMemo(() => groupByProvider(options), [options]);

  const handleSelect = (option: ModelOption) => {
    onChange({ providerID: option.providerID, modelID: option.modelID });
    setSearch("");
    onOpenChange(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setSearch("");
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              type="button"
              disabled={disabled}
              aria-label="Change model"
              aria-keyshortcuts="Meta+Alt+/"
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-gray-10 transition-colors hover:bg-gray-3 hover:text-gray-12 disabled:pointer-events-none disabled:opacity-60",
                className
              )}
            />
          }
        >
          <span className="max-w-48 truncate">
            {selectedOption?.title ?? value.modelID ?? placeholder}
          </span>
          <ChevronDown className="h-3 w-3" />
        </TooltipTrigger>
        <TooltipContent>Change model</TooltipContent>
      </Tooltip>
      <PopoverContent
        className={cn(
          "h-80 max-h-(--available-height) w-72 gap-0 overflow-hidden p-px **:data-[slot=scroll-area-viewport]:data-has-overflow-y:pe-0.5",
          className
        )}
        align="start"
        initialFocus={false}
      >
        <Command items={groups} value={search} onValueChange={setSearch}>
          <CommandHeader>
            <CommandInput
              ref={searchInputRef}
              placeholder="Search models..."
            />
          </CommandHeader>
          <CommandEmpty>No models found.</CommandEmpty>
          <CommandList>
            {(group: ModelSelectGroup) => (
              <CommandGroup
                key={group.value}
                items={group.items}
              >
                <CommandGroupLabel className={group.promo ? "flex items-center gap-1.5 text-foreground" : undefined}>
                  {group.promo ? <Sparkles className="size-3 text-blue-11" /> : null}
                  {group.value}
                </CommandGroupLabel>
                <CommandCollection>
                  {(item: ModelSelectItem) => {
                    const option = item.option;
                    return (
                      <CommandItem
                        className="gap-2"
                        key={item.id}
                        value={`${option.providerID}:${option.modelID} ${option.title} ${option.description ?? ""}`}
                        onClick={() => handleSelect(option)}
                        data-checked={isSameModel(value, option)}
                      >
                        <ProviderIcon
                          providerId={option.providerID}
                          providerName={option.description}
                          className="size-3.5 opacity-70"
                          size={14}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-foreground">
                            {option.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {option.description ?? getProviderDisplayName(option.providerID)}
                          </span>
                        </span>
                        {!option.supportsImages && (
                          <span className="shrink-0 text-xs text-amber-11" title="Does not support images">âš </span>
                        )}
                      </CommandItem>
                    );
                  }}
                </CommandCollection>
              </CommandGroup>
            )}
          </CommandList>
          <div className="border-t border-border px-2 py-1.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={cn(
                  "flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => {
                  onOpenChange(false);
                  setSearch("");
                }}
              >
                <Settings2 className="size-3.5" />
                All models
              </button>
            </div>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}