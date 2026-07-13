import { useState, useEffect, useCallback } from 'react';
import { Card, EmptyState, Loading, Badge } from '@/components/ui';
import { Icon } from '@/components/common/Icon';
import type { ContentItem, Publication } from '@beehive/platform';
import './affiliates.css';

const API_BASE = '/api/affiliates';

/**
 * View de Criador de Conteúdo — gerencia conteúdo gerado e publicações.
 *
 * O usuário vê o conteúdo que foi gerado automaticamente (ou pode solicitar
 * geração manual), acompanha publicações e métricas.
 */
export function ContentCreatorView() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'conteudo' | 'publicacoes'>('conteudo');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [contentRes, pubRes] = await Promise.all([
        fetch(`${API_BASE}/content`),
        fetch(`${API_BASE}/publications`),
      ]);
      if (!contentRes.ok) throw new Error(`Erro ao carregar conteúdo: ${contentRes.status}`);
      if (!pubRes.ok) throw new Error(`Erro ao carregar publicações: ${pubRes.status}`);
      setContents(await contentRes.json());
      setPublications(await pubRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statusBadge = (status: ContentItem['status'] | Publication['status']) => {
    const tones: Record<string, 'success' | 'info' | 'neutral'> = {
      gerado: 'info',
      publicado: 'success',
      falhou: 'neutral',
    };
    return <Badge tone={tones[status] || 'neutral'}>{status}</Badge>;
  };

  if (loading) return <Loading label="Carregando conteúdo..." />;

  return (
    <div className="affiliates">
      {error && (
        <div className="alert alert--error" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      {/* Abas internas */}
      <div className="affiliates__section-header">
        <h3>Criador de Conteúdo</h3>
        <div className="affiliates__filters">
          <button
            className={`affiliates__filter-btn ${activeTab === 'conteudo' ? 'filter--active' : ''}`}
            onClick={() => setActiveTab('conteudo')}
          >
            Conteúdo ({contents.length})
          </button>
          <button
            className={`affiliates__filter-btn ${activeTab === 'publicacoes' ? 'filter--active' : ''}`}
            onClick={() => setActiveTab('publicacoes')}
          >
            Publicações ({publications.length})
          </button>
        </div>
      </div>

      {activeTab === 'conteudo' ? (
        contents.length === 0 ? (
          <EmptyState
            icon="media"
            title="Nenhum conteúdo gerado"
            description="O conteúdo será gerado automaticamente quando produtos forem descobertos."
          />
        ) : (
          <div className="affiliates__content-list">
            {contents.map((item) => (
              <Card key={item.id} className="affiliates__content-card">
                <div className="affiliates__content-header">
                  <span className="affiliates__content-type">
                    {item.mediaType === 'video' ? <><Icon name="video" size={14} /> Vídeo</> : <><Icon name="camera" size={14} /> Imagem</>}
                  </span>
                  {statusBadge(item.status)}
                </div>
                <p className="affiliates__content-caption">{item.caption}</p>
                {item.hashtags.length > 0 && (
                  <div className="affiliates__content-hashtags">
                    {item.hashtags.map((tag, i) => (
                      <span key={i} className="affiliates__hashtag">#{tag}</span>
                    ))}
                  </div>
                )}
                <div className="affiliates__content-meta">
                  <span>IA: {item.aiProviderUsed}</span>
                  <span>Criado: {new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        publications.length === 0 ? (
          <EmptyState
            icon="send"
            title="Nenhuma publicação"
            description="As publicações aparecerão aqui após o conteúdo ser postado nas redes sociais."
          />
        ) : (
          <div className="affiliates__publications-list">
            {publications.map((pub) => (
              <Card key={pub.id} className="affiliates__pub-card">
                <div className="affiliates__pub-header">
                  <span className="affiliates__pub-platform">
                    {pub.socialProvider === 'instagram' ? <><Icon name="camera" size={14} /> Instagram</> : <><Icon name="music" size={14} /> TikTok</>}
                  </span>
                  {statusBadge(pub.status)}
                </div>
                <div className="affiliates__pub-meta">
                  <span>Conteúdo: {pub.contentId}</span>
                  {pub.publishedAt && (
                    <span>Publicado: {new Date(pub.publishedAt).toLocaleDateString('pt-BR')}</span>
                  )}
                  {pub.errorMessage && (
                    <span className="affiliates__pub-error">Erro: {pub.errorMessage}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
