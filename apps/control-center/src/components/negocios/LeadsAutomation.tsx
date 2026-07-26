/**
 * LeadsAutomation — Painel de automação de Leads + Conexão WhatsApp.
 * Suporta conexão headless (QR via screenshot para Railway) e visível (PC local).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play, Square, Clock, RefreshCw, CheckCircle2, XCircle,
  Loader2, AlertTriangle, Send, ChevronDown, ChevronUp,
  Smartphone, Globe, ExternalLink, StopCircle,
} from 'lucide-react';
import {
  getLeadsAutomationConfig,
  updateLeadsAutomationConfig,
  triggerLeadsAutomationTick,
  listLeadsAutomationLogs,
  getWhatsAppStatus,
  connectWhatsApp,
  disconnectWhatsApp,
  getQrImageUrl,
  type LeadsAutomationConfig,
  type LeadsAutomationLog,
  type WhatsAppStatus,
} from '../../services/leadsService';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function timeSince(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  return `${days}d atrás`;
}

export function LeadsAutomation() {
  const [config, setConfig] = useState<LeadsAutomationConfig | null>(null);
  const [logs, setLogs] = useState<LeadsAutomationLog[]>([]);
  const [waStatus, setWaStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticking, setTicking] = useState(false);
  const [connectingWa, setConnectingWa] = useState(false);
  const [error, setError] = useState('');
  const [showLogs, setShowLogs] = useState(true);
  const [saved, setSaved] = useState(false);
  const [waMsg, setWaMsg] = useState('');
  const [waitingQr, setWaitingQr] = useState(false);
  const [qrRefreshKey, setQrRefreshKey] = useState(0);
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrImgRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cfg, logsData, wa] = await Promise.all([
        getLeadsAutomationConfig(),
        listLeadsAutomationLogs(20),
        getWhatsAppStatus(),
      ]);
      setConfig(cfg);
      setLogs(logsData);
      setWaStatus(wa);
      // Se o servidor está esperando QR, reflete no estado
      if (wa && 'waitingQr' in wa && (wa as any).waitingQr) {
        setWaitingQr(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Polling do status WhatsApp quando aguardando QR scan
  useEffect(() => {
    if (waitingQr) {
      // Poll status every 3s
      if (!qrPollRef.current) {
        qrPollRef.current = setInterval(async () => {
          try {
            const wa = await getWhatsAppStatus();
            setWaStatus(wa);
            if (wa.connected) {
              setWaitingQr(false);
              setWaMsg('WhatsApp conectado com sucesso!');
              clearInterval(qrPollRef.current!);
              qrPollRef.current = null;
            }
          } catch { /* ignore */ }
        }, 3000);
      }
      // Refresh QR image every 15s (QR codes expire ~60s)
      if (!qrImgRefreshRef.current) {
        qrImgRefreshRef.current = setInterval(() => {
          setQrRefreshKey((k) => k + 1);
        }, 15000);
      }
    } else {
      if (qrPollRef.current) { clearInterval(qrPollRef.current); qrPollRef.current = null; }
      if (qrImgRefreshRef.current) { clearInterval(qrImgRefreshRef.current); qrImgRefreshRef.current = null; }
    }
    return () => {
      if (qrPollRef.current) { clearInterval(qrPollRef.current); qrPollRef.current = null; }
      if (qrImgRefreshRef.current) { clearInterval(qrImgRefreshRef.current); qrImgRefreshRef.current = null; }
    };
  }, [waitingQr]);

  const handleTick = async () => {
    setTicking(true);
    try {
      await triggerLeadsAutomationTick();
      setTimeout(async () => {
        await load();
        setTicking(false);
      }, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
      setTicking(false);
    }
  };

  const saveConfig = async (fields: Partial<LeadsAutomationConfig>) => {
    if (!config) return;
    try {
      const updated = await updateLeadsAutomationConfig(fields);
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    }
  };

  const handleConnectWa = async () => {
    setConnectingWa(true);
    setWaMsg('');
    try {
      // Detectar se está rodando local ou remoto
      const workerUrl = (import.meta.env.VITE_WORKER_URL ?? '').replace(/\/+$/, '') || 'http://localhost:4000';
      const isLocal = workerUrl.includes('localhost') || workerUrl.includes('127.0.0.1');
      // Modo headless se for remoto (Railway)
      const result = await connectWhatsApp(!isLocal);
      setWaMsg(result.message);
      if ((result as any).waitingQr) {
        setWaitingQr(true);
      }
      // Recarrega status
      const wa = await getWhatsAppStatus();
      setWaStatus(wa);
    } catch (e) {
      setWaMsg(e instanceof Error ? e.message : 'Erro ao conectar');
    }
    setConnectingWa(false);
  };

  const handleDisconnectWa = async () => {
    setWaitingQr(false);
    await disconnectWhatsApp();
    setWaStatus({ connected: false });
    setWaMsg('WhatsApp desconectado');
  };

  if (loading) {
    return (
      <div className="leads-loading">
        <Loader2 size={24} className="spin" />
        <p>Carregando automação...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="leads-error">
        <XCircle size={24} />
        <p>{error || 'Não foi possível carregar as configurações'}</p>
        <button className="btn-primary" onClick={load}><RefreshCw size={14} /> Tentar novamente</button>
      </div>
    );
  }

  const lastLog = logs[0];
  const isWaConnected = waStatus?.connected;

  return (
    <div className="leads-dashboard">
      {/* Status do Motor */}
      <div className="leads-stats-grid">
        <div
          className="leads-stat-card"
          style={{ '--stat-color': config.enabled ? '#22c55e' : '#6b7280' } as React.CSSProperties}
        >
          <div className="leads-stat-icon" style={{
            background: config.enabled ? '#22c55e1f' : '#6b72801f',
            color: config.enabled ? '#22c55e' : '#6b7280',
          }}>
            {config.enabled ? <CheckCircle2 size={20} /> : <Square size={20} />}
          </div>
          <div className="leads-stat-info">
            <span className="leads-stat-value">{config.enabled ? 'Ativo' : 'Pausado'}</span>
            <span className="leads-stat-label">
              Motor de Automação
              <button className="leads-auto-toggle" onClick={() => saveConfig({ enabled: !config.enabled })}>
                {config.enabled ? 'Pausar' : 'Ativar'}
              </button>
            </span>
          </div>
        </div>
        <div className="leads-stat-card" style={{ '--stat-color': '#3b82f6' } as React.CSSProperties}>
          <div className="leads-stat-icon" style={{ background: '#3b82f61f', color: '#3b82f6' }}><RefreshCw size={20} /></div>
          <div className="leads-stat-info">
            <span className="leads-stat-value">{config.intervalMs / 60000} min</span>
            <span className="leads-stat-label">Intervalo entre ticks</span>
          </div>
        </div>
        <div className="leads-stat-card" style={{ '--stat-color': '#f59e0b' } as React.CSSProperties}>
          <div className="leads-stat-icon" style={{ background: '#f59e0b1f', color: '#f59e0b' }}><Clock size={20} /></div>
          <div className="leads-stat-info">
            <span className="leads-stat-value">{config.autoCloseDays}d</span>
            <span className="leads-stat-label">Fechar sem resposta</span>
          </div>
        </div>
        <div className="leads-stat-card" style={{ '--stat-color': '#25D366' } as React.CSSProperties}>
          <div className="leads-stat-icon" style={{
            background: isWaConnected ? '#25D3661f' : '#6b72801f',
            color: isWaConnected ? '#25D366' : '#6b7280',
          }}>
            {isWaConnected ? <Smartphone size={20} /> : <XCircle size={20} />}
          </div>
          <div className="leads-stat-info">
            <span className="leads-stat-value">{isWaConnected ? 'Conectado' : 'Desconectado'}</span>
            <span className="leads-stat-label">WhatsApp Web</span>
          </div>
        </div>
      </div>

      {/* Painel WhatsApp */}
      <div className="leads-panel" style={{ marginBottom: '16px' }}>
        <div className="leads-panel-header">
          <Smartphone size={16} />
          <h3>Conexão WhatsApp Web</h3>
          {isWaConnected && waStatus?.phone && (
            <span className="leads-auto-time" style={{ fontSize: 12, color: '#25D366' }}>
              {waStatus.phone}
            </span>
          )}
          {waitingQr && (
            <span className="leads-auto-time" style={{ fontSize: 12, color: '#f59e0b' }}>
              Aguardando scan...
            </span>
          )}
        </div>
        <div className="leads-panel-body">
          {waitingQr ? (
            /* QR Code em modo headless */
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                1. Abra o WhatsApp no seu celular<br />
                2. Toque em <strong>Menu</strong> ou <strong>Configurações</strong> e selecione <strong>WhatsApp Web</strong><br />
                3. Aponte para o QR Code abaixo
              </p>
              <img
                key={qrRefreshKey}
                src={getQrImageUrl()}
                alt="QR Code do WhatsApp"
                style={{
                  width: 256, height: 256,
                  border: '2px solid var(--border-color, #333)',
                  borderRadius: 12,
                  background: '#fff',
                  padding: 8,
                  imageRendering: 'pixelated',
                }}
                onError={(e) => {
                  // Se a imagem falhar, mostra placeholder com texto
                  const el = e.target as HTMLImageElement;
                  el.style.display = 'none';
                  const parent = el.parentElement;
                  if (parent) {
                    const placeholder = document.createElement('div');
                    placeholder.style.cssText = 'width:256px;height:256px;border:2px dashed #444;border-radius:12px;display:flex;align-items:center;justify-content:center;margin:auto;font-size:12px;color:#888;';
                    placeholder.textContent = 'QR Code não disponível. Reconecte.';
                    // Só adiciona se não existir
                    if (!parent.querySelector('[data-qr-placeholder]')) {
                      placeholder.setAttribute('data-qr-placeholder', '1');
                      parent.appendChild(placeholder);
                    }
                  }
                }}
              />
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 12 }}>
                O QR Code atualiza automaticamente. Escaneie com seu celular.
              </p>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn-ghost btn-sm" onClick={handleDisconnectWa}>
                  <StopCircle size={14} /> Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
                {isWaConnected
                  ? 'WhatsApp conectado! A automação pode enviar mensagens diretamente pelo navegador.'
                  : 'Clique em "Conectar WhatsApp" para abrir o navegador e escanear o QR Code. Após conectar, a sessão fica salva para envios automáticos.'}
              </p>
              <div className="leads-proposal-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
                {isWaConnected ? (
                  <>
                    <button className="btn-secondary btn-sm" onClick={handleDisconnectWa}>
                      <XCircle size={14} /> Desconectar
                    </button>
                    <button
                      className={`leads-detail-btn${config.autoSendWhatsApp ? ' whatsapp' : ''}`}
                      onClick={() => saveConfig({ autoSendWhatsApp: !config.autoSendWhatsApp })}
                    >
                      <Send size={12} />
                      Envio Automático: {config.autoSendWhatsApp ? 'Ligado' : 'Desligado'}
                    </button>
                  </>
                ) : (
                  <button className="btn-primary" onClick={handleConnectWa} disabled={connectingWa}>
                    {connectingWa ? <Loader2 size={14} className="spin" /> : <Globe size={14} />}
                    {connectingWa ? 'Conectando...' : 'Conectar WhatsApp'}
                  </button>
                )}
                {waMsg && !waitingQr && (
                  <span style={{ fontSize: 12, color: waMsg.includes('sucesso') ? '#22c55e' : '#f59e0b', marginLeft: 8 }}>
                    {waMsg}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Última execução */}
      {lastLog && (
        <div className="leads-panel" style={{ marginBottom: '16px' }}>
          <div className="leads-panel-header">
            {lastLog.status === 'running' ? <Loader2 size={16} className="spin" /> :
             lastLog.status === 'error' ? <XCircle size={16} style={{ color: '#ef4444' }} /> :
             <CheckCircle2 size={16} style={{ color: '#22c55e' }} />}
            <h3>Última Execução</h3>
            <span className="leads-auto-time">{timeSince(lastLog.runAt)}</span>
          </div>
          <div className="leads-panel-body">
            <div className="leads-auto-last-run">
              <span><strong>Processados:</strong> {lastLog.processedCount}</span>
              <span><strong>Avançaram:</strong> {lastLog.advancedCount}</span>
              <span><strong>Erros:</strong> {lastLog.errorCount}</span>
              {lastLog.details && (
                <span className="leads-auto-detail">{lastLog.details}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="leads-quick-actions">
        <button className="btn-primary" onClick={handleTick} disabled={ticking}>
          <Play size={14} /> {ticking ? 'Executando...' : 'Executar Tick Manual'}
        </button>
        {saved && <span className="leads-auto-saved">✓ Salvo</span>}
        <button className="btn-ghost" onClick={load}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Histórico */}
      <div className="leads-panel">
        <div
          className="leads-panel-header"
          style={{ cursor: 'pointer' }}
          onClick={() => setShowLogs(!showLogs)}
        >
          <Clock size={16} />
          <h3>Histórico de Execuções</h3>
          {showLogs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {showLogs && (
          <div className="leads-panel-body">
            {logs.length === 0 ? (
              <p className="leads-empty-text">Nenhuma execução ainda</p>
            ) : (
              <div className="leads-auto-logs">
                {logs.map((log) => (
                  <div key={log.id} className={`leads-auto-log-row ${log.errorCount > 0 ? 'has-error' : ''}`}>
                    <span className="leads-auto-log-status">
                      {log.status === 'running' ? <Loader2 size={12} className="spin" /> :
                       log.status === 'error' ? <XCircle size={12} style={{ color: '#ef4444' }} /> :
                       log.errorCount > 0 ? <AlertTriangle size={12} style={{ color: '#f59e0b' }} /> :
                       <CheckCircle2 size={12} style={{ color: '#22c55e' }} />}
                    </span>
                    <span className="leads-auto-log-time">{formatDate(log.runAt)}</span>
                    <span className="leads-auto-log-counts">
                      {log.processedCount} proc · {log.advancedCount} avanç · {log.errorCount} err
                    </span>
                    {log.details && (
                      <span className="leads-auto-log-detail" title={log.details}>
                        {log.details.length > 60 ? `${log.details.slice(0, 60)}…` : log.details}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
