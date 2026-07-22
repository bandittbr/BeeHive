// Configuração do Cowork Nuvem (worker): URL + token, com teste de conexão.
import { useState } from "react";
import { Cloud, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { getWorkerConfig, setWorkerConfig, checkWorkerHealth } from "@/services/worker";

export function CoworkView() {
  const initial = getWorkerConfig();
  const [url, setUrl] = useState(initial.url);
  const [token, setToken] = useState(initial.token);
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [saved, setSaved] = useState(false);

  const save = () => {
    setWorkerConfig(url, token);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const test = async () => {
    setWorkerConfig(url, token);
    setStatus("testing");
    const ok = await checkWorkerHealth();
    setStatus(ok ? "ok" : "fail");
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <Cloud size={18} className="mt-0.5 text-primary" />
        <div className="text-sm text-muted-foreground">
          O <strong className="text-foreground">Cowork Nuvem</strong> é o ambiente que executa de verdade terminal,
          arquivos, git e navegador — 24/7, sem depender do seu PC. Faça o deploy do worker (pasta{" "}
          <code>apps/worker</code>) no Railway e cole a URL e o token abaixo. Depois disso, as etapas do plano marcadas
          como "requer Cowork" passam a rodar automaticamente.
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">URL do worker</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://beehive-worker-production.up.railway.app"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Token (WORKER_TOKEN)</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="o mesmo valor definido no Railway"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          {saved ? "Salvo!" : "Salvar"}
        </button>
        <button
          onClick={test}
          disabled={!url || status === "testing"}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50"
        >
          {status === "testing" && <Loader2 size={14} className="animate-spin" />}
          Testar conexão
        </button>
        {status === "ok" && (
          <span className="flex items-center gap-1 text-sm text-green-500">
            <CheckCircle2 size={14} /> Conectado
          </span>
        )}
        {status === "fail" && (
          <span className="flex items-center gap-1 text-sm text-red-500">
            <XCircle size={14} /> Sem resposta
          </span>
        )}
      </div>
    </div>
  );
}
