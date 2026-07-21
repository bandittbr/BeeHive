import { memo, useEffect, useMemo, useRef, useState } from "react"
import DOMPurify from "dompurify"
import { Marked, type Tokens } from "marked"
import { markedEmoji } from "marked-emoji"
import markedShiki from "marked-shiki"
import {
  transformerMetaHighlight,
  transformerMetaWordHighlight,
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationFocus,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers"
import { bundledLanguages, codeToHtml } from "shiki"

import { cn } from "@/lib/utils"
import { useOpenTargets } from "@/lib/target-provider"
import type { OpenTarget } from "@/types/open-target"

import { applyTextHighlights } from "./text-highlights"

const WORKSPACES_PREFIX_PATTERN = /^workspaces\/[^/]+\//i
const WORKSPACE_ID_PREFIX_PATTERN = /^workspace\/(?:ws_[^/]+|\d+|[0-9a-f-]{6,})\//i

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;")
}

function safeHref(href: string) {
  const trimmed = href.trim()
  if (!trimmed) return "#"
  if (trimmed.startsWith("#") || trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) return trimmed
  try {
    const parsed = new URL(trimmed)
    if (["http:", "https:", "mailto:"].includes(parsed.protocol)) return trimmed
  } catch { return "#" }
  return "#"
}

function localPathFromHref(href: string) {
  const trimmed = href.trim()
  if (!trimmed || trimmed.startsWith("#") || /^(?:https?|mailto):/i.test(trimmed)) return ""
  if (/^file:/i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed)
      const host = decodeURIComponent(parsed.hostname)
      const pathname = decodeURIComponent(parsed.pathname)
      const localPath = /^\/[A-Za-z]:\//.test(pathname) ? pathname.slice(1) : pathname
      if (host && host !== "localhost") return `//${host}${localPath.startsWith("/") ? localPath : `/${localPath}`}`
      return localPath
    } catch { return "" }
  }
  return trimmed.split(/[?#]/)[0] ?? trimmed
}

function normalizeFilePathForMatch(path: string) {
  return path
    .trim()
    .replace(/[\\]+/g, "/")
    .replace(/^\.\//, "")
    .replace(WORKSPACES_PREFIX_PATTERN, "")
    .replace(WORKSPACE_ID_PREFIX_PATTERN, "")
    .replace(/[/]+$/, "")
    .toLowerCase()
}

function filePathMatchesTarget(path: string, targetValue: string) {
  const normalizedPath = normalizeFilePathForMatch(path)
  const normalizedTarget = normalizeFilePathForMatch(targetValue)
  return normalizedPath === normalizedTarget || normalizedPath.endsWith(`/${normalizedTarget}`)
}

function openTargetForHref(href: string, openTargets: OpenTarget[]) {
  const path = localPathFromHref(href)
  if (!path) return null
  return openTargets.find((target) => target.kind === "file" && filePathMatchesTarget(path, target.value)) ?? null
}

function alignAttribute(align: Tokens.TableCell["align"]) {
  return align ? ` style="text-align: ${align}"` : ""
}

function codeLanguageClass(lang: string | undefined) {
  const normalized = lang?.trim().split(/\s+/)[0]
  return normalized ? ` class="language-${escapeAttribute(normalized)}"` : ""
}

function parseShikiLanguage(lang: string) {
  const normalized = lang.trim().split(/\s+/)[0]?.toLowerCase() ?? ""
  return normalized in bundledLanguages ? normalized : "text"
}

function hasFencedCodeBlock(text: string) {
  return /(^|\n)```/.test(text)
}

const MARKDOWN_IMAGE_PREVIEW_MAX_HEIGHT = 100

function estimatedRenderedImageHeight(image: HTMLImageElement) {
  if (!image.naturalWidth || !image.naturalHeight) return 0
  const renderedWidth = image.clientWidth || image.getBoundingClientRect().width
  return renderedWidth > 0
    ? (image.naturalHeight / image.naturalWidth) * renderedWidth
    : image.naturalHeight
}

function syncMarkdownImagePreviews(root: HTMLElement) {
  const previews = root.querySelectorAll("[data-beehive-image-preview]")
  for (const preview of previews) {
    if (!(preview instanceof HTMLElement)) continue
    const image = preview.querySelector("img")
    const button = preview.querySelector("[data-beehive-image-toggle]")
    if (!(image instanceof HTMLImageElement) || !(button instanceof HTMLButtonElement)) continue

    const previewable = estimatedRenderedImageHeight(image) > MARKDOWN_IMAGE_PREVIEW_MAX_HEIGHT
    button.hidden = !previewable
    if (!previewable) { preview.style.maxHeight = ""; continue }

    const expanded = preview.dataset.beehiveImagePreview === "expanded"
    preview.style.maxHeight = expanded ? "" : `${MARKDOWN_IMAGE_PREVIEW_MAX_HEIGHT}px`
    const label = button.querySelector("[data-beehive-image-toggle-label]")
    if (label) label.textContent = expanded ? "Show less" : "Show full image"
  }
}

function sanitizeMarkdownHtml(value: string) {
  return DOMPurify.sanitize(value, {
    ADD_ATTR: [
      "checked", "class",
      "data-beehive-image-preview", "data-beehive-image-toggle", "data-beehive-image-toggle-label",
      "data-beehive-link-href", "data-beehive-link-chevron",
      "data-beehive-shiki",
      "decoding", "disabled", "hidden", "loading", "rel", "start", "style", "target",
    ],
  })
}

const baseMarkedOptions = {
  async: false,
  breaks: false,
  gfm: true,
  pedantic: false,
  silent: true,
  renderer: {
    html({ text }: { text: string }) { return text },
    paragraph({ tokens }: { tokens: Tokens.Generic[] }) {
      return `<p class="my-3 leading-relaxed">${this.parser.parseInline(tokens)}</p>`
    },
    heading({ tokens, depth }: { tokens: Tokens.Generic[]; depth: number }) {
      const className = cn(
        "font-semibold",
        depth === 1 && "my-5 text-xl",
        depth === 2 && "my-4 text-lg",
        depth >= 3 && "my-3 text-base",
      )
      return `<h${depth} class="${className}">${this.parser.parseInline(tokens)}</h${depth}>`
    },
    list(token: Tokens.List) {
      const tag = token.ordered ? "ol" : "ul"
      const className = cn("my-3 pl-6", token.ordered ? "list-decimal" : "list-disc")
      const start = token.ordered && typeof token.start === "number" && token.start !== 1 ? ` start="${token.start}"` : ""
      return `<${tag}${start} class="${className}">${token.items.map((item) => this.listitem(item)).join("")}</${tag}>`
    },
    listitem(item: Tokens.ListItem) {
      const checkbox = item.task ? `<input disabled="" type="checkbox"${item.checked ? ' checked=""' : ""}> ` : ""
      return `<li class="my-1">${checkbox}${this.parser.parse(item.tokens)}</li>`
    },
    blockquote({ tokens }: { tokens: Tokens.Generic[] }) {
      return `<blockquote class="my-4 rounded-r-lg border-l-2 border-border bg-muted/40 pl-4 italic text-muted-foreground">${this.parser.parse(tokens)}</blockquote>`
    },
    code({ text, lang }: { text: string; lang?: string }) {
      return `<pre class="my-4 overflow-x-auto rounded-xl border border-border bg-muted/50 px-4 py-3 text-[13px] leading-6 text-muted-foreground"><code${codeLanguageClass(lang)}>${escapeHtml(text)}</code></pre>`
    },
    codespan({ text }: { text: string }) {
      return `<code class="rounded-md bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">${escapeHtml(text)}</code>`
    },
    del({ raw, tokens }: { raw: string; tokens: Tokens.Generic[] }) {
      if (!raw.startsWith("~~")) return escapeHtml(raw)
      return `<del>${this.parser.parseInline(tokens)}</del>`
    },
    link({ href, title, tokens }: { href: string; title?: string; tokens: Tokens.Generic[] }) {
      const safe = escapeAttribute(safeHref(href))
      const originalHref = escapeAttribute(href)
      const titleAttr = title ? ` title="${escapeAttribute(title)}"` : ""
      const isFilePath = !/^(https?|wss?|ftp|mailto|tel|file):/i.test(href)

      if (isFilePath) {
        const fileIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-muted-foreground"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/></svg>`
        const chevron = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-muted-foreground"><path d="m6 9 6 6 6-6"/></svg>`
        return `<span class="inline-flex items-stretch overflow-hidden rounded-md border border-border/60 bg-muted/40 text-xs font-medium text-foreground align-middle"><a href="${safe}" data-beehive-link-href="${originalHref}"${titleAttr} target="_blank" rel="noreferrer noopener" class="inline-flex items-center gap-1 px-1.5 py-0.5 no-underline transition-colors hover:bg-muted">${fileIcon}${this.parser.parseInline(tokens)}</a><button type="button" data-beehive-link-chevron="${originalHref}" class="inline-flex items-center border-l border-border/60 px-1 transition-colors hover:bg-muted" aria-label="Open with">${chevron}</button></span>`
      }

      return `<a href="${safe}" data-beehive-link-href="${originalHref}"${titleAttr} target="_blank" rel="noreferrer noopener" class="text-primary underline underline-offset-2 transition-colors hover:text-primary/80">${this.parser.parseInline(tokens)}</a>`
    },
    image({ href, title, text }: { href: string; title?: string; text: string }) {
      const safe = escapeAttribute(safeHref(href))
      const titleAttr = title ? ` title="${escapeAttribute(title)}"` : ""
      return `<span data-beehive-image-preview="collapsed" class="relative my-4 inline-block max-w-full overflow-hidden rounded-lg border border-border align-top" style="max-height: ${MARKDOWN_IMAGE_PREVIEW_MAX_HEIGHT}px"><img src="${safe}" alt="${escapeAttribute(text)}"${titleAttr} loading="lazy" decoding="async" class="block h-auto max-w-full"><button type="button" data-beehive-image-toggle="" hidden class="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-background via-background/90 to-transparent pb-2 pt-8"><span data-beehive-image-toggle-label="" class="rounded-full border border-border bg-background/95 px-3 py-1 text-xs font-medium text-foreground shadow-sm">Show full image</span></button></span>`
    },
    table(token: Tokens.Table) {
      const header = token.header.map((cell) => this.tablecell({ ...cell, header: true })).join("")
      const body = token.rows.map((row) => this.tablerow({ text: row.map((cell) => this.tablerow(cell)).join("") })).join("")
      return `<table class="my-4 w-full border-collapse"><thead>${this.tablerow({ text: header })}</thead><tbody>${body}</tbody></table>`
    },
    tablerow({ text }: { text: string }) { return `<tr>${text}</tr>` },
    tablecell({ tokens, header, align }: { tokens: Tokens.Generic[]; header: boolean; align: Tokens.TableCell["align"] }) {
      const className = cn("border border-border p-2", header ? "bg-muted text-left" : "align-top")
      if (header) return `<th${alignAttribute(align)} class="${className}">${this.parser.parseInline(tokens)}</th>`
      return `<td${alignAttribute(align)} class="${className}">${this.parser.parseInline(tokens)}</td>`
    },
    hr() { return `<hr class="my-6 border-none h-px bg-border">` },
  },
} satisfies ConstructorParameters<typeof Marked<string, string>>[0]

const markdownParser = new Marked(baseMarkedOptions).use(
  markedEmoji({
    emojis: {},
    renderer: (token: any) => escapeHtml(token.emoji),
  }),
)

const highlightedMarkdownParser = new Marked({
  ...baseMarkedOptions,
  async: true,
}).use(
  markedEmoji({
    emojis: {},
    renderer: (token: any) => escapeHtml(token.emoji),
  }),
  markedShiki({
    async highlight(code: string, lang: string, props: string[]) {
      const language = parseShikiLanguage(lang)
      return codeToHtml(code, {
        lang: language,
        meta: { __raw: props.join(" ") },
        theme: "github-light",
        transformers: [
          transformerNotationDiff({ matchAlgorithm: "v3" }),
          transformerNotationHighlight({ matchAlgorithm: "v3" }),
          transformerNotationWordHighlight({ matchAlgorithm: "v3" }),
          transformerNotationFocus({ matchAlgorithm: "v3" }),
          transformerNotationErrorLevel({ matchAlgorithm: "v3" }),
          transformerMetaHighlight(),
          transformerMetaWordHighlight(),
        ],
      })
    },
    container: `<div data-beehive-shiki="true" class="my-4 overflow-x-auto rounded-xl border border-border bg-muted/50 p-4 text-[13px] leading-6">%s</div>`,
  }),
)

type MarkdownBlockProps = {
  className?: string
  text: string
  streaming?: boolean
  highlightQuery?: string
  id?: string
}

function MarkdownBlockInner({
  className,
  text,
  streaming,
  highlightQuery,
  id,
}: MarkdownBlockProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const { openTargets, onOpenTarget } = useOpenTargets()
  const syncHtml = useMemo(() => {
    if (!text.trim()) return ""
    return sanitizeMarkdownHtml(markdownParser.parse(text, { async: false }))
  }, [text])
  const [highlightedHtml, setHighlightedHtml] = useState<{ text: string; html: string } | null>(null)

  useEffect(() => {
    if (streaming || !hasFencedCodeBlock(text)) {
      setHighlightedHtml(null)
      return
    }
    let cancelled = false
    void highlightedMarkdownParser.parse(text, { async: true }).then((html) => {
      const sanitizedHtml = sanitizeMarkdownHtml(html)
      if (!cancelled && sanitizedHtml.trim()) {
        setHighlightedHtml({ text, html: sanitizedHtml })
      }
    }).catch(() => {
      if (!cancelled) setHighlightedHtml(null)
    })
    return () => { cancelled = true }
  }, [streaming, text])

  const html = !streaming && highlightedHtml?.text === text ? highlightedHtml.html : syncHtml

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    queueMicrotask(() => {
      if (!rootRef.current || rootRef.current !== root) return
      applyTextHighlights(root, highlightQuery ?? "")
    })
  })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const sync = () => syncMarkdownImagePreviews(root)
    sync()

    const handleLoad = (event: Event) => {
      if (event.target instanceof HTMLImageElement) sync()
    }

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return

      const button = event.target.closest("[data-beehive-image-toggle]")
      if (button instanceof HTMLButtonElement) {
        const preview = button.closest("[data-beehive-image-preview]")
        if (preview instanceof HTMLElement) {
          preview.dataset.beehiveImagePreview = preview.dataset.beehiveImagePreview === "expanded" ? "collapsed" : "expanded"
          sync()
        }
      }
    }

    root.addEventListener("load", handleLoad, true)
    root.addEventListener("click", handleClick)

    if (globalThis.ResizeObserver === undefined) {
      return () => {
        root.removeEventListener("load", handleLoad, true)
        root.removeEventListener("click", handleClick)
      }
    }

    const observer = new ResizeObserver(sync)
    observer.observe(root)

    return () => {
      observer.disconnect()
      root.removeEventListener("load", handleLoad, true)
      root.removeEventListener("click", handleClick)
    }
  }, [html, onOpenTarget, openTargets])

  if (!html) return null

  return (
    <div
      ref={rootRef}
      id={id}
      className={cn("markdown-content max-w-none text-foreground", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export const MarkdownBlock = memo(MarkdownBlockInner)
MarkdownBlock.displayName = "MarkdownBlock"

export { MarkdownBlock as Markdown }
