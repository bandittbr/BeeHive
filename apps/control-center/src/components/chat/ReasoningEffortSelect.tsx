import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ReasoningEffortOption = {
  value: string | null;
  label: string;
  description?: string;
};

type ReasoningEffortSelectProps = {
  value: string | null;
  label: string;
  options?: ReasoningEffortOption[];
  onChange: (value: string | null) => void;
  disabled?: boolean;
};

export function ReasoningEffortSelect({
  value,
  label,
  options,
  onChange,
  disabled = false,
}: ReasoningEffortSelectProps) {
  if (!options?.length) {
    return null;
  }

  const items = options.flatMap((option) =>
    option.value ? [{ value: option.value, label: option.label, description: option.description }] : []
  );
  const rawValue = value ?? null;
  const selectValue = items.some((option) => option.value === rawValue)
    ? rawValue
    : items[0]?.value ?? null;

  return (
    <Select
      value={selectValue}
      items={items}
      onValueChange={(nextValue) => {
        const option = options.find((item) => item.value === nextValue);
        if (!option) return;
        onChange(option.value ?? null);
      }}
      disabled={disabled}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <SelectTrigger
              size="sm"
              disabled={disabled}
              aria-label="Reasoning effort"
              className="h-10 border-0 bg-transparent px-2.5 py-1 text-sm rounded-md text-foreground shadow-none hover:bg-muted hover:text-foreground data-[size=sm]:h-8"
            />
          }
        >
          <SelectValue placeholder={label || "Default"} />
        </TooltipTrigger>
        <TooltipContent>Reasoning effort</TooltipContent>
      </Tooltip>
      <SelectContent side="top" sideOffset={8} align="start" className="min-w-48">
        <SelectGroup>
          <SelectLabel>Thinking</SelectLabel>
          {items.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
              {option.description && (
                <span className="ml-auto text-xs text-muted-foreground">{option.description}</span>
              )}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}