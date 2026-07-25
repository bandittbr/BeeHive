import { useEffect, useState } from "react";
import { ExternalLink, Globe, Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LayoutSection, LayoutSectionDescription, LayoutSectionHeader,
  LayoutSectionItemFootnote, LayoutSectionTitle, LayoutStack
} from "./settings-layout";
import { SettingsNotice } from "./settings-section";
import { isWorkerConfigured } from "@/services/worker";
import { listGeneratedSites, deleteGeneratedSite, type GeneratedSite } from "@/services/generatedSites";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export function GeneratedSitesView() {
  const [sites, setSites] = useState<GeneratedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const configured = isWorkerConfigured();

  const load = async () => {
    setLoading(true);
    setSites(await listGeneratedSites());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (site: GeneratedSite) => {
    if (!confirm(`Excluir "${site.title}"? Essa ação não pode ser desfeita.`)) return;
    setDeletingId(site.id);
    const ok = await deleteGeneratedSite(site.id);
    if (ok) setSites((prev) => prev.filter((s) => s.id !== site.id));
    setDeletingId(null);
  };

  const totalBytes = sites.reduce((sum, s) => sum + s.sizeBytes, 0);

  return (
    <LayoutStack>
      <LayoutSection>
        <LayoutSectionHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <LayoutSectionTitle>Sites Gerados</LayoutSectionTitle>
              <LayoutSectionDescription className="max-w-[52ch]">
                Landing pages e páginas criadas pelo BeeHive, salvas no disco do Cowork Nuvem (worker).
              </LayoutSectionDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="shrink-0">
              <RefreshCcw className={`size-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </LayoutSectionHeader>

        {!configured && (
          <SettingsNotice>
            Configure a URL do Cowork Nuvem em Settings → Cowork Nuvem pra ver os sites gerados.
          </SettingsNotice>
        )}

        {configured && (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Site</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Criado em</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tamanho</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Globe className="size-3.5 shrink-0 text-sky-500" />
                        <span className="truncate" title={site.title}>{site.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatDate(site.createdAt)}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatSize(site.sizeBytes)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Abrir"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          onClick={() => handleDelete(site)}
                          disabled={deletingId === site.id}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Excluir"
                        >
                          {deletingId === site.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && sites.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum site gerado ainda.
                    </td>
                  </tr>
                )}
                {loading && sites.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      <Loader2 className="size-4 animate-spin inline-block mr-2" />
                      Carregando...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {sites.length > 0 && (
          <LayoutSectionItemFootnote>
            {sites.length} site(s) — {formatSize(totalBytes)} no total. O espaço em disco do worker é limitado; apague o que não usa mais.
          </LayoutSectionItemFootnote>
        )}
      </LayoutSection>
    </LayoutStack>
  );
}
