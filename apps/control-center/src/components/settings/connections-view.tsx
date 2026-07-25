// Conexões: contas das redes sociais para postagem automática. Cada rede
// suporta MÚLTIPLAS contas cadastradas (ex.: 3 canais de YouTube, 5 perfis de
// Instagram) — na hora de criar um piloto de cortes (Negócios), você escolhe
// quais contas específicas ele usa.
import { useState, useEffect } from "react";
import { Video, CheckCircle2, Zap, Loader2, Plus, Trash2 } from "lucide-react";
import {
  addAccount, setOauthApp, isOauthAppConfigured, listAccounts, disconnectAccount, oauthStartUrl,
  type ConnectedAccount,
} from "@/services/scheduler";

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function ConnectionsView() {
  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <Zap size={18} className="mt-0.5 text-primary" />
        <div className="text-sm text-muted-foreground">
          Cadastre quantas contas quiser de cada rede — o BeeHive publica sozinho, mesmo com o navegador fechado.
          Depois, em <strong>Negócios → Piloto automático de cortes</strong>, você escolhe quais contas cada piloto usa
          (ex.: 2 contas de humor num piloto, 2 de terror em outro).
        </div>
      </div>

      <ManualAccountsCard
        title="YouTube"
        platform="youtube"
        Icon={Video}
        color="text-red-500"
        fields={[
          { key: "clientId", label: "Client ID", placeholder: "xxxxx.apps.googleusercontent.com", type: "text" },
          { key: "clientSecret", label: "Client Secret", placeholder: "GOCSPX-...", type: "password" },
          { key: "refreshToken", label: "Refresh Token", placeholder: "1//0...", type: "password" },
          { key: "privacyStatus", label: "Privacidade padrão (public / unlisted / private)", placeholder: "public", type: "text" },
        ]}
      />
      <ManualAccountsCard
        title="Instagram"
        platform="instagram"
        Icon={Video}
        color="text-pink-500"
        fields={[
          { key: "igUserId", label: "Instagram Business ID (ig_user_id)", placeholder: "1784xxxxxxxxxxx", type: "text" },
          { key: "accessToken", label: "Access Token (longo, da Página)", placeholder: "EAAB...", type: "password" },
        ]}
      />
      <ManualAccountsCard
        title="Facebook"
        platform="facebook"
        Icon={Video}
        color="text-blue-600"
        fields={[
          { key: "pageId", label: "ID da Página", placeholder: "1029xxxxxxxxxxx", type: "text" },
          { key: "accessToken", label: "Page Access Token", placeholder: "EAAB...", type: "password" },
        ]}
      />
      <TiktokConnect />

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-4">
        <CheckCircle2 size={16} className="mt-0.5 text-primary shrink-0" />
        <div className="text-xs text-muted-foreground space-y-1.5">
          <p className="font-medium text-foreground">Instagram e Facebook (Meta) — por conta:</p>
          <p>1. Crie um app em developers.facebook.com e ligue a <strong>Página do Facebook</strong> à conta <strong>Instagram Profissional</strong> daquele perfil.</p>
          <p>2. No Graph API Explorer, gere um <strong>token de acesso da Página</strong> (long-lived) com <code>pages_show_list</code>, <code>pages_read_engagement</code>, <code>pages_manage_posts</code>, <code>instagram_basic</code> e <code>instagram_content_publish</code>.</p>
          <p>3. Pegue o <strong>ID da Página</strong> e o <strong>ig_user_id</strong> e cadastre acima com um rótulo que te ajude a identificar a conta.</p>
          <p className="font-medium text-foreground pt-1">TikTok (multi-conta via OAuth):</p>
          <p>App em developers.tiktok.com com a <strong>Content Posting API</strong>, escopo <code>video.publish</code> e Redirect URI = URL do worker + <code>/oauth/tiktok/callback</code>. Salve o Client Key/Secret uma vez e conecte cada conta pelo popup.</p>
        </div>
      </div>
    </div>
  );
}

interface ManualField { key: string; label: string; placeholder: string; type: "text" | "password"; }

// Card genérico de multi-conta: lista as contas já cadastradas dessa rede +
// formulário pra adicionar mais uma (rótulo + credenciais).
function ManualAccountsCard({ title, platform, Icon, color, fields }: {
  title: string;
  platform: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  fields: ManualField[];
}) {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [adding, setAdding] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const reload = async () => setAccounts(await listAccounts(platform));
  useEffect(() => { reload(); }, [platform]);

  const submit = async () => {
    if (!displayName.trim()) { setErr("Dê um rótulo pra essa conta (ex: \"Canal Humor\")."); return; }
    setBusy(true); setErr("");
    const res = await addAccount(platform, displayName.trim(), vals);
    if (res.ok) { setDisplayName(""); setVals({}); setAdding(false); await reload(); }
    else setErr(res.error ?? "Falha ao salvar.");
    setBusy(false);
  };

  const remove = async (id: string) => { if (await disconnectAccount(id)) setAccounts((a) => a.filter((x) => x.id !== id)); };

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className={color} />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">({accounts.length} conta{accounts.length === 1 ? "" : "s"})</span>
      </div>

      {accounts.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
              <span className="text-sm flex items-center gap-1.5"><CheckCircle2 size={12} className="text-green-500 shrink-0" /> {a.displayName || a.accountId}</span>
              <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-red-500"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {!adding ? (
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs">
          <Plus size={12} /> Adicionar conta
        </button>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Rótulo (pra identificar essa conta)</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder='Ex: "Canal Humor"' className={inputCls} autoFocus />
          </div>
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
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={submit} disabled={busy} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Salvar conta
            </button>
            <button onClick={() => { setAdding(false); setErr(""); }} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
          </div>
        </div>
      )}
      {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
    </div>
  );
}

// TikTok multi-conta: configura o app OAuth uma vez e conecta várias contas.
function TiktokConnect() {
  const [clientKey, setClientKey] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saved, setSaved] = useState(false);
  const [appOk, setAppOk] = useState(false);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [err, setErr] = useState("");

  const reload = async () => {
    setAppOk(await isOauthAppConfigured("tiktok"));
    setAccounts(await listAccounts("tiktok"));
  };
  useEffect(() => { reload(); }, []);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if ((e.data as { beehiveOauth?: boolean })?.beehiveOauth) reload(); };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const saveApp = async () => {
    setErr("");
    const res = await setOauthApp("tiktok", { clientId: clientKey.trim(), clientSecret: clientSecret.trim() });
    if (res.ok) { setSaved(true); setAppOk(true); setTimeout(() => setSaved(false), 2000); }
    else setErr(res.error ?? "Falha ao salvar o app.");
  };

  const connect = () => {
    const w = window.open(oauthStartUrl("tiktok"), "beehive_oauth", "width=600,height=820");
    if (!w) setErr("Permita popups para conectar a conta.");
    const iv = setInterval(async () => { if (w && w.closed) { clearInterval(iv); reload(); } }, 1000);
  };

  const remove = async (id: string) => {
    if (await disconnectAccount(id)) setAccounts((a) => a.filter((x) => x.id !== id));
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Video size={16} className="text-foreground" />
        <h3 className="text-sm font-semibold">TikTok</h3>
        {appOk && <span className="flex items-center gap-1 text-xs text-green-500"><CheckCircle2 size={12} /> app configurado</span>}
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Client Key (do app TikTok)</label>
          <input type="text" value={clientKey} onChange={(e) => setClientKey(e.target.value)} placeholder="aw..." className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Client Secret</label>
          <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="..." className={inputCls} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={saveApp} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          {saved ? (<><CheckCircle2 size={14} /> Salvo!</>) : "Salvar app"}
        </button>
        <button onClick={connect} disabled={!appOk} title={appOk ? "" : "Salve o app primeiro"} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50">
          <Zap size={14} /> Conectar conta
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-red-500">{err}</p>}

      {accounts.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{accounts.length} conta(s) conectada(s):</p>
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
              <span className="text-sm">{a.displayName || a.accountId}</span>
              <button onClick={() => remove(a.id)} className="text-xs text-red-500 hover:underline">Desconectar</button>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Salve o Client Key/Secret do seu app TikTok (uma vez), depois clique em <strong>Conectar conta</strong> para cada perfil — cada um autoriza e fica salvo. O agendamento posta em todas as contas conectadas.
      </p>
    </div>
  );
}
