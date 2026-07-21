export interface ToolMetadata {
  truncated?: boolean
  outputPath?: string
}

export interface BashInput {
  command: string
  timeout?: number
  workdir?: string
  description: string
}

export interface BashMetadata extends ToolMetadata {
  output: string
  exit: number | null
  description: string
  truncated: boolean
}

export interface ReadInput {
  filePath: string
  offset?: number
  limit?: number
}

export interface ReadMetadata extends ToolMetadata {
  preview: string
  truncated: boolean
  loaded: string[]
}

export interface GlobInput {
  pattern: string
  path?: string
}

export interface GlobMetadata extends ToolMetadata {
  count: number
  truncated: boolean
}

export interface GrepInput {
  pattern: string
  path?: string
  include?: string
}

export interface GrepMetadata extends ToolMetadata {
  matches: number
  truncated: boolean
}

export interface FileDiff {
  file: string
  patch: string
  additions: number
  deletions: number
}

export interface EditInput {
  filePath: string
  oldString: string
  newString: string
  replaceAll?: boolean
}

export interface EditMetadata extends ToolMetadata {
  diagnostics: unknown
  diff: string
  filediff: FileDiff
}

export interface WriteInput {
  content: string
  filePath: string
}

export interface WriteMetadata extends ToolMetadata {
  diagnostics: unknown
  filepath: string
  exists: boolean
}

export interface TaskInput {
  description: string
  prompt: string
  subagent_type: string
  task_id?: string
  command?: string
  background?: boolean
}

export interface TaskMetadata extends ToolMetadata {
  parentSessionId: string
  sessionId: string
  model: { modelID: string; providerID: string }
  background?: true
  jobId?: string
}

export interface QuestionOption {
  label: string
  description: string
}

export interface QuestionPrompt {
  question: string
  header: string
  options: QuestionOption[]
  multiple?: boolean
}

export interface QuestionInput {
  questions: QuestionPrompt[]
}

export interface QuestionMetadata extends ToolMetadata {
  answers: string[][]
}

export interface EnvVarRequestInput {
  key: string
  label?: string
  description?: string
  placeholder?: string
  helpUrl?: string
  followUpPrompt?: string
}

export interface WebFetchInput {
  url: string
  format?: "text" | "markdown" | "html"
  timeout?: number
}

export interface WebSearchInput {
  query: string
  numResults?: number
  livecrawl?: "fallback" | "preferred"
  type?: "auto" | "fast" | "deep"
  contextMaxCharacters?: number
}

export interface WebSearchMetadata extends ToolMetadata {
  provider: string
}

export interface TodoItem {
  content: string
  status: string
  priority: string
}

export interface TodoWriteInput {
  todos: TodoItem[]
}

export interface ApplyPatchInput {
  patchText: string
}

export interface ApplyPatchFile {
  filePath: string
  relativePath: string
  type: "add" | "update" | "delete" | "move"
  patch: string
  additions: number
  deletions: number
  movePath?: string
}

export interface ApplyPatchMetadata extends ToolMetadata {
  diff: string
  files: ApplyPatchFile[]
  diagnostics: unknown
}

export interface SkillInput {
  name: string
}

export interface SkillMetadata extends ToolMetadata {
  name: string
  dir: string
}

export type ToolPartState = "input-streaming" | "input-available" | "output-available" | "output-error"

export interface DynamicToolPart {
  type: "dynamic-tool"
  toolName: string
  state: ToolPartState
  input: any
  output?: any
  errorText?: string
}

export type ToolUIPart = DynamicToolPart

export function isBashToolPart(part: ToolUIPart): part is ToolUIPart & { toolName: "bash"; input: BashInput } {
  return part.type === "dynamic-tool" && part.toolName === "bash"
}

export function isEditToolPart(part: ToolUIPart): part is ToolUIPart & { toolName: "edit"; input: EditInput } {
  return part.type === "dynamic-tool" && part.toolName === "edit"
}

export function isWriteToolPart(part: ToolUIPart): part is ToolUIPart & { toolName: "write"; input: WriteInput } {
  return part.type === "dynamic-tool" && part.toolName === "write"
}

export function isReadToolPart(part: ToolUIPart): part is ToolUIPart & { toolName: "read"; input: ReadInput } {
  return part.type === "dynamic-tool" && part.toolName === "read"
}

export function isGrepToolPart(part: ToolUIPart): part is ToolUIPart & { toolName: "grep"; input: GrepInput } {
  return part.type === "dynamic-tool" && part.toolName === "grep"
}

export function isGlobToolPart(part: ToolUIPart): part is ToolUIPart & { toolName: "glob"; input: GlobInput } {
  return part.type === "dynamic-tool" && part.toolName === "glob"
}

export function isApplyPatchToolPart(part: ToolUIPart): part is ToolUIPart & { toolName: "apply_patch"; input: ApplyPatchInput } {
  return part.type === "dynamic-tool" && part.toolName === "apply_patch"
}

export function isSkillToolPart(part: ToolUIPart): part is ToolUIPart & { toolName: "skill"; input: SkillInput } {
  return part.type === "dynamic-tool" && part.toolName === "skill"
}

export function isTodoWriteToolPart(part: ToolUIPart): part is ToolUIPart & { toolName: "todowrite"; input: TodoWriteInput } {
  return part.type === "dynamic-tool" && part.toolName === "todowrite"
}

export function isWebFetchToolPart(part: ToolUIPart): part is ToolUIPart & { toolName: "webfetch"; input: WebFetchInput } {
  return part.type === "dynamic-tool" && part.toolName === "webfetch"
}

export function isWebSearchToolPart(part: ToolUIPart): part is ToolUIPart & { toolName: "websearch"; input: WebSearchInput } {
  return part.type === "dynamic-tool" && part.toolName === "websearch"
}

export function isQuestionToolPart(part: ToolUIPart): part is ToolUIPart & { toolName: "question"; input: QuestionInput } {
  return part.type === "dynamic-tool" && part.toolName === "question"
}

export function isEnvVarRequestToolPart(part: ToolUIPart): part is ToolUIPart & { toolName: string; input: EnvVarRequestInput } {
  return part.type === "dynamic-tool" && (part.toolName === "request_env_var" || part.toolName === "env_var_request")
}

export function isTaskToolPart(part: ToolUIPart): part is ToolUIPart & { toolName: "task"; input: TaskInput } {
  return part.type === "dynamic-tool" && part.toolName === "task"
}

export function isLspToolPart(part: ToolUIPart): part is ToolUIPart & { toolName: "lsp" } {
  return part.type === "dynamic-tool" && part.toolName === "lsp"
}
