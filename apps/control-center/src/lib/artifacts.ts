import type { OpenTarget } from "@/types/open-target"
import { isCollectibleArtifactTarget, isOpenableFileTarget } from "@/types/open-target"

export type ArtifactType = "website" | "markdown" | "sheet" | "slides" | "document" | "image" | "video" | "audio" | "pdf" | "html" | "text" | "unknown"

export type ArtifactItem = {
  id: string
  name: string
  path: string
  type: ArtifactType
  messageId: string
  messageIndex: number
  updatedAt?: number
  legacy_target: OpenTarget
}

const WORKSPACES_PREFIX_PATTERN = /^workspaces\/[^/]+\//i
const WORKSPACE_ID_PREFIX_PATTERN = /^workspace\/(?:ws_[^/]+|\d+|[0-9a-f-]{6,})\//i

export function isMarkdownPreviewSupported(extension: string) {
  return ["md", "markdown", "mdx"].includes(extension)
}

export function isSheetPreviewSupported(extension: string) {
  return ["csv", "tsv", "xlsx", "xls", "ods"].includes(extension)
}

export function isImagePreviewSupported(extension: string) {
  return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)
}

export function isPdfPreviewSupported(extension: string) {
  return ["pdf"].includes(extension)
}

export function isHtmlPreviewSupported(extension: string) {
  return ["html", "htm"].includes(extension)
}

export function isTextPreviewSupported(extension: string) {
  return ["txt", "log", "json", "jsonc", "yaml", "yml", "toml", "xml", "ts", "tsx", "js", "jsx", "css", "scss"].includes(extension)
}

export function isPreviewSupported(extension: string) {
  return isMarkdownPreviewSupported(extension) || isSheetPreviewSupported(extension) || isImagePreviewSupported(extension) || isPdfPreviewSupported(extension) || isHtmlPreviewSupported(extension) || isTextPreviewSupported(extension)
}

export function getArtifactType(filename: string): ArtifactType {
  const extension = getFileExtension(filename)
  if (!extension) return "unknown"

  if (["md", "markdown", "mdx", "rmd", "rst"].includes(extension)) return "markdown"
  if (["csv", "tsv", "xlsx", "xls", "xlsm", "xlsb", "ods", "numbers"].includes(extension)) return "sheet"
  if (["ppt", "pptx", "pptm", "pot", "potx", "odp", "key", "sxi"].includes(extension)) return "slides"
  if (["doc", "docx", "odt", "rtf", "pages"].includes(extension)) return "document"
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "avif", "heic", "heif", "tif", "tiff"].includes(extension)) return "image"
  if (["mp4", "mov", "avi", "mkv", "webm", "wmv", "flv", "m4v", "ogv", "mpeg", "mpg", "3gp"].includes(extension)) return "video"
  if (["mp3", "wav", "flac", "aac", "ogg", "oga", "m4a", "wma", "opus", "aiff", "aif", "mid", "midi"].includes(extension)) return "audio"
  if (["pdf"].includes(extension)) return "pdf"
  if (["html", "htm", "xhtml"].includes(extension)) return "html"
  if (["txt", "log", "json", "jsonc", "json5", "yaml", "yml", "toml", "xml", "ini", "env", "ts", "tsx", "js", "jsx", "mjs", "cjs", "vue", "svelte", "css", "scss", "sass", "less", "py", "rb", "go", "rs", "java", "kt", "swift", "php", "c", "cpp", "h", "cs", "sql", "sh", "bash", "zsh"].includes(extension)) return "text"

  return "unknown"
}

function getFileExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase()
}

function getArtifactName(path: string) {
  const segments = path.split(/[/\\]/)
  return segments[segments.length - 1] ?? path
}

function normalizeArtifactPath(path: string) {
  return path
    .trim()
    .replace(/[\\]+/g, "/")
    .replace(/^\.\//, "")
    .replace(WORKSPACES_PREFIX_PATTERN, "")
    .replace(WORKSPACE_ID_PREFIX_PATTERN, "")
}

function artifactTypeToPreview(type: ArtifactType): OpenTarget["preview"] {
  if (type === "markdown") return "markdown"
  if (type === "sheet") return "sheet"
  if (type === "slides") return "slides"
  if (type === "document") return "document"
  if (type === "image") return "image"
  if (type === "pdf") return "pdf"
  if (type === "html") return "html"
  if (type === "text") return "text"
  if (type === "website") return "browser"
  return "external"
}

function openTargetFromArtifactPath(
  path: string,
  name: string,
  type: ArtifactType,
  verifiedTargets: OpenTarget[],
): OpenTarget {
  const normalized = normalizeArtifactPath(path)
  const id = `file:${normalized.toLowerCase()}`
  const verified = verifiedTargets.find((t) => t.id === id)
  return verified ?? {
    id,
    kind: "file",
    value: normalized,
    name,
    preview: artifactTypeToPreview(type),
    confidence: 95,
    reason: "artifact",
  }
}

export function canPreviewArtifact(artifact: ArtifactItem) {
  return isCollectibleArtifactTarget(artifact.legacy_target)
}

export function canOpenArtifact(artifact: ArtifactItem) {
  return canPreviewArtifact(artifact) || isOpenableFileTarget(artifact.legacy_target)
}
