import { File, FileAudio, FileCode, FileImage, FileSpreadsheet, FileText, FileType, FileVideo, Globe, Presentation } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ArtifactType } from "@/lib/artifacts"

interface ArtifactIconProps {
  className?: string
  type: ArtifactType
}

export function ArtifactIcon({ className, type }: ArtifactIconProps) {
  if (type === "website") return <Globe className={cn("text-sky-500", className)} />
  if (type === "markdown") return <FileText className={cn("text-blue-500", className)} />
  if (type === "sheet") return <FileSpreadsheet className={cn("text-green-500", className)} />
  if (type === "slides") return <Presentation className={cn("text-amber-500", className)} />
  if (type === "document") return <FileText className={cn("text-blue-500", className)} />
  if (type === "image") return <FileImage className={cn("text-violet-500", className)} />
  if (type === "video") return <FileVideo className={cn("text-pink-500", className)} />
  if (type === "audio") return <FileAudio className={cn("text-purple-500", className)} />
  if (type === "pdf") return <FileText className={cn("text-red-500", className)} />
  if (type === "html") return <FileCode className={cn("text-orange-500", className)} />
  if (type === "text") return <FileType className={cn("text-slate-500", className)} />
  return <File className={cn("text-slate-500", className)} />
}
