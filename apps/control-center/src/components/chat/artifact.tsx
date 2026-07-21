import { ArrowUpRightIcon } from "lucide-react"
import { ArtifactIcon } from "@/components/chat/artifact-icon"
import {
  type ArtifactItem,
  canOpenArtifact,
  canPreviewArtifact,
} from "@/lib/artifacts"

interface ArtifactButtonProps {
  artifact: ArtifactItem
  onPreview?: (artifact: ArtifactItem) => void
}

const MAX_ARTIFACT_TITLE_LENGTH = 20

function compactArtifactTitle(name: string) {
  return name.length > MAX_ARTIFACT_TITLE_LENGTH
    ? `${name.slice(0, MAX_ARTIFACT_TITLE_LENGTH - 1)}\u2026`
    : name
}

function ArtifactButton({ artifact, onPreview }: ArtifactButtonProps) {
  const canOpen = canOpenArtifact(artifact)
  const canPreview = canPreviewArtifact(artifact)
  const title = compactArtifactTitle(artifact.name)

  const content = (
    <>
      <ArtifactIcon className="size-4 shrink-0" type={artifact.type} />
      <span className="max-w-32 text-xs font-medium truncate" title={artifact.name}>{title}</span>
      {canOpen ? <ArrowUpRightIcon className="size-3.5 shrink-0 text-muted-foreground" /> : null}
    </>
  )

  if (!canOpen) {
    return (
      <div className="flex h-auto w-fit max-w-full shrink-0 items-center justify-start gap-1.5 rounded-xl border border-border px-2 py-1.5 text-left whitespace-nowrap">
        {content}
      </div>
    )
  }

  return (
    <button
      className="flex h-auto w-fit max-w-full shrink-0 items-center justify-start gap-1.5 rounded-xl border border-border px-2 py-1.5 text-left whitespace-nowrap transition-colors hover:bg-muted cursor-pointer"
      onClick={() => onPreview?.(artifact)}
      title={canPreview ? `Preview ${artifact.name}` : `Open ${artifact.name}`}
    >
      {content}
    </button>
  )
}

interface ArtifactListProps {
  artifacts: ArtifactItem[]
  onPreview?: (artifact: ArtifactItem) => void
}

export function ArtifactList({ artifacts, onPreview }: ArtifactListProps) {
  if (artifacts.length === 0) return null

  return (
    <div className="mx-auto w-full max-w-3xl px-2 md:px-10">
      <div className="flex min-w-0 flex-nowrap gap-2 overflow-x-auto pb-1">
        {artifacts.map((artifact) => (
          <ArtifactButton key={artifact.id} artifact={artifact} onPreview={onPreview} />
        ))}
      </div>
    </div>
  )
}
