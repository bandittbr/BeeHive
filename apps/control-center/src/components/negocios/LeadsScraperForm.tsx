import { useState } from 'react';
import {
  Globe, Loader2, Search, ChevronRight, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { scrapeLeads } from '../../services/leadsService';

interface Props {
  onComplete?: (count: number) => void;
  onBack?: () => void;
}

const SUGGESTED_SEARCHES = [
  { label: 'Restaurantes em São Paulo', query: 'restaurantes em São Paulo SP', total: 50 },
  { label: 'Salões de Beleza no Rio', query: 'salão de beleza Rio de Janeiro RJ', total: 30 },
  { label: 'Oficinas em Belo Horizonte', query: 'oficina mecânica Belo Horizonte MG', total: 30 },
  { label: 'Clínicas Odontológicas', query: 'clínica odontológica São Paulo SP', total: 30 },
  { label: 'Mercados em Curitiba', query: 'mercado Curitiba PR', total: 30 },
  { label: 'Pet Shops em Porto Alegre', query: 'pet shop Porto Alegre RS', total: 20 },
  { label: 'Advogados em Brasília', query: 'advocacia Brasília DF', total: 30 },
  { label: 'Academias em Salvador', query: 'academia Salvador BA', total: 20 },
  { label: 'Hotéis em Florianópolis', query: 'hotel Florianópolis SC', total: 20 },
  { label: 'Lojas de Roupas em SP', query: 'loja de roupa São Paulo SP', total: 30 },
  { label: 'Personalizadas (digite abaixo)', query: '', total: 20 },
];

export function LeadsScraperForm({ onComplete, onBack }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [total, setTotal] = useState(20);
  const [categories, setCategories] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState('');

  const submitScrape = async (query?: string, qty?: number, cats?: string) => {
    const q = (query || searchQuery).trim();
    if (!q) { setError('Digite um termo de busca'); return; }
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const res = await scrapeLeads(q, qty || total, cats || categories || undefined);
      setResult(res);
      if (onComplete) onComplete(qty || total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao iniciar scraping');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="leads-scraper-form">
      <div className="leads-form-section">
        <div className="leads-form-header">
          <Globe size={18} />
          <h3>Buscar empresas no Google Maps</h3>
        </div>

        <div className="form-group">
          <label>Termo de busca</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ex: restaurantes em São Paulo, oficinas no Rio de Janeiro..."
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Quantidade</label>
            <input
              type="number"
              min={5}
              max={200}
              value={total}
              onChange={(e) => setTotal(Math.max(5, Math.min(200, Number(e.target.value) || 20)))}
            />
          </div>
          <div className="form-group">
            <label>Categorias (opcional, separado por vírgula)</label>
            <input
              type="text"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              placeholder="Ex: pizza, italiano, japonês"
            />
          </div>
        </div>

        <div className="leads-form-actions">
          <button
            className="btn-primary"
            onClick={() => submitScrape()}
            disabled={busy || !searchQuery.trim()}
          >
            {busy ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
            {busy ? 'Scraping em andamento...' : 'Iniciar Scraping'}
          </button>
          {onBack && <button className="btn-ghost" onClick={onBack}>Voltar</button>}
        </div>

        {error && (
          <div className="leads-form-alert error">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="leads-form-alert success">
            <CheckCircle2 size={14} />
            <span>{result.message || 'Scraping iniciado com sucesso!'}</span>
          </div>
        )}
      </div>

      {/* Sugestões de busca */}
      <div className="leads-form-section">
        <div className="leads-form-header">
          <Search size={16} />
          <h3>Buscas sugeridas</h3>
        </div>
        <p className="leads-form-hint">
          Clique em uma sugestão para preencher automaticamente:
        </p>
        <div className="leads-suggested-grid">
          {SUGGESTED_SEARCHES.map((s) => (
            <button
              key={s.label}
              className="leads-suggested-btn"
              onClick={() => {
                if (s.query) {
                  setSearchQuery(s.query);
                  setTotal(s.total);
                }
              }}
              disabled={busy}
            >
              <span>{s.label}</span>
              {s.query && <ChevronRight size={12} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
