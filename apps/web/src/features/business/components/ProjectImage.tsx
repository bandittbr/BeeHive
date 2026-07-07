import { useState } from 'react';
import { Button, Input, Loading } from '@/components/ui';
import { generateImage } from '@/services/media/mediaService';
import type { Project } from '../useBusiness';

interface ProjectImageProps {
  project: Project;
  onSetImage: (prompt: string, url: string) => void;
}

/**
 * Seção de imagem do Projeto. Gera uma imagem na nuvem (provedor gratuito) a
 * partir de uma descrição. A geração ocorre ao carregar a URL, por isso o
 * indicador some no `onLoad` da imagem.
 */
export function ProjectImage({ project, onSetImage }: ProjectImageProps) {
  const [prompt, setPrompt] = useState(project.imagePrompt || project.niche);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    const text = prompt.trim() || project.niche;
    if (!text) return;
    setLoading(true);
    setError(null);
    try {
      const url = await generateImage(text, Math.floor(Math.random() * 1_000_000_000));
      onSetImage(text, url);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Falha ao gerar imagem.');
    }
  };

  return (
    <section className="project-detail__plan">
      <div className="project-detail__plan-head">
        <h3 className="project-detail__plan-title">Imagem</h3>
        <Button variant="primary" size="sm" icon="media" onClick={() => void generate()}>
          {project.imageUrl ? 'Gerar de novo' : 'Gerar imagem'}
        </Button>
      </div>

      <Input
        label="Descrição da imagem"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ex.: xícara de café artesanal em mesa de madeira, luz natural"
      />

      {error && <p className="project-image__error">{error}</p>}

      {project.imageUrl ? (
        <div className="project-image__frame">
          {loading && (
            <div className="project-image__overlay">
              <Loading variant="spinner" />
            </div>
          )}
          <img
            className="project-image__img"
            src={project.imageUrl}
            alt={prompt}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError('Não foi possível carregar a imagem. Tente gerar de novo.');
            }}
          />
        </div>
      ) : loading ? (
        <div className="project-detail__plan-loading">
          <Loading variant="spinner" />
          <span>Gerando imagem...</span>
        </div>
      ) : null}
    </section>
  );
}
