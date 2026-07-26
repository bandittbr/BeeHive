import { useState, useEffect } from 'react';
import {
  Users, Loader2, RefreshCw, Globe, Search, Filter,
  ChevronDown, Phone, MapPin, Globe as GlobeIcon, Star,
  ExternalLink, CheckCircle2, XCircle, Clock, Send,
  MessageCircle, FileCode, Trash2, Smartphone,
} from 'lucide-react';
import {
  listLeads, deleteLead, leadStatusLabel, leadStatusColor,
  identifySegment, generateSampleSite, sendProposal, respondLead, updateLead, waLink,
} from '../../services/leadsService';
import type { Lead, LeadStatus } from '../../types';

type SortField = 'name' | 'createdAt' | 'status';
type SortDir = 'asc' | 'desc';

export function LeadsList({ onNewScrape }: { onNewScrape?: () => void }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const result = await listLeads(statusFilter || undefined);
      setLeads(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remover "${name}"? Esta ação não pode ser desfeita.`)) return;
    await deleteLead(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const handleIdentify = async (id: string) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const { segment } = await identifySegment(id);
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, segment, status: 'segment_identified' as LeadStatus } : l));
    } catch { /* ignore */ }
    setBusy((b) => ({ ...b, [id]: false }));
  };

  const handleGenerateSample = async (id: string) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const { sampleUrl } = await generateSampleSite(id);
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, sampleGenerated: true, sampleUrl, status: 'sample_generated' as LeadStatus } : l));
    } catch { /* ignore */ }
    setBusy((b) => ({ ...b, [id]: false }));
  };

  const handleSendProposal = async (id: string) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const { message } = await sendProposal(id);
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, proposalSent: true, proposalSentAt: Date.now(), proposalMessage: message, status: 'proposal_sent' as LeadStatus } : l));
      alert(`Mensagem gerada:\n\n${message}`);
    } catch { /* ignore */ }
    setBusy((b) => ({ ...b, [id]: false }));
  };

  const handleRespond = async (id: string, type: 'interested' | 'not_interested' | 'no_answer') => {
    try {
      const updated = await respondLead(id, type);
      setLeads((prev) => prev.map((l) => l.id === id ? updated : l));
    } catch { /* ignore */ }
  };

  const handleMarkProposalSent = async (id: string) => {
    await updateLead(id, { proposalSent: true, proposalSentAt: Date.now(), status: 'proposal_sent' as LeadStatus });
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, proposalSent: true, proposalSentAt: Date.now(), status: 'proposal_sent' as LeadStatus } : l));
  };

  // Filter and sort
  let filtered = leads;
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter((l) =>
      l.name.toLowerCase().includes(term) ||
      (l.address || '').toLowerCase().includes(term) ||
      (l.segment || '').toLowerCase().includes(term) ||
      (l.phone || '').includes(term)
    );
  }

  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortField === 'createdAt') cmp = a.createdAt - b.createdAt;
    else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="leads-list-view">
      {/* Toolbar */}
      <div className="leads-toolbar">
        <div className="leads-search-box">
          <Search size={14} />
          <input
            type="text"
            placeholder="Buscar leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="leads-filter-group">
          <Filter size={14} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LeadStatus | '')}>
            <option value="">Todos os status</option>
            <option value="new">Novo</option>
            <option value="analyzing">Analisando</option>
            <option value="segment_identified">Segmento Identificado</option>
            <option value="sample_generated">Amostra Gerada</option>
            <option value="proposal_sent">Proposta Enviada</option>
            <option value="responded">Respondeu</option>
            <option value="converted">Convertido</option>
            <option value="closed">Fechado</option>
          </select>
        </div>
        <button className="btn-icon-sm" onClick={load} title="Atualizar"><RefreshCw size={14} /></button>
        {onNewScrape && (
          <button className="btn-primary btn-sm" onClick={onNewScrape}>
            <Globe size={14} /> Novo Scraping
          </button>
        )}
      </div>

      {/* Column headers */}
      <div className="leads-table-header">
        <button className="leads-th leads-th-name" onClick={() => toggleSort('name')}>
          Nome {sortField === 'name' && <ChevronDown size={12} style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : undefined }} />}
        </button>
        <button className="leads-th leads-th-status" onClick={() => toggleSort('status')}>
          Status {sortField === 'status' && <ChevronDown size={12} style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : undefined }} />}
        </button>
        <span className="leads-th leads-th-contact">Contato</span>
        <button className="leads-th leads-th-date" onClick={() => toggleSort('createdAt')}>
          Data {sortField === 'createdAt' && <ChevronDown size={12} style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : undefined }} />}
        </button>
        <span className="leads-th leads-th-actions">Ações</span>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="leads-loading"><Loader2 size={20} className="spin" /><p>Carregando...</p></div>
      ) : error ? (
        <div className="leads-error"><XCircle size={20} /><p>{error}</p></div>
      ) : filtered.length === 0 ? (
        <div className="leads-empty">
          <Users size={32} />
          <p>{statusFilter ? 'Nenhum lead com este status.' : 'Nenhum lead encontrado.'}</p>
          {onNewScrape && (
            <button className="btn-primary" onClick={onNewScrape}>
              <Globe size={14} /> Fazer scraping agora
            </button>
          )}
        </div>
      ) : (
        <div className="leads-table-body">
          {filtered.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              busy={!!busy[lead.id]}
              expanded={expandedLead === lead.id}
              onToggle={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
              onIdentify={() => handleIdentify(lead.id)}
              onGenerateSample={() => handleGenerateSample(lead.id)}
              onSendProposal={() => handleSendProposal(lead.id)}
              onMarkProposalSent={() => handleMarkProposalSent(lead.id)}
              onRespond={(type) => handleRespond(lead.id, type)}
              onDelete={() => handleDelete(lead.id, lead.name)}
            />
          ))}
        </div>
      )}

      <div className="leads-footer">
        <span className="leads-count">{filtered.length} lead(s)</span>
      </div>
    </div>
  );
}

function LeadRow({
  lead, busy, expanded, onToggle, onIdentify, onGenerateSample,
  onSendProposal, onMarkProposalSent, onRespond, onDelete,
}: {
  lead: Lead; busy: boolean; expanded: boolean; onToggle: () => void;
  onIdentify: () => void; onGenerateSample: () => void; onSendProposal: () => void;
  onMarkProposalSent: () => void; onRespond: (t: 'interested' | 'not_interested' | 'no_answer') => void;
  onDelete: () => void;
}) {
  const dotColor = leadStatusColor(lead.status);
  const statusLabel = leadStatusLabel(lead.status);
  const sectionLabel = (t: string) => ({ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' } as React.CSSProperties);
  const formatDate = (ts?: number) => ts ? new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

  const canAuto = lead.status === 'new' || lead.status === 'analyzing';
  const canSample = lead.status === 'segment_identified' || (lead.status === 'new' && lead.segment);
  const canPropose = lead.status === 'sample_generated' || (!lead.proposalSent);

  return (
    <div className={`leads-row${expanded ? ' expanded' : ''}`}>
      <div className="leads-row-main" onClick={onToggle} style={{ cursor: 'pointer' }}>
        <div className="leads-cell leads-cell-name">
          <span className="leads-name-text">{lead.name}</span>
          {lead.segment && <span className="leads-segment-tag">{lead.segment}</span>}
        </div>
        <div className="leads-cell leads-cell-status">
          <span className="leads-status-badge" style={{ background: `${dotColor}1f`, color: dotColor }}>
            <span className="leads-status-dot" style={{ background: dotColor }} />
            {statusLabel}
          </span>
        </div>
        <div className="leads-cell leads-cell-contact">
          {lead.phone && <span className="leads-contact-item"><Phone size={11} /> {lead.phone}</span>}
        </div>
        <div className="leads-cell leads-cell-date">
          {formatDate(lead.createdAt)}
        </div>
        <div className="leads-cell leads-cell-actions" onClick={(e) => e.stopPropagation()}>
          {lead.website && (
            <a href={lead.website} target="_blank" rel="noreferrer" className="leads-action-btn" title="Site">
              <ExternalLink size={13} />
            </a>
          )}
          <button className="leads-action-btn" onClick={onDelete} title="Remover">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="leads-row-detail">
          <div className="leads-detail-grid">
            {/* Informações do lead */}
            <div className="leads-detail-section">
              <span style={sectionLabel('')}>Informações</span>
              {lead.address && <p className="leads-detail-item"><MapPin size={12} /> {lead.address}</p>}
              {lead.phone && <p className="leads-detail-item"><Phone size={12} /> {lead.phone}</p>}
              {lead.website && (
                <p className="leads-detail-item">
                  <GlobeIcon size={12} /> <a href={lead.website} target="_blank" rel="noreferrer">{lead.website}</a>
                </p>
              )}
              {lead.reviewsAverage && (
                <p className="leads-detail-item">
                  <Star size={12} /> {lead.reviewsAverage.toFixed(1)} ({lead.reviewsCount || 0} avaliações)
                </p>
              )}
              {lead.category && <p className="leads-detail-item"><Tag size={12} /> {lead.category}</p>}
              {lead.scrapeQuery && <p className="leads-detail-item"><Search size={12} /> Busca: "{lead.scrapeQuery}"</p>}
              <p className="leads-detail-item"><Clock size={12} /> Scraped: {formatDate(lead.scrapedAt)}</p>
            </div>

            {/* Segmento e ações */}
            <div className="leads-detail-section">
              <span style={sectionLabel('')}>Segmento</span>
              {lead.segment ? (
                <p className="leads-detail-item" style={{ color: 'var(--text)', fontWeight: 500 }}>{lead.segment}</p>
              ) : (
                <p className="leads-detail-item" style={{ color: 'var(--text-muted)' }}>Não identificado</p>
              )}

              <div className="leads-detail-actions">
                {canAuto && (
                  <button className="leads-detail-btn" onClick={onIdentify} disabled={busy}>
                    {busy ? <Loader2 size={12} className="spin" /> : null}
                    Identificar Segmento
                  </button>
                )}
                {canSample && (
                  <button className="leads-detail-btn" onClick={onGenerateSample} disabled={busy}>
                    {busy ? <Loader2 size={12} className="spin" /> : <FileCode size={12} />}
                    Gerar Amostra
                  </button>
                )}
                {canPropose && (
                  <button className="leads-detail-btn primary" onClick={onSendProposal} disabled={busy}>
                    {busy ? <Loader2 size={12} className="spin" /> : <Send size={12} />}
                    Enviar Proposta
                  </button>
                )}
                {!lead.proposalSent && (
                  <button className="leads-detail-btn" onClick={onMarkProposalSent}>
                    <CheckCircle2 size={12} />
                    Marcar Enviada
                  </button>
                )}
              </div>
            </div>

            {/* Status do lead */}
            <div className="leads-detail-section">
              <span style={sectionLabel('')}>Progresso</span>
              <div className="leads-progress">
                {([
                  ['new', 'Novo'],
                  ['segment_identified', 'Segmento'],
                  ['sample_generated', 'Amostra'],
                  ['proposal_sent', 'Proposta'],
                  ['converted', 'Conversão'],
                ] as const).map(([st, label]) => {
                  const order = ['new', 'segment_identified', 'sample_generated', 'proposal_sent', 'converted', 'responded', 'closed'];
                  const currentIdx = order.indexOf(lead.status);
                  const stepIdx = order.indexOf(st);
                  const done = stepIdx <= currentIdx && lead.status !== 'closed';
                  const active = stepIdx === currentIdx;
                  return (
                    <div key={st} className={`leads-progress-step${done ? ' done' : ''}${active ? ' active' : ''}`}>
                      <div className="leads-progress-dot" />
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resposta */}
            {lead.proposalSent && (
              <div className="leads-detail-section">
                <span style={sectionLabel('')}>Resposta</span>
                {lead.responseReceived ? (
                  <div>
                    <p className="leads-detail-item">
                      {lead.responseType === 'interested' ? <CheckCircle2 size={12} color="#22c55e" /> : <XCircle size={12} color="#ef4444" />}
                      {lead.responseType === 'interested' ? 'Interessado' : lead.responseType === 'not_interested' ? 'Não interessado' : 'Sem resposta'}
                      {' — '}{formatDate(lead.responseAt)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="leads-detail-item" style={{ color: 'var(--text-muted)' }}>Aguardando resposta...</p>
                    <div className="leads-respond-actions">
                      <button className="leads-respond-btn interested" onClick={() => onRespond('interested')}>
                        <CheckCircle2 size={12} /> Interessado
                      </button>
                      <button className="leads-respond-btn not-interested" onClick={() => onRespond('not_interested')}>
                        <XCircle size={12} /> Não interessado
                      </button>
                      <button className="leads-respond-btn no-answer" onClick={() => onRespond('no_answer')}>
                        <XCircle size={12} /> Sem resposta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Status WhatsApp */}
            {lead.proposalSent && (
              <div className="leads-detail-section">
                <span style={sectionLabel('')}>WhatsApp</span>
                {lead.whatsappSent ? (
                  <p className="leads-detail-item" style={{ color: '#25D366' }}>
                    <Smartphone size={12} /> Enviado automático em {formatDate(lead.whatsappSentAt)}
                  </p>
                ) : (
                  <p className="leads-detail-item" style={{ color: 'var(--text-muted)' }}>
                    <Smartphone size={12} /> Aguardando envio automático
                  </p>
                )}
              </div>
            )}

          {/* Proposta mensagem */}
            {lead.proposalMessage && (
              <div className="leads-detail-section" style={{ gridColumn: '1 / -1' }}>
                <span style={sectionLabel('')}>Mensagem da Proposta</span>
                <div className="leads-proposal-message">
                  <pre className="leads-proposal-text">{lead.proposalMessage}</pre>
                  <div className="leads-proposal-actions">
                    <button
                      className="leads-detail-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(lead.proposalMessage || '');
                      }}
                      title="Copiar mensagem"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      Copiar
                    </button>
                    {lead.phone && (
                      <a
                        href={waLink(lead.phone, lead.proposalMessage)}
                        target="_blank"
                        rel="noreferrer"
                        className="leads-detail-btn whatsapp"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Preview da amostra (PNG) */}
            {lead.sampleUrl && (
              <div className="leads-detail-section" style={{ gridColumn: '1 / -1' }}>
                <span style={sectionLabel('')}>Preview do Site</span>
                <div className="leads-sample-preview">
                  <a href={lead.sampleUrl} target="_blank" rel="noreferrer" className="leads-sample-img-link">
                    <img
                      src={lead.sampleUrl}
                      alt={`Preview do site para ${lead.name}`}
                      className="leads-sample-img"
                      loading="lazy"
                    />
                  </a>
                  <a href={lead.sampleUrl} target="_blank" rel="noreferrer" className="leads-sample-link">
                    <ExternalLink size={12} /> Abrir imagem em nova aba
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Tag icon component
function Tag({ size }: { size?: number }) {
  return <svg width={size || 12} height={size || 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2z"/><circle cx="7" cy="7" r="1.5"/></svg>;
}
