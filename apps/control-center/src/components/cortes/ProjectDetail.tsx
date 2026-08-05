import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { getProject, updateProject, publishClip, getGenerateJob, scheduleProjectClips, scheduleClip, generateCortes, uploadCorteVideo } from '../../services/cortes-api';
import type { CorteProject, CorteClipStatus } from '../../types/cortes';
import { Loader2, Download, Play, Edit2, Share2, CheckCircle2, XCircle } from 'lucide-react';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
  onLoad: () => void;
}

const STATUS_LABEL: Record<CorteClipStatus, string> = {
  PENDING: 'Pendente',
  PROCESSING: 'Processando',
  READY: 'Pronto',
  SCHEDULED: 'Agendado',
  ERROR: 'Erro',
  PUBLISHED: 'Publicado',
};

export function ProjectDetailView({ projectId, onBack, onLoad }: ProjectDetailProps) {
  const { corteChannels, updateCorteProject } = useAppStore();
  const [project, setProject] = useState<CorteProject | null>(null);
  const [url, setUrl] = useState('');
  const [sourceType, setSourceType] = useState<'upload' | 'url'>('upload');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(3);
  const [duration, setDuration] = useState(15);
  const [format, setFormat] = useState('9:16');
  const [channelId, setChannelId] = useState('');
  const [autoHighlights, setAutoHighlights] = useState(true);
  const [autoCaptions, setAutoCaptions] = useState(true);
  const [autoTitle, setAutoTitle] = useState(true);
  const [autoDescription, setAutoDescription] = useState(true);
  const [autoHashtags, setAutoHashtags] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [expandedClip, setExpandedClip] = useState<string | null>(null);
  const [publishingClip, setPublishingClip] = useState<string | null>(null);
  const [postsPerDay, setPostsPerDay] = useState(4);
  const [postingTimes, setPostingTimes] = useState(['09:00', '12:00', '15:00', '19:00']);
  const [scheduling, setScheduling] = useState(false);
  const [clipSchedules, setClipSchedules] = useState<Record<string, string>>({});
  const [schedulingClip, setSchedulingClip] = useState<string | null>(null);
  const [liveJob, setLiveJob] = useState<{ progress: number; message: string; status: string } | null>(null);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    try {
      const p = await getProject(projectId);
      setProject(p);
      setUrl(p.sourceVideoUrl);
      setSourceType(p.sourceVideoUrl.startsWith('upload://') ? 'upload' : 'url');
      setName(p.name);
      setQuantity(p.quantityRequested);
      setDuration(p.duration);
      setFormat(p.format);
      setChannelId(p.channelId || '');
      setAutoHighlights(p.autoHighlights);
      setAutoCaptions(p.autoCaptions);
      setAutoTitle(p.autoTitle);
      setAutoDescription(p.autoDescription);
      setAutoHashtags(p.autoHashtags);
      setPostsPerDay(p.postingSchedule?.postsPerDay || 4);
      setPostingTimes(p.postingSchedule?.times || ['09:00', '12:00', '15:00', '19:00']);
      setClipSchedules(Object.fromEntries(p.clips.map((clip) => [clip.id, toDateTimeLocal(clip.scheduledAt) || nextScheduleTime()])));
    } catch (e) {
      console.error('Failed to load project', e);
    }
  }

  async function handleGenerate() {
    if (!project || busy) return;
    setBusy(true); setErr('');
    try {
      let sourceUrl = url;
      let sourceStorageFileId: string | undefined;
      if (sourceType === 'upload' && sourceFile) {
        setLiveJob({ progress: 1, message: `Enviando ${sourceFile.name} para a nuvem...`, status: 'uploading' });
        const uploaded = await uploadCorteVideo(sourceFile, (progress) => setUploadProgress(progress));
        sourceUrl = uploaded.sourceUrl;
        sourceStorageFileId = uploaded.sourceFileId;
        setUrl(sourceUrl);
      }
      if (!sourceUrl.trim() || (sourceType === 'upload' && !sourceUrl.startsWith('b2://'))) throw new Error('Escolha um vídeo para enviar antes de gerar os cortes.');
      const executionMode = sourceType === 'url' ? 'connector' : 'cloud';
      await updateProject(project.id, { sourceVideoUrl: sourceUrl, sourceStorageFileId, name, channelId: channelId || undefined, quantityRequested: quantity, duration, format, autoHighlights, autoCaptions, autoTitle, autoDescription, autoHashtags, executionMode, status: 'GENERATING' });
      setProject((previous) => previous ? { ...previous, sourceVideoUrl: sourceUrl, status: 'GENERATING' } : null);
      setLiveJob({ progress: 5, message: 'Vídeo recebido. Iniciando a IA de cortes...', status: 'queued' });
      const { jobId } = await generateCortes({ projectId: project.id, url: sourceUrl, executionMode });
      let attempts = 0;
      while (attempts++ < 180) {
        await new Promise((resolve) => window.setTimeout(resolve, 5000));
        const job = await getGenerateJob(jobId);
        setLiveJob({ progress: job.progress || 0, message: job.message || 'Processando...', status: job.status });
        if (job.status === 'done') { await loadProject(); break; }
        if (job.status === 'error') throw new Error(job.error || 'Falha ao gerar os cortes.');
      }
      if (attempts >= 180) throw new Error('O processamento demorou mais que o esperado. Abra o projeto novamente para consultar o status.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErr(message);
      if (project) { await updateProject(project.id, { status: 'ERROR', error: message }); setProject((previous) => previous ? { ...previous, status: 'ERROR', error: message } : null); }
    } finally { setBusy(false); setUploadProgress(0); onLoad(); }
  }
  async function handlePublishClip(clipId: string) {
    setPublishingClip(clipId);
    try {
      const result = await publishClip(clipId);
      if (result.success) {
        // Update local project state
        if (project) {
          const updatedClips = project.clips.map(c => 
            c.id === clipId ? { ...c, status: 'SCHEDULED', scheduledAt: new Date().toISOString() } : c
          );
          setProject({ ...project, clips: updatedClips });
          updateProject(project.id, { clips: updatedClips });
        }
      } else {
        setErr(result.error || 'Falha ao publicar');
      }
    } catch (e) {
      setErr(String(e));
    } finally {
      setPublishingClip(null);
    }
  }

  function toDateTimeLocal(value?: string): string {
    if (!value) return '';
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function nextScheduleTime(): string {
    const date = new Date(Date.now() + 60 * 60_000);
    date.setMinutes(0, 0, 0);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  async function handleScheduleClip(clipId: string) {
    const scheduledAt = clipSchedules[clipId];
    if (!project || !scheduledAt || schedulingClip) return;
    setSchedulingClip(clipId); setErr('');
    try {
      const updated = await scheduleClip(clipId, new Date(scheduledAt).toISOString());
      setProject((current) => current ? { ...current, clips: current.clips.map((clip) => clip.id === updated.id ? updated : clip) } : current);
    } catch (error) { setErr(error instanceof Error ? error.message : String(error)); }
    finally { setSchedulingClip(null); }
  }
  async function handleScheduleAll() {
    if (!project || scheduling) return;
    setScheduling(true); setErr('');
    try {
      const result = await scheduleProjectClips(project.id, postsPerDay, postingTimes.slice(0, postsPerDay));
      setProject({ ...project, clips: project.clips.map((clip) => result.scheduled.find((item) => item.id === clip.id) || clip), postingSchedule: { postsPerDay, times: postingTimes.slice(0, postsPerDay) } });
    } catch (error) { setErr(error instanceof Error ? error.message : String(error)); }
    finally { setScheduling(false); }
  }

  function changePostsPerDay(value: number) {
    setPostsPerDay(value);
    setPostingTimes((current) => Array.from({ length: value }, (_, index) => current[index] || ['09:00', '12:00', '15:00', '19:00'][index] || '09:00'));
  }
  const clips = project?.clips ?? [];
  const channel = corteChannels.find(c => c.id === project?.channelId);

  return (
    <div className="cortes-project-detail">
      {/* Header */}
      <div className="cortes-project-header">
        <button className="btn-ghost btn-sm" onClick={onBack}>← Voltar</button>
        <h2>{project?.name}</h2>
        <span className={`status-pill ${project?.status.toLowerCase()}`}>{project?.status}</span>
      </div>

      {/* Channel info */}
      {channel && (
        <div className="cortes-card" style={{ marginBottom: 16 }}>
          <div className="cortes-card-body">
            <strong>Canal:</strong> {channel.name}
            {channel.category && <span className="cortes-channel-tag">{channel.category}</span>}
          </div>
        </div>
      )}

      {liveJob && (
        <div className="cortes-card" style={{ marginBottom: 16 }}>
          <div className="cortes-card-body">
            <strong>Processamento ao vivo</strong>
            <p style={{ marginTop: 8, fontSize: 13 }}>{liveJob.message}</p>
            <div className="overview-progress" style={{ marginTop: 10 }}><span style={{ width: `${liveJob.progress}%` }} /></div>
            <small style={{ display: 'block', marginTop: 6, color: 'var(--text-muted)' }}>{liveJob.progress}% concluído · {liveJob.status}</small>
          </div>
        </div>
      )}

      {clips.length > 0 && (
        <div className="cortes-section">
          <div className="cortes-section-header"><h2>Agenda de publicação</h2><p>Distribua um corte por horário, todos os dias.</p></div>
          <div className="cortes-card"><div className="cortes-card-body">
            <div className="cortes-form-row"><div className="cortes-form-group"><label>Publicações por dia</label><select value={postsPerDay} onChange={e => changePostsPerDay(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6, 8, 10].map(value => <option key={value} value={value}>{value} por dia</option>)}</select></div></div>
            <div className="cortes-form-row">{postingTimes.slice(0, postsPerDay).map((time, index) => <div className="cortes-form-group" key={index}><label>Postagem {index + 1}</label><input type="time" value={time} onChange={e => setPostingTimes(current => current.map((item, position) => position === index ? e.target.value : item))} /></div>)}</div>
            <p className="form-hint">Exemplo: 10 cortes com 4 por dia serão postados em 3 dias, sempre nos horários acima.</p>
            <button className="btn-primary" onClick={handleScheduleAll} disabled={scheduling}>{scheduling ? <Loader2 size={14} className="spin" /> : <Share2 size={14} />} Agendar {clips.filter(c => c.status === 'READY' || c.status === 'SCHEDULED').length} cortes</button>
          </div></div>
        </div>
      )}
      {/* Clips */}
      <div className="cortes-section">
        <div className="cortes-section-header">
          <h2>Cortes Gerados</h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{clips.length} corte{clips.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="cortes-card">
          <div className="cortes-card-body">
            {clips.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum corte gerado ainda. Envie um vídeo e clique em "Gerar Cortes".</p>
              </div>
            ) : (
              <div className="cortes-clips-grid">
                {clips.map((clip, i) => (
                  <div 
                    key={clip.id} 
                    className="cortes-clip-card"
                    onClick={() => setExpandedClip(expandedClip === clip.id ? null : clip.id)}
                  >
                    <div className="cortes-clip-video-wrap">
                      {clip.videoFile ? (
                        <video src={clip.videoFile} poster={clip.thumbnailFile} controls preload="metadata" playsInline className="cortes-clip-video" />
                      ) : (
                        <div className="cortes-clip-placeholder">
                          <Play size={24} />
                        </div>
                      )}
                      <span className="cortes-clip-index">#{String(i + 1).padStart(2, '0')}</span>
                      <span className={`cortes-clip-status ${clip.status.toLowerCase()}`}>{STATUS_LABEL[clip.status]}</span>
                    </div>
                    <div className="cortes-clip-info">
                      <span className="cortes-clip-title">{clip.title || `Corte ${i + 1}`}</span>
                      {clip.status === 'PUBLISHED' ? (
                        <div className="clip-publication-status published">✓ Postado{clip.publishedAt ? ` em ${new Date(clip.publishedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}</div>
                      ) : clip.status === 'SCHEDULED' ? (
                        <div className="clip-publication-status scheduled">◷ Agendado para {clip.scheduledAt ? new Date(clip.scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'horário definido'}</div>
                      ) : (
                        <div className="clip-schedule-control" onClick={e => e.stopPropagation()}>
                          <label>Publicar este corte em</label>
                          <input type="datetime-local" value={clipSchedules[clip.id] || nextScheduleTime()} min={nextScheduleTime()} onChange={e => setClipSchedules(current => ({ ...current, [clip.id]: e.target.value }))} />
                          <button type="button" className="btn-primary btn-xs" disabled={schedulingClip === clip.id} onClick={() => handleScheduleClip(clip.id)}>{schedulingClip === clip.id ? <Loader2 size={12} className="spin" /> : <Share2 size={12} />} Agendar</button>
                        </div>
                      )}
                      {expandedClip === clip.id && (
                        <div className="cortes-clip-expanded" onClick={e => e.stopPropagation()}>
                          {clip.caption && <div><strong>Legenda:</strong> {clip.caption}</div>}
                          {clip.description && <div><strong>Descrição:</strong> {clip.description}</div>}
                          {clip.hashtags.length > 0 && <div><strong>Hashtags:</strong> {clip.hashtags.map(h => `#${h}`).join(' ')}</div>}
                          <div className="cortes-clip-actions">
                            {clip.videoFile && (
                              <a href={clip.videoFile} download className="btn-outline btn-xs">
                                <Download size={12} /> Baixar
                              </a>
                            )}
                            <button className="btn-outline btn-xs">
                              <Edit2 size={12} /> Editar
                            </button>
                            {clip.status !== 'PUBLISHED' && publishingClip !== clip.id ? (
                              <button 
                                className="btn-primary btn-xs" 
                                onClick={(e) => { e.stopPropagation(); handlePublishClip(clip.id); }}
                              >
                                <Share2 size={12} /> Forçar post (teste)
                              </button>
                            ) : publishingClip === clip.id ? (
                              <button className="btn-outline btn-xs" disabled>
                                <Loader2 size={12} className="spin" /> Enviando teste...
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form para gerar novo projeto */}
      <div className="cortes-section">
        <div className="cortes-section-header">
          <h2>Gerar Novos Cortes</h2>
          <p>Preencha os dados abaixo e clique em "Gerar Cortes"</p>
        </div>
        <div className="cortes-card">
          <div className="cortes-card-body cortes-gen-form">
            <div className="cortes-source-switch" role="tablist" aria-label="Origem do vídeo">
              <button type="button" className={sourceType === 'upload' ? 'active' : ''} onClick={() => setSourceType('upload')}>Enviar vídeo <span>Recomendado</span></button>
              <button type="button" className={sourceType === 'url' ? 'active' : ''} onClick={() => setSourceType('url')}>URL do YouTube <span>Avançado</span></button>
            </div>
            {sourceType === 'upload' ? (
              <div className="cortes-form-group cortes-upload-field">
                <label>Vídeo original</label>
                <input type="file" accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm" onChange={e => { setSourceFile(e.target.files?.[0] || null); setUrl(''); setUploadProgress(0); }} />
                <small>{sourceFile ? `${sourceFile.name} · ${(sourceFile.size / 1024 / 1024).toFixed(1)} MB` : 'MP4, MOV, MKV ou WEBM · até 500 MB · o processamento acontece na nuvem.'}</small>
                {busy && uploadProgress > 0 && <div className="upload-progress"><span style={{ width: `${uploadProgress}%` }} /> <em>Enviando: {uploadProgress}%</em></div>}
              </div>
            ) : (
              <div className="cortes-form-group">
                <label>URL do vídeo do YouTube</label>
                <input type="text" placeholder="https://www.youtube.com/watch?v=..." value={url.startsWith('upload://') ? '' : url} onChange={e => setUrl(e.target.value)} />
                <small>Alternativa avançada. Alguns vídeos podem ser bloqueados pelo YouTube.</small>
              </div>
            )}
            <div className="cortes-form-row">
              <div className="cortes-form-group">
                <label>Nome do projeto</label>
                <input
                  type="text"
                  placeholder="Ex: Cortes Comédia"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="cortes-form-group">
                <label>Canal</label>
                <select value={channelId} onChange={e => setChannelId(e.target.value)}>
                  <option value="">— Nenhum canal —</option>
                  {corteChannels.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
            </div>
            <div className="cortes-form-row">
              <div className="cortes-form-group">
                <label>Quantidade de cortes</label>
                <select value={quantity} onChange={e => setQuantity(Number(e.target.value))}>
                  {[1, 2, 3, 5, 8, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="cortes-form-group">
                <label>Duração (segundos)</label>
                <select value={duration} onChange={e => setDuration(Number(e.target.value))}>
                  {[15, 20, 25, 30].map(d => <option key={d} value={d}>{d}s</option>)}
                  <option value={0}>Personalizado</option>
                </select>
              </div>
              <div className="cortes-form-group">
                <label>Formato</label>
                <select value={format} onChange={e => setFormat(e.target.value)}>
                  <option value="9:16">9:16 (Vertical)</option>
                  <option value="1:1">1:1 (Quadrado)</option>
                  <option value="16:9">16:9 (Horizontal)</option>
                </select>
              </div>
            </div>
            <div className="cortes-checkboxes">
              <label className="cortes-check-label">
                <input type="checkbox" checked={autoHighlights} onChange={e => setAutoHighlights(e.target.checked)} />
                Selecionar melhores momentos com IA
              </label>
              <label className="cortes-check-label">
                <input type="checkbox" checked={autoCaptions} onChange={e => setAutoCaptions(e.target.checked)} />
                Gerar legendas dinâmicas
              </label>
              <label className="cortes-check-label">
                <input type="checkbox" checked={autoTitle} onChange={e => setAutoTitle(e.target.checked)} />
                Gerar título
              </label>
              <label className="cortes-check-label">
                <input type="checkbox" checked={autoDescription} onChange={e => setAutoDescription(e.target.checked)} />
                Gerar descrição
              </label>
              <label className="cortes-check-label">
                <input type="checkbox" checked={autoHashtags} onChange={e => setAutoHashtags(e.target.checked)} />
                Gerar hashtags
              </label>
            </div>
            {err && <p style={{ fontSize: 12, color: 'var(--danger)', gridColumn: '1 / -1' }}>{err}</p>}
            <div className="cortes-gen-actions">
              <button className="btn-primary" onClick={handleGenerate} disabled={busy || (sourceType === 'upload' ? (!sourceFile && !url.startsWith('upload://')) : !url.trim())}>
                {busy ? <Loader2 size={14} className="spin" /> : null}
                {busy ? 'Processando...' : 'Gerar Cortes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
