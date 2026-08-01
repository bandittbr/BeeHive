/**
 * SocialScraper — Painel de raspagem de redes sociais.
 * Atualmente: Instagram. Futuramente: TikTok, Facebook, etc.
 */
import { useState } from 'react';
import {
  InstagramIcon, Download, FolderOpen, Loader2, CheckCircle2,
  XCircle, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { scrapeInstagram } from '../../services/socialScraperService';

interface ScrapeLog {
  id: string;
  type: 'instagram';
  profileUrl: string;
  status: 'running' | 'done' | 'error';
  message: string;
  timestamp: number;
}

let logCounter = 0;

export function SocialScraper() {
  const [profileUrl, setProfileUrl] = useState('');
  const [outputDir, setOutputDir] = useState('');
  const [maxPosts, setMaxPosts] = useState(20);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<'instagram' | 'tiktok'>('instagram');
  const [logs, setLogs] = useState<ScrapeLog[]>([]);
  const [error, setError] = useState('');

  const handleScrape = async () => {
    const url = profileUrl.trim();
    if (!url) { setError('Cole o link do perfil do Instagram'); return; }
    if (!url.includes('instagram.com') && !url.startsWith('@')) {
      setError('Link inválido. Use algo como: https://www.instagram.com/username/');
      return;
    }

    setBusy(true);
    setError('');

    const logId = `ig_${++logCounter}_${Date.now()}`;
    const logEntry: ScrapeLog = {
      id: logId, type: 'instagram', profileUrl: url,
      status: 'running', message: 'Iniciando raspagem...', timestamp: Date.now(),
    };
    setLogs((prev) => [logEntry, ...prev]);

    try {
      const result = await scrapeInstagram({
        profileUrl: url,
        maxPosts,
        outputDir: outputDir.trim() || undefined,
      });

      setLogs((prev) =>
        prev.map((l) =>
          l.id === logId
            ? { ...l, status: 'done', message: result.message || 'Scraping iniciado em segundo plano' }
            : l,
        ),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(msg);
      setLogs((prev) =>
        prev.map((l) =>
          l.id === logId
            ? { ...l, status: 'error', message: `Erro: ${msg}` }
            : l,
        ),
      );
    }

    setBusy(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !busy) handleScrape();
  };

  const statusIcon = (status: ScrapeLog['status']) => {
    switch (status) {
      case 'running': return <Loader2 size={14} className="spin" style={{ color: '#f59e0b' }} />;
      case 'done': return <CheckCircle2 size={14} style={{ color: '#22c55e' }} />;
      case 'error': return <XCircle size={14} style={{ color: '#ef4444' }} />;
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="leads-dashboard">
      {/* Cabeçalho */}
      <div className="leads-stats-grid" style={{ marginBottom: 24 }}>
        <div className="leads-stat-card" style={{ '--stat-color': '#E4405F' } as React.CSSProperties}>
          <div className="leads-stat-icon" style={{ background: '#E4405F1f', color: '#E4405F' }}>
            <Instagram size={20} />
          </div>
          <div className="leads-stat-info">
            <span className="leads-stat-value">Instagram</span>
            <span className="leads-stat-label">Baixar mídias + legendas de perfis públicos</span>
          </div>
        </div>
      </div>

      {/* Abas (preparado para futuro TikTok) */}
      <div className="negocios-subnav" style={{ marginBottom: 16 }}>
        <button
          className={`negocios-subnav-btn${activeTab === 'instagram' ? ' active' : ''}`}
          onClick={() => setActiveTab('instagram')}
        >
          <Instagram size={16} /> Instagram
        </button>
        <button
          className={`negocios-subnav-btn${activeTab === 'tiktok' ? ' active' : ''}`}
          onClick={() => setActiveTab('tiktok')}
          style={{ opacity: 0.5, cursor: 'not-allowed' }}
          title="Em breve"
        >
          <Download size={16} /> TikTok <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(em breve)</span>
        </button>
      </div>

      {activeTab === 'instagram' && (
        <>
          {/* Formulário */}
          <div className="leads-panel" style={{ marginBottom: 16 }}>
            <div className="leads-panel-header">
              <Instagram size={16} />
              <h3>Raspar perfil do Instagram</h3>
            </div>
            <div className="leads-panel-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 4, display: 'block' }}>
                    Link do perfil <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://www.instagram.com/username/"
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      border: '1px solid var(--border-color, #333)',
                      background: 'var(--bg-secondary, #1a1a2e)', color: '#fff',
                      fontSize: 14, outline: 'none',
                    }}
                  />
                  <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Cole a URL completa do perfil (ex: https://www.instagram.com/nike/)
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 4, display: 'block' }}>
                      Máx. posts
                    </label>
                    <input
                      type="number" min={1} max={100}
                      value={maxPosts}
                      onChange={(e) => setMaxPosts(Math.max(1, Math.min(100, Number(e.target.value) || 20)))}
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: 6,
                        border: '1px solid var(--border-color, #333)',
                        background: 'var(--bg-secondary, #1a1a2e)', color: '#fff', fontSize: 13,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0, flex: '2 1 300px' }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 4, display: 'block' }}>
                      Pasta de destino <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>(opcional)</span>
                    </label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="C:\Users\SeuNome\Desktop\meu-projeto"
                        value={outputDir}
                        onChange={(e) => setOutputDir(e.target.value)}
                        style={{
                          flex: 1, padding: '8px 10px', borderRadius: 6,
                          border: '1px solid var(--border-color, #333)',
                          background: 'var(--bg-secondary, #1a1a2e)', color: '#fff', fontSize: 13,
                          outline: 'none',
                        }}
                      />
                      <FolderOpen size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                      Se vazio, salva em <code>downloads/instagram/username/</code> no servidor
                    </p>
                  </div>
                </div>

                {error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ef4444', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 6 }}>
                    <AlertTriangle size={14} />
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-primary"
                    onClick={handleScrape}
                    disabled={busy || !profileUrl.trim()}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: '#E4405F', borderColor: '#E4405F',
                      opacity: busy || !profileUrl.trim() ? 0.6 : 1,
                    }}
                  >
                    {busy ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
                    {busy ? 'Raspando...' : 'Baixar mídias + legendas'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* O que será baixado */}
          <div className="leads-panel" style={{ marginBottom: 16 }}>
            <div className="leads-panel-header">
              <FolderOpen size={16} />
              <h3>O que será salvo</h3>
            </div>
            <div className="leads-panel-body">
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <p>📁 <strong>photos/</strong> — todas as fotos do perfil</p>
                <p>📁 <strong>videos/</strong> — todos os vídeos</p>
                <p>📄 <strong>captions.md</strong> — legendas de cada post com data, curtidas e descrição</p>
              </div>
            </div>
          </div>

          {/* Histórico */}
          {logs.length > 0 && (
            <div className="leads-panel">
              <div className="leads-panel-header">
                <Download size={16} />
                <h3>Histórico de raspagens</h3>
              </div>
              <div className="leads-panel-body">
                <div className="leads-auto-logs">
                  {logs.map((log) => (
                    <div key={log.id} className="leads-auto-log-row">
                      <span className="leads-auto-log-status">{statusIcon(log.status)}</span>
                      <span className="leads-auto-log-time">{formatTime(log.timestamp)}</span>
                      <span className="leads-auto-log-counts" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.profileUrl.length > 40 ? log.profileUrl.slice(0, 40) + '...' : log.profileUrl}
                      </span>
                      <span className="leads-auto-log-detail" title={log.message}>
                        {log.message.length > 60 ? `${log.message.slice(0, 60)}…` : log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'tiktok' && (
        <div className="leads-panel">
          <div className="leads-panel-body">
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 0' }}>
              🔄 Suporte para TikTok em breve...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
