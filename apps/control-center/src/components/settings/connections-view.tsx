// Conexões: credenciais das redes sociais para postagem automática.
// Começa pelo YouTube (OAuth2). O usuário cola clientId/secret/refreshToken.
import { useState, useEffect } from "react";
import { Youtube, Info, CheckCircle2, Zap, Loader2 } from "lucide-react";
import { getYoutubeCreds, setYoutubeCreds, type Privacy } from "@/services/credentials";
import { enableAutoPosting, isAutoPostingEnabled } from "@/services/scheduler";

export function ConnectionsView() {
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
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const activateAuto = async () => {
    setAutoBusy(true); setAutoErr("");
    setYoutubeCreds({ clientId, clientSecret, refreshToken, channelTitle, privacyStatus: privacy });
    const res = await enableAutoPosting();
    setAuto(res.ok);
    if (!res.ok) setAutoErr(res.error ?? "Falha ao ativar.");
    setAutoBusy(false);
  };

  const inputCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <Youtube size={18} className="mt-0.5 text-red-500" />
        <div className="text-sm text-muted-foreground">
          Cadastre as credenciais para o BeeHive publicar sozinho no seu canal. Só precisa fazer isso uma vez.
          Instagram, TikTok e Facebook entram em seguida com o mesmo esquema.
        </div>
      </div>

      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Youtube size={16} className="text-red-500" />
          <h3 className="text-sm font-semibold">YouTube</h3>
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
            {saved ? (<><CheckCircle2 size={14} /> Salvo!</>) : "Salvar credenciais"}
          </button>
          <button onClick={activateAuto} disabled={autoBusy} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50">
            {autoBusy ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className={auto ? "text-green-500" : ""} />}
            {auto ? "Postagem automática ativa" : "Ativar postagem automática"}
          </button>
          {auto && <span className="flex items-center gap-1 text-xs text-green-500"><CheckCircle2 size={13} /> servidor pronto para postar sozinho</span>}
        </div>
        {autoErr && <p className="mt-2 text-xs text-red-500">{autoErr}</p>}
        <p className="mt-2 text-xs text-muted-foreground">
          "Ativar postagem automática" envia suas credenciais para o worker (servidor) guardar, para ele publicar sozinho nos horários agendados — mesmo com o navegador fechado.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-4">
        <Info size={16} className="mt-0.5 text-primary shrink-0" />
        <div className="text-xs text-muted-foreground space-y-1.5">
          <p className="font-medium text-foreground">Como conseguir (uma vez só):</p>
          <p>1. Em console.cloud.google.com, crie um projeto e ative a <strong>YouTube Data API v3</strong>.</p>
          <p>2. Em "Credenciais", crie um <strong>OAuth Client ID</strong> (tipo Desktop). Copie o Client ID e o Client Secret.</p>
          <p>3. Em developers.google.com/oauthplayground, engrenagem → marque "Use your own OAuth credentials" e cole ID/Secret. No escopo, use <code>https://www.googleapis.com/auth/youtube.upload</code>, autorize com sua conta e troque o code pelo <strong>refresh token</strong>.</p>
          <p>4. Cole os três valores acima e salve. Pronto — o BeeHive publica sozinho.</p>
        </div>
      </div>
    </div>
  );
}
