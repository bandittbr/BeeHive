import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Palette, Type, Monitor, CheckCircle2, Loader2 } from 'lucide-react';
import { getSettings, updateSettings } from '../../services/cortes-api';
import type { CorteSettings } from '../../types/cortes';

const FONT_FAMILIES = ['Arial', 'Roboto', 'Open Sans', 'Montserrat', 'Poppins', 'Lato', 'Oswald', 'Raleway'];
const COLORS = ['#FFFFFF', '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
const VERTICAL_POSITIONS = [
  { value: 'top', label: 'Topo' },
  { value: 'center', label: 'Centro' },
  { value: 'bottom', label: 'Base' },
];
const STYLE_OPTIONS = [
  { value: 'outline', label: 'Contorno' },
  { value: 'shadow', label: 'Sombra' },
  { value: 'solid', label: 'Sólido' },
];
const QUALITY_OPTIONS = ['360p', '480p', '720p', '1080p'];
const DURATION_OPTIONS = [
  { value: 15, label: '15s' },
  { value: 20, label: '20s' },
  { value: 25, label: '25s' },
  { value: 30, label: '30s' },
];
const QUANTITY_OPTIONS = [3, 5, 8, 10, 15, 20];
const FONT_SIZES = [16, 18, 20, 22, 24, 26, 28, 32];
const ACTIVE_SIZE_OPTIONS = [80, 90, 100, 110, 120, 130, 140, 150];
const SPACING_OPTIONS = [100, 110, 120, 130, 140, 150];

export function CorteSettingsView() {
  const [settings, setSettings] = useState<CorteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<CorteSettings>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const s = await getSettings();
      setSettings(s);
      setForm(s);
    } catch (e) {
      console.error('Failed to load settings', e);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field: keyof CorteSettings, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await updateSettings(form as Partial<CorteSettings>);
      setSettings(updated);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save settings', e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="cortes-settings-loading"><Loader2 size={20} className="spin" /><span>Carregando configurações...</span></div>;
  }

  return (
    <div className="cortes-settings">
      <div className="cortes-settings-header">
        <div className="cortes-settings-title-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="cortes-settings-icon"><SettingsIcon size={20} /></div>
            <h2>Configurações dos Cortes</h2>
          </div>
          {!editing ? (
            <button className="btn-primary btn-sm" onClick={() => setEditing(true)}>
              <SettingsIcon size={14} /> Editar
            </button>
          ) : (
            <div className="cortes-save-row">
              <button className="btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={14} className="spin" /> : saved ? <CheckCircle2 size={14} /> : null}
                {saved ? 'Salvo!' : 'Salvar'}
              </button>
              <button className="btn-ghost btn-sm" onClick={() => { setEditing(false); setForm(settings || {}); }}>Cancelar</button>
            </div>
          )}
        </div>
      </div>

      <div className="cortes-settings-grid">
        {/* Legendas */}
        <div className="cortes-settings-card">
          <div className="cortes-settings-card-header">
            <Palette size={16} />
            <h3>Legendas</h3>
          </div>
          <div className="cortes-settings-card-body">
            <div className="cortes-form-row">
              <div className="cortes-form-group">
                <label>Tamanho da fonte</label>
                <select
                  value={form.subtitleFontSize ?? settings?.subtitleFontSize ?? 24}
                  onChange={e => handleChange('subtitleFontSize', Number(e.target.value))}
                  disabled={!editing}
                >
                  {FONT_SIZES.map(size => <option key={size} value={size}>{size}px</option>)}
                </select>
              </div>
              <div className="cortes-form-group">
                <label>Tipo de fonte</label>
                <select
                  value={form.subtitleFontFamily ?? settings?.subtitleFontFamily ?? 'Arial'}
                  onChange={e => handleChange('subtitleFontFamily', e.target.value)}
                  disabled={!editing}
                >
                  {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="cortes-form-row">
              <div className="cortes-form-group">
                <label>Posição vertical</label>
                <select
                  value={form.subtitleVerticalPos ?? settings?.subtitleVerticalPos ?? 'bottom'}
                  onChange={e => handleChange('subtitleVerticalPos', e.target.value)}
                  disabled={!editing}
                >
                  {VERTICAL_POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="cortes-form-group">
                <label>Max. caracteres por linha</label>
                <input
                  type="number" min={10} max={40}
                  value={form.subtitleMaxChars ?? settings?.subtitleMaxChars ?? 20}
                  onChange={e => handleChange('subtitleMaxChars', Math.max(10, Math.min(40, parseInt(e.target.value) || 20)))}
                  disabled={!editing}
                />
              </div>
            </div>
            <div className="cortes-form-row">
              <div className="cortes-form-group">
                <label>Cor do texto</label>
                <div className="color-options">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      className={`color-option ${(form.subtitleColor ?? settings?.subtitleColor ?? '#FFFFFF') === color ? 'active' : ''}`}
                      style={{ background: color }}
                      onClick={() => handleChange('subtitleColor', color)}
                      disabled={!editing}
                      title={color}
                    />
                  ))}
                </div>
              </div>
              <div className="cortes-form-group">
                <label>Estilo</label>
                <select
                  value={form.subtitleStyle ?? settings?.subtitleStyle ?? 'outline'}
                  onChange={e => handleChange('subtitleStyle', e.target.value)}
                  disabled={!editing}
                >
                  {STYLE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="cortes-form-row">
              <div className="cortes-form-group">
                <label>Espaçamento entre linhas</label>
                <input
                  type="range" min={100} max={150} step={10}
                  value={form.lineSpacing ?? settings?.lineSpacing ?? 120}
                  onChange={e => handleChange('lineSpacing', Number(e.target.value))}
                  disabled={!editing}
                />
                <span className="range-value">{form.lineSpacing ?? settings?.lineSpacing ?? 120}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Palavra destacada */}
        <div className="cortes-settings-card">
          <div className="cortes-settings-card-header">
            <Type size={16} />
            <h3>Palavra Destacada</h3>
          </div>
          <div className="cortes-settings-card-body">
            <div className="cortes-form-row">
              <div className="cortes-form-group">
                <label>Cor ativa</label>
                <div className="color-options color-options-lg">
                  {[
                    { value: 'BLUE', color: '#45B7D1' },
                    { value: 'GREEN', color: '#22c55e' },
                    { value: 'YELLOW', color: '#FFD700' },
                    { value: 'PINK', color: '#ec4899' },
                    { value: 'RED', color: '#ef4444' },
                    { value: 'WHITE', color: '#FFFFFF' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      className={`color-option ${(form.activeWordColor ?? settings?.activeWordColor ?? 'YELLOW') === opt.value ? 'active' : ''}`}
                      style={{ background: opt.color, borderColor: (form.activeWordColor ?? settings?.activeWordColor ?? 'YELLOW') === opt.value ? opt.color : undefined }}
                      onClick={() => handleChange('activeWordColor', opt.value)}
                      disabled={!editing}
                      title={opt.value}
                    />
                  ))}
                </div>
              </div>
              <div className="cortes-form-group">
                <label>Tamanho relativo</label>
                <input
                  type="range" min={80} max={150} step={10}
                  value={form.activeWordSize ?? settings?.activeWordSize ?? 110}
                  onChange={e => handleChange('activeWordSize', Number(e.target.value))}
                  disabled={!editing}
                />
                <span className="range-value">{form.activeWordSize ?? settings?.activeWordSize ?? 110}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vídeo */}
        <div className="cortes-settings-card">
          <div className="cortes-settings-card-header">
            <Monitor size={16} />
            <h3>Vídeo</h3>
          </div>
          <div className="cortes-settings-card-body">
            <div className="cortes-form-row">
              <div className="cortes-form-group">
                <label>Duração padrão</label>
                <select
                  value={form.defaultDuration ?? settings?.defaultDuration ?? 15}
                  onChange={e => handleChange('defaultDuration', Number(e.target.value))}
                  disabled={!editing}
                >
                  {DURATION_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div className="cortes-form-group">
                <label>Quantidade padrão</label>
                <select
                  value={form.defaultQuantity ?? settings?.defaultQuantity ?? 3}
                  onChange={e => handleChange('defaultQuantity', Number(e.target.value))}
                  disabled={!editing}
                >
                  {QUANTITY_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
            </div>
            <div className="cortes-form-row">
              <div className="cortes-form-group">
                <label>Qualidade</label>
                <select
                  value={form.videoQuality ?? settings?.videoQuality ?? '720p'}
                  onChange={e => handleChange('videoQuality', e.target.value)}
                  disabled={!editing}
                >
                  {QUALITY_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
