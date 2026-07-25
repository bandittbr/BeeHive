import { useMemo } from "react";
import { deriveOpenTargets, type MessageLike } from "@/types/open-target";
import { getArtifactType, type ArtifactItem } from "@/lib/artifacts";

/**
 * Deriva a lista de artefatos (sites, imagens, arquivos) mencionados numa
 * lista de mensagens — usado tanto pelos chips do MessageList quanto pelo
 * painel de preview lateral (HomeChat). Fonte única pra não repetir a lógica
 * de OpenTarget -> ArtifactItem (que já causou um crash quando divergiu).
 */
export function useArtifacts(messages: MessageLike[]): ArtifactItem[] {
  return useMemo(() => {
    const targets = deriveOpenTargets(messages);
    const unique = Array.from(new Map(targets.map((t) => [t.id, t])).values());
    return unique.map((target, index) => ({
      id: target.id,
      name: target.name,
      path: target.value,
      type: getArtifactType(target.name),
      messageId: "",
      messageIndex: index,
      updatedAt: target.updatedAt,
      legacy_target: target,
    }));
  }, [messages]);
}
