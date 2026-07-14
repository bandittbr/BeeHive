import { useState, useCallback, useRef } from 'react';
import { Button, Card, Input, Loading, Badge } from '@/components/ui';
import { Icon } from '@/components/common/Icon';
import { API_BASE } from '@/lib/api';

interface NicheVideo {
  title: string;
  videoId: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
}

const NICHE_SUGGESTIONS = [
  { label: 'Tecnologia', query: 'tecnologia 2026' },
  { label: 'Financas', query: 'financas pessoais' },
  { label: 'Saude', query: 'saude bem estar' },
  { label: 'Educacao', query: 'educacao curiosidades' },
  { label: 'Entretenimento', query: 'entretenimento viral' },
  { label: 'Games', query: 'gaming highlights' },
  { label: 'Culinaria', query: 'culinaria receitas' },
  { label: 'Fitness', query: 'fitness treino' },
];

interface NicheSearchProps {
  onSelect: (url: string) => void;
}

export function NicheSearch({ onSelect }: NicheSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NicheVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`${API_BASE}/shorts/niche/search?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data = await res.json();
      setResults(data.videos || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleChipClick = (chipQuery: string) => {
    setQuery(chipQuery);
    doSearch(chipQuery);
  };

  return (
    <div className="niche-search">
      <Input
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder="Buscar videos por nicho ou tema..."
        icon="search"
      />

      <div className="niche-search__chips">
        {NICHE_SUGGESTIONS.map((chip) => (
          <button
            key={chip.label}
            className={`niche-search__chip ${query === chip.query ? 'niche-search__chip--active' : ''}`}
            onClick={() => handleChipClick(chip.query)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {loading && <Loading label="Buscando videos..." />}

      {!loading && searched && results.length === 0 && (
        <Card style={{ padding: '16px', textAlign: 'center' }}>
          <Icon name="search" size={24} />
          <p style={{ color: 'var(--text-secondary, #888)', margin: '8px 0 0' }}>
            Nenhum video encontrado. Tente outro termo.
          </p>
        </Card>
      )}

      {!loading && results.length > 0 && (
        <div className="niche-search__results">
          {results.map((video) => (
            <div
              key={video.videoId}
              className="niche-search__video"
              onClick={() => onSelect(video.url)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(video.url);
                }
              }}
            >
              <img
                className="niche-search__video-thumb"
                src={video.thumbnail}
                alt={video.title}
                loading="lazy"
              />
              <div className="niche-search__video-info">
                <p className="niche-search__video-title">{video.title}</p>
                <span className="niche-search__video-channel">{video.channelTitle}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
