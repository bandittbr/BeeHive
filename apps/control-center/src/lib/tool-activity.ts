import {
  isApplyPatchToolPart,
  isBashToolPart,
  isEditToolPart,
  isGlobToolPart,
  isGrepToolPart,
  isQuestionToolPart,
  isReadToolPart,
  isSkillToolPart,
  isTaskToolPart,
  isTodoWriteToolPart,
  isWebFetchToolPart,
  isWebSearchToolPart,
  isWriteToolPart,
  type AnyToolPart,
  type DynamicToolUIPart,
} from "@/lib/tool-types";
import { parseFilename, truncateText } from "@/components/tools/path";

export function isToolPartInFlight(part: AnyToolPart): boolean {
  return part.type === "dynamic-tool" && (part.state === "input-streaming" || part.state === "input-available");
}

export function collectToolParts(messages: { parts?: AnyToolPart[] }[]): DynamicToolUIPart[] {
  return messages.flatMap((message) =>
    (message.parts ?? []).filter(
      (part): part is DynamicToolUIPart => part.type === "dynamic-tool"
    )
  );
}

function hostnameOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

export function getToolActivityLabel(part: AnyToolPart): string {
  if (isBashToolPart(part)) {
    const description = part.input?.description?.trim();
    return description ? truncateText(description, 64) : "Running a command";
  }
  if (isReadToolPart(part)) {
    return `Reading ${parseFilename(part.input?.filePath)}`;
  }
  if (isEditToolPart(part)) {
    return `Editing ${parseFilename(part.input?.filePath)}`;
  }
  if (isWriteToolPart(part)) {
    return `Writing ${parseFilename(part.input?.filePath)}`;
  }
  if (isApplyPatchToolPart(part)) {
    return "Applying changes";
  }
  if (isGrepToolPart(part) || isGlobToolPart(part)) {
    const pattern = part.input?.pattern?.trim();
    return pattern
      ? `Searching for ${truncateText(pattern, 44)}`
      : "Searching files";
  }
  if (isSkillToolPart(part)) {
    const name = part.input?.name?.trim();
    return name ? `Loading ${name} skill` : "Loading a skill";
  }
  if (isTodoWriteToolPart(part)) {
    return "Updating the plan";
  }
  if (isWebFetchToolPart(part)) {
    const host = hostnameOf(part.input?.url);
    return host ? `Reading ${host}` : "Fetching a page";
  }
  if (isWebSearchToolPart(part)) {
    const query = part.input?.query?.trim();
    return query
      ? `Searching the web for ${truncateText(query, 44)}`
      : "Searching the web";
  }
  if (isQuestionToolPart(part)) {
    return "Asking a question";
  }
  if (isTaskToolPart(part)) {
    const description = part.input?.description?.trim();
    return description
      ? `Agent: ${truncateText(description, 56)}`
      : "Running an agent";
  }
  if (part.type === "dynamic-tool") {
    return `Running ${part.toolName.replace(/[_-]+/g, " ")}`;
  }
  return "Working";
}

export function getActiveToolLabel(parts: DynamicToolUIPart[]): string | null {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index];
    if (part && isToolPartInFlight(part)) {
      return getToolActivityLabel(part);
    }
  }
  return null;
}
