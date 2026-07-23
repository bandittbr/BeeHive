// Conexões: credenciais das redes sociais para postagem automática.
// YouTube (OAuth2) + Instagram/Facebook (Meta Graph API). As credenciais são
// salvas localmente e enviadas ao worker ("Ativar") para ele postar sozinho.
import { useState, useEffect } from "react";
import { Video, CheckCircle2, Zap, Loader2 } from "lucide-react";
import {
  getYoutubeCreds, setYoutubeCreds, type Privacy,
  getInstagramCreds, setInstagramCreds, getFacebookCreds, setFacebookCreds,
} from "@/services/credentials";
import { enableAutoPosting, isAutoPostingEnabled, enablePlatform, isPlatformEnabled } from "@/services/scheduler";

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function ConnectionsView() {
  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <Zap size={18} className="mt-0.5 text-primary" />
        <div className="text-sm text-muted-foreground">
          Cadastre as credenciais de cada rede para o BeeHive publicar sozinho. Salve e clique em <strong>Ativar</strong> para
          enviar ao servidor — depois disso ele posta nos horários agendados, mesmo com o navegador fechado.
        </div>
      </div>

      <YoutubeCard />
      <MetaCard
        title="Instagram"
        platform="instagram"
        Icon={Video}
        color="text-pink-500"
        fields={[
          { key: "igUserId", label: "Instagram Business ID (ig_user_id)", placeholder: "1784xxxxxxxxxxx", type: "text" },
          { key: "accessToken", label: "Access Token (longo, da Página)", placeholder: "EAAB...", type: "password" },
        ]}
        get={() => { const c = getInstagramCreds(); return { igUserId: c.igUserId, accessToken: c.accessToken }; }}
        set={(v) => setInstagramCreds({ igUserId: v.igUserId, accessToken: v.accessToken })}
      />
      <MetaCard
        title="Facebook"
        platform="facebook"
        Icon={Video}
        color="text-blue-600"
        fields={[
          { key: "pageId", label: "ID da Página", placeholder: "1029xxxxxxxxxxx", type: "text" },
          { key: "accessToken", label: "Page Access Token", placeholder: "EAAB...", type: "password" },
        ]}
        get={() => { const c = getFacebookCreds(); return { pageId: c.pageId, accessToken: c.accessToken }; }}
        set={(v) => setFacebookCreds({ pageId: v.pageId, accessToken: v.accessToken })}
      />

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-4">
        <CheckCircle2 size={16} className="mt-0.5 text-primary shrink-0" />
        <div className="text-xs text-muted-foreground space-y-1.5">
          <p className="font-medium text-foreground">Instagram e Facebook (Meta) — uma vez só:</p>
          <p>1. Crie um app em developers.facebook.com e ligue sua <strong>Página do Facebook</strong> a uma conta <strong>Instagram Profissional</strong>.</p>
          <p>2. No Graph API Explorer, gere um <strong>token de acesso da Página</strong> (long-lived) com as permissões <code>pages_show_list</code>, <code>pages_read_engagement</code>, <code>pages_manage_posts</code>, <code>instagram_basic</code> e <code>instagram_content_publish</code>.</p>
          <p>3. Pegue o <strong>ID da Página</strong> e o <strong>ig_user_id</strong> (Instagram Business ID) e cole acima. Publicar para outras contas exige revisão do app pela Meta.</p>
        </div>
      </div>
    </div>
  );
}

function YoutubeCard() {
  const initial = getYoutubeCreds();
  const [clientId, setClientId] = useState(initial.clientId);
  const [clientSecret, setClientSecret] = useState(initial.clientSecret);
  const [refreshToken, setRefreshToken] = useState(initial.refreshToken);
  const [channelTitle, setChannelTitle] = useState(initial.channelTitle ?? "");
  const [privacy, setPrivacy] = useState<Privacy>(initial.privacyStatus ?? "private");
  const [saved, setSaved] = useState(false);
  const [auto, setAuto] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoErr, setAutoErr] = useState("");

  useEffect(() => { isAutoPostingEnabled().then(setAuto); }, []);

  const save = () => {
    setYoutubeCreds({ clientId, clientSecret, refreshToken, channelTitle, privacyStatus: privacy });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };
  const activateAuto = async () => {
    setAutoBusy(true); setAutoErr("");
    setYoutubeCreds({ clientId, clientSecret, refreshToken, channelTitle, privacyStatus: privacy });
    const res = await enableAutoPosting();
    setAuto(res.ok);
    if (!res.ok) setAutoErr(res.error ?? "Falha ao ativar.");
    setAutoBusy(false);
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Video size={16} className="text-red-500" />
        <h3 className="text-sm font-semibold">YouTube</h3>
        {auto && <span className="flex items-center gap-1 text-xs text-green-500"><CheckCircle2 size={12} /> ativo</span>}
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Client ID</label>
          <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="xxxxx.apps.googleusercontent.com" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Client Secret</label>
          <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="GOCSPX-..." className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Refresh Token</label>
          <input type="password" value={refreshToken} onChange={(e) => setRefreshToken(e.target.value)} placeholder="1//0..." className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome do canal (opcional)</label>
            <input type="text" value={channelTitle} onChange={(e) => setChannelTitle(e.target.value)} placeholder="Meu Canal" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Privacidade padrão</label>
            <select value={privacy} onChange={(e) => setPrivacy(e.target.value as Privacy)} className={inputCls}>
              <option value="private">Privado</option>
              <option value="unlisted">Não listado</option>
              <option value="public">Público</option>
            </select>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={save} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          {saved ? (<><CheckCircle2 size={14} /> Salvo!</>) : "Salvar"}
        </button>
        <button onClick={activateAuto} disabled={autoBusy} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50">
          {autoBusy ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className={auto ? "text-green-500" : ""} />}
          {auto ? "Ativo" : "Ativar"}
        </button>
      </div>
      {autoErr && <p className="mt-2 text-xs text-red-500">{autoErr}</p>}
    </div>
  );
}

interface MetaField { key: string; label: string; placeholder: string; type: "text" | "password"; }

function MetaCard({ title, platform, Icon, color, fields, get, set }: {
  title: string;
  platform: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  fields: MetaField[];
  get: () => Record<string, string>;
  set: (v: Record<string, string>) => void;
}) {
  const [vals, setVals] = useState<Record<string, string>>(() => get());
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { isPlatformEnabled(platform).then(setActive); }, [platform]);

  const save = () => { set(vals); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const activate = async () => {
    setBusy(true); setErr("");
    set(vals);
    const res = await enablePlatform(platform, vals);
    setActive(res.ok);
    if (!res.ok) setErr(res.error ?? "Falha ao ativar.");
    setBusy(false);
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className={color} />
        <h3 className="text-sm font-semibold">{title}</h3>
        {active && <span className="flex items-center gap-1 text-xs text-green-500"><CheckCircle2 size={12} /> ativo</span>}
      </div>
      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <label className="text-sm font-medium">{f.label}</label>
            <input
              type={f.type}
              value={vals[f.key] ?? ""}
              onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className={inputCls}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={save} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          {saved ? (<><CheckCircle2 size={14} /> Salvo!</>) : "Salvar"}
        </button>
        <button onClick={activate} disabled={busy} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className={active ? "text-green-500" : ""} />}
          {active ? "Ativo" : "Ativar"}
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
    </div>
  );
}
