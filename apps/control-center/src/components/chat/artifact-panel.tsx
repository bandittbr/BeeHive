// Painel de preview lateral (estilo Claude Desktop / opencode / openwork):
// quando o BeeHive cria um site, imagem ou arquivo, ele abre aqui do lado,
// em vez de só deixar um link perdido no meio do texto.
import { ExternalLink, X } from 'lucide-react';
import type { ArtifactItem } from '@/lib/artifacts';
import { ArtifactIcon } from './artifact-icon';
import './artifact-panel.css';

export function ArtifactPanel({ artifact, onClose }: { artifact: ArtifactItem | null; onClose: () => void }) {
  if (!artifact) return null;

  const url = artifact.legacy_target.value;
  const isImage = artifact.type === 'image';
  const isPreviewable = artifact.legacy_target.kind === 'url' || ['html', 'website', 'pdf'].includes(artifact.type);

  return (
    <aside className="artifact-panel">
      <div className="artifact-panel-header">
        <div className="artifact-panel-title">
          <ArtifactIcon className="artifact-panel-icon" type={artifact.type} />
          <span title={artifact.name}>{artifact.name}</span>
        </div>
        <div className="artifact-panel-actions">
          <a href={url} target="_blank" rel="noreferrer noopener" title="Abrir em nova aba" className="artifact-panel-btn">
            <ExternalLink size={14} />
          </a>
          <button className="artifact-panel-btn" onClick={onClose} title="Fechar">
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="artifact-panel-body">
        {isImage ? (
          <div className="artifact-panel-image-wrap">
            <img src={url} alt={artifact.name} />
          </div>
        ) : isPreviewable ? (
          <iframe src={url} title={artifact.name} className="artifact-panel-iframe" />
        ) : (
          <div className="artifact-panel-fallback">
            <p>Sem preview pra esse tipo de arquivo.</p>
            <a href={url} target="_blank" rel="noreferrer noopener">Abrir {artifact.name}</a>
          </div>
        )}
      </div>
    </aside>
  );
}
