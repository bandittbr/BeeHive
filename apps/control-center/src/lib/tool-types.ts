export interface ToolMetadata {
  truncated?: boolean;
  outputPath?: string;
}

export interface QuestionOption {
  label: string;
  description: string;
}

export interface QuestionPrompt {
  question: string;
  header: string;
  options: QuestionOption[];
  multiple?: boolean;
}

export interface QuestionInput {
  questions: QuestionPrompt[];
}

export interface BashInput {
  command: string;
  timeout?: number;
  workdir?: string;
  description: string;
}

export interface BashMetadata extends ToolMetadata {
  output: string;
  exit: number | null;
  description: string;
  truncated: boolean;
}

export interface ReadInput {
  filePath: string;
  offset?: number;
  limit?: number;
}

export interface GlobInput {
  pattern: string;
  path?: string;
}

export interface GrepInput {
  pattern: string;
  path?: string;
  include?: string;
}

export interface EditInput {
  filePath: string;
  oldString: string;
  newString: string;
  replaceAll?: boolean;
}

export interface WriteInput {
  content: string;
  filePath: string;
}

export interface WebFetchInput {
  url: string;
  format?: "text" | "markdown" | "html";
  timeout?: number;
}

export interface TodoItem {
  content: string;
  status: string;
  priority: string;
}

export interface TodoWriteInput {
  todos: TodoItem[];
}

export interface WebSearchInput {
  query: string;
  numResults?: number;
  livecrawl?: "fallback" | "preferred";
  type?: "auto" | "fast" | "deep";
  contextMaxCharacters?: number;
}

export interface SkillInput {
  name: string;
}

export interface ApplyPatchInput {
  patchText: string;
}

export interface TaskInput {
  description: string;
  prompt: string;
  subagent_type: string;
  task_id?: string;
  command?: string;
  background?: boolean;
}

export type ToolPartState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

export type DynamicToolUIPart = {
  type: "dynamic-tool";
  toolCallId: string;
  toolName: string;
} & (
  | { state: "output-available"; input: unknown; output: string }
  | { state: "output-error"; input: unknown; errorText: string }
  | { state: "input-streaming" | "input-available"; input: unknown }
);

export type ToolUIPart = {
  type: "text" | "reasoning" | "source-url";
  text?: string;
  toolCallId?: string;
};

export type AnyToolPart = ToolUIPart | DynamicToolUIPart;

type BuiltInDynamicToolPart<ToolName extends string, Input, Output = string> =
  DynamicToolUIPart & { toolName: ToolName } & (
    | { state: "output-available"; input: Input; output: Output }
    | { state: "output-error"; input: Input; errorText: string }
    | {
        state: Exclude<DynamicToolUIPart["state"], "output-available" | "output-error">;
        input: Input;
      }
  );

export type BashToolPart = BuiltInDynamicToolPart<"bash", BashInput>;
export type EditToolPart = BuiltInDynamicToolPart<"edit", EditInput>;
export type WriteToolPart = BuiltInDynamicToolPart<"write", WriteInput>;
export type ReadToolPart = BuiltInDynamicToolPart<"read", ReadInput>;
export type GrepToolPart = BuiltInDynamicToolPart<"grep", GrepInput>;
export type GlobToolPart = BuiltInDynamicToolPart<"glob", GlobInput>;
export type ApplyPatchToolPart = BuiltInDynamicToolPart<"apply_patch", ApplyPatchInput>;
export type SkillToolPart = BuiltInDynamicToolPart<"skill", SkillInput>;
export type TodoWriteToolPart = BuiltInDynamicToolPart<"todowrite", TodoWriteInput>;
export type WebFetchToolPart = BuiltInDynamicToolPart<"webfetch", WebFetchInput>;
export type WebSearchToolPart = BuiltInDynamicToolPart<"websearch", WebSearchInput>;
export type QuestionToolPart = BuiltInDynamicToolPart<"question", QuestionInput>;
export type TaskToolPart = BuiltInDynamicToolPart<"task", TaskInput>;

export function isBashToolPart(part: AnyToolPart): part is BashToolPart {
  return part.type === "dynamic-tool" && part.toolName === "bash";
}

export function isEditToolPart(part: AnyToolPart): part is EditToolPart {
  return part.type === "dynamic-tool" && part.toolName === "edit";
}

export function isWriteToolPart(part: AnyToolPart): part is WriteToolPart {
  return part.type === "dynamic-tool" && part.toolName === "write";
}

export function isReadToolPart(part: AnyToolPart): part is ReadToolPart {
  return part.type === "dynamic-tool" && part.toolName === "read";
}

export function isGrepToolPart(part: AnyToolPart): part is GrepToolPart {
  return part.type === "dynamic-tool" && part.toolName === "grep";
}

export function isGlobToolPart(part: AnyToolPart): part is GlobToolPart {
  return part.type === "dynamic-tool" && part.toolName === "glob";
}

export function isApplyPatchToolPart(part: AnyToolPart): part is ApplyPatchToolPart {
  return part.type === "dynamic-tool" && part.toolName === "apply_patch";
}

export function isSkillToolPart(part: AnyToolPart): part is SkillToolPart {
  return part.type === "dynamic-tool" && part.toolName === "skill";
}

export function isTodoWriteToolPart(part: AnyToolPart): part is TodoWriteToolPart {
  return part.type === "dynamic-tool" && part.toolName === "todowrite";
}

export function isWebFetchToolPart(part: AnyToolPart): part is WebFetchToolPart {
  return part.type === "dynamic-tool" && part.toolName === "webfetch";
}

export function isWebSearchToolPart(part: AnyToolPart): part is WebSearchToolPart {
  return part.type === "dynamic-tool" && part.toolName === "websearch";
}

export function isQuestionToolPart(part: AnyToolPart): part is QuestionToolPart {
  return part.type === "dynamic-tool" && part.toolName === "question";
}

export function isTaskToolPart(part: AnyToolPart): part is TaskToolPart {
  return part.type === "dynamic-tool" && part.toolName === "task";
}
