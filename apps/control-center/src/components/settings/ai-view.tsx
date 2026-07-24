import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, CheckCircle2, KeyRound, X, Plus, Loader2, 
  AlertCircle, RefreshCcw, ChevronDown, ChevronUp, Globe,
  Puzzle, Sparkles, Server, Wifi
} from "lucide-react";
import { ProviderIcon } from "./provider-icon";
import { SettingsNotice, SettingsStatusBadge } from "./settings-section";
import {
  LayoutSection,
  LayoutSectionDescription,
  LayoutSectionHeader,
  LayoutSectionItem,
  LayoutSectionItemFootnote,
  LayoutSectionItemHeader,
  LayoutSectionItemHeaderActions,
  LayoutSectionItemTitle,
  LayoutSectionTitle,
  LayoutStack,
} from "./settings-layout";
import type { ProviderType, TestResult, Model } from "@/types";

type ConnectedProvider = {
  id: string;
  name: string;
  source?: "env" | "api" | "config" | "custom";
};

type AiSettingsViewProps = {
  connectedProviders: ConnectedProvider[];
  providers: Array<{
    id: string;
    providerType: ProviderType;
    name: string;
    maskedApiKey: string;
    baseUrl: string | null;
    status: "connected" | "disconnected" | "error" | "testing";
    lastTestedAt: string | null;
    lastTestedError: string | null;
    models: Model[];
  }>;
  isLoading: boolean;
  error: string | null;
  onAddProvider: (providerId: string, apiKey: string, baseUrl?: string) => Promise<void>;
  onRemoveProvider: (providerId: string) => Promise<void>;
  testConnection: (providerId: string) => Promise<TestResult>;
  fetchModels: (providerId: string) => Promise<Model[]>;
  refreshProviders: () => Promise<void>;
};

function providerSourceLabel(source?: ConnectedProvider["source"]) {
  if (source === "env") return "Environment";
  if (source === "api") return "API Key";
  if (source === "config") return "Config";
  if (source === "custom") return "Custom";
  return null;
}

const PROVIDER_OPTIONS = [
  { id: "openai", name: "OpenAI", desc: "GPT-4o, GPT-4, DALL-E, Whisper", category: "cloud" },
  { id: "anthropic", name: "Anthropic", desc: "Claude 3.5 Sonnet, Claude 3 Opus", category: "cloud" },
  { id: "openrouter", name: "OpenRouter", desc: "Multiple models via unified API", category: "cloud" },
  { id: "google", name: "Google Gemini", desc: "Gemini 1.5 Pro, Gemini 2.0 Flash", category: "cloud" },
  { id: "deepseek", name: "DeepSeek", desc: "DeepSeek V3, DeepSeek R1", category: "cloud" },
  { id: "xai", name: "xAI (Grok)", desc: "Grok-2, Grok-3", category: "cloud" },
  { id: "mistral", name: "Mistral AI", desc: "Mistral Large, Codestral", category: "cloud" },
  { id: "perplexity", name: "Perplexity", desc: "Sonar Pro, Sonar Deep Research", category: "cloud" },
  { id: "nvidia", name: "NVIDIA", desc: "Nemotron, Llama Nemotron", category: "cloud" },
  { id: "cohere", name: "Cohere", desc: "Command R+, Command A", category: "cloud" },
  { id: "together", name: "Together AI", desc: "Llama 3.3, Mixtral hosted", category: "cloud" },
  { id: "groq", name: "Groq", desc: "Llama 3, Mixtral (ultra-fast)", category: "cloud" },
  { id: "fireworks", name: "Fireworks AI", desc: "Llama 3, DeepSeek hosted", category: "cloud" },
  { id: "github", name: "GitHub Models", desc: "GPT-4o, Phi-3, AI21 via Azure", category: "cloud" },
  { id: "replicate", name: "Replicate", desc: "Open-source models hosted", category: "cloud" },
  { id: "ollama", name: "Ollama", desc: "Local models (Llama, Mistral, etc.)", category: "local" },
  { id: "custom", name: "Personalizado", desc: "Any OpenAI-compatible endpoint", category: "custom" },
];

const CATEGORIES = [
  { id: "cloud", label: "Cloud Providers", icon: Wifi },
  { id: "local", label: "Local", icon: Server },
  { id: "custom", label: "Personalizado", icon: Puzzle },
];

export function AiSettingsView({ 
  connectedProviders, 
  providers,
  isLoading,
  error,
  onAddProvider, 
  onRemoveProvider,
  testConnection,
  fetchModels,
  refreshProviders
}: AiSettingsViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingProvider, setAddingProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [loadingModels, setLoadingModels] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const connectedIds = new Set(connectedProviders.map(c => c.id));
  const availableProviders = PROVIDER_OPTIONS.filter(
    (p) => !connectedIds.has(p.id)
  );

  const filteredProviders = availableProviders.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedProviders = CATEGORIES.map(cat => ({
    ...cat,
    providers: filteredProviders.filter(p => p.category === cat.id),
  })).filter(g => g.providers.length > 0);

  const handleTestConnection = useCallback(async (providerId: string) => {
    setTestingId(providerId);
    try {
      const result = await testConnection(providerId);
      setTestResults((prev) => ({ ...prev, [providerId]: result }));
    } finally {
      setTestingId(null);
    }
  }, [testConnection]);

  const handleFetchModels = useCallback(async (providerId: string) => {
    setLoadingModels(providerId);
    try {
      await fetchModels(providerId);
    } finally {
      setLoadingModels(null);
    }
  }, [fetchModels]);

  const handleAddProvider = useCallback(async () => {
    if (addingProvider && apiKey.trim()) {
      await onAddProvider(addingProvider, apiKey.trim(), baseUrl.trim() || undefined);
      setApiKey("");
      setBaseUrl("");
      setAddingProvider(null);
      setShowAddModal(false);
    }
  }, [addingProvider, apiKey, baseUrl, onAddProvider]);

  const needsBaseUrl = addingProvider === "custom" || addingProvider === "ollama";

  return (
    <LayoutStack>
      <LayoutSection>
        <LayoutSectionHeader>
          <LayoutSectionTitle>AI Providers</LayoutSectionTitle>
          <LayoutSectionDescription>
            Configure seus provedores de IA. Escolha um da lista ou adicione um endpoint personalizado.
          </LayoutSectionDescription>
        </LayoutSectionHeader>

        <LayoutSectionItem>
          <LayoutSectionItemHeader>
            <LayoutSectionItemTitle>
              {connectedProviders.length} connected provider{connectedProviders.length !== 1 ? "s" : ""}
              <SettingsStatusBadge
                tone={connectedProviders.length > 0 ? "ready" : "neutral"}
                label={connectedProviders.length > 0 ? "Connected" : "No providers"}
              />
            </LayoutSectionItemTitle>
            <LayoutSectionItemHeaderActions>
              {availableProviders.length > 0 && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="mr-1.5 size-3.5" />
                  Connect Provider
                </Button>
              )}
            </LayoutSectionItemHeaderActions>
          </LayoutSectionItemHeader>
        </LayoutSectionItem>

        {error && (
          <LayoutSectionItem className="rounded-2xl border border-destructive/50 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-4" />
              <span className="text-sm">{error}</span>
            </div>
          </LayoutSectionItem>
        )}

        {/* Modal de Adicionar Provedor */}
        {showAddModal && (
          <LayoutSectionItem className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Add Provider</h4>
                <button
                  onClick={() => { setAddingProvider(null); setApiKey(""); setBaseUrl(""); setShowAddModal(false); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Busca */}
              <input
                type="text"
                placeholder="Search providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />

              {/* Grid de provedores por categoria */}
              <div className="flex flex-col gap-4 max-h-80 overflow-y-auto">
                {groupedProviders.map((group) => (
                  <div key={group.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <group.icon className="size-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {group.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.providers.map((p) => (
                        <button
                          key={p.id}
                          className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all hover:bg-muted/50 ${
                            addingProvider === p.id 
                              ? "border-primary bg-primary/5 ring-1 ring-primary" 
                              : "border-border"
                          }`}
                          onClick={() => setAddingProvider(addingProvider === p.id ? null : p.id)}
                        >
                          <ProviderIcon providerId={p.id} size={22} />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{p.desc}</div>
                          </div>
                          {addingProvider === p.id && (
                            <CheckCircle2 className="size-4 text-primary shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Formulário de conexão */}
              {addingProvider && (
                <div className="flex flex-col gap-3 mt-2 rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2">
                    <ProviderIcon providerId={addingProvider} size={18} />
                    <span className="text-sm font-medium">
                      {PROVIDER_OPTIONS.find(p => p.id === addingProvider)?.name || addingProvider}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-muted-foreground">API Key</label>
                    <input
                      type="password"
                      placeholder={addingProvider === "ollama" ? "Optional (leave blank for local)" : "sk-..."}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                    />
                  </div>

                  {needsBaseUrl && (
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-muted-foreground">
                        {addingProvider === "ollama" ? "Ollama URL" : "Base URL"}
                      </label>
                      <input
                        type="text"
                        placeholder={
                          addingProvider === "ollama" 
                            ? "http://localhost:11434" 
                            : "https://api.seuprovedor.com/v1"
                        }
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={handleAddProvider}
                      disabled={(!apiKey.trim() && addingProvider !== "ollama") || isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1.5 size-3.5" />
                      )}
                      Connect
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setAddingProvider(null); setApiKey(""); setBaseUrl(""); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </LayoutSectionItem>
        )}

        {/* Lista de provedores conectados */}
        {connectedProviders.length > 0 ? (
          <div className="space-y-2">
            {connectedProviders.map((provider) => {
              const fullProvider = providers.find(p => p.id === provider.id);
              const isExpanded = expandedProvider === provider.id;
              const isTesting = testingId === provider.id;
              const testResult = testResults[provider.id];
              const isLoadingModels = loadingModels === provider.id;
              
              return (
                <LayoutSectionItem
                  key={provider.id}
                  className="rounded-2xl border border-border px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <ProviderIcon providerId={provider.id} size={22} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{provider.name}</span>
                          {provider.source === "env" ? (
                            <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              {providerSourceLabel("env")}
                            </span>
                          ) : null}
                          {fullProvider?.status === "connected" && (
                            <span className="shrink-0 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                              Connected
                            </span>
                          )}
                          {fullProvider?.status === "error" && (
                            <span className="shrink-0 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                              Error
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {fullProvider?.maskedApiKey || "••••••••"}
                          </span>
                          {fullProvider?.baseUrl && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              · {fullProvider.baseUrl}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(provider.id)}
                        disabled={isTesting}
                      >
                        {isTesting ? (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        ) : (
                          <RefreshCcw className="mr-1.5 size-3.5" />
                        )}
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (isExpanded) {
                            setExpandedProvider(null);
                          } else {
                            setExpandedProvider(provider.id);
                            if (fullProvider?.models.length === 0) {
                              handleFetchModels(provider.id);
                            }
                          }
                        }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="size-3.5" />
                        ) : (
                          <ChevronDown className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onRemoveProvider(provider.id)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                  
                  {/* Resultado do teste */}
                  {testResult && (
                    <div className={`mt-3 rounded-xl border p-3 text-sm ${
                      testResult.success 
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" 
                        : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                    }`}>
                      <div className="flex items-center gap-2">
                        {testResult.success ? (
                          <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertCircle className="size-4 text-red-600 dark:text-red-400" />
                        )}
                        <span className={testResult.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                          {testResult.success ? "Connection successful" : testResult.error}
                        </span>
                        {testResult.latency && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {testResult.latency}ms
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Modelos */}
                  {isExpanded && fullProvider && (
                    <div className="mt-3 border-t border-border pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Models ({fullProvider.models.length})</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFetchModels(provider.id)}
                          disabled={isLoadingModels}
                        >
                          {isLoadingModels ? (
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                          ) : (
                            <RefreshCcw className="mr-1.5 size-3.5" />
                          )}
                          Refresh
                        </Button>
                      </div>
                      {fullProvider.models.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {fullProvider.models.map((model) => (
                            <div
                              key={model.id}
                              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                            >
                              <div className="min-w-0">
                                <div className="font-medium truncate">{model.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {model.contextWindow.toLocaleString()} context
                                  {model.maxOutput && ` • ${model.maxOutput.toLocaleString()} output`}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {model.supportsImages && (
                                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                    Images
                                  </span>
                                )}
                                {model.supportsTools && (
                                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                    Tools
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground py-4 text-center">
                          No models found. Click Refresh to fetch models.
                        </div>
                      )}
                    </div>
                  )}
                </LayoutSectionItem>
              );
            })}
          </div>
        ) : (
          <LayoutSectionItem className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="rounded-full bg-muted p-3">
                <Sparkles className="size-6" />
              </div>
              <p className="text-sm font-medium">Nenhum provedor conectado</p>
              <p className="text-xs max-w-sm">
                Adicione um provedor de IA para começar. Escolha entre as opções populares 
                ou configure um endpoint personalizado compatível com OpenAI.
              </p>
              <Button onClick={() => setShowAddModal(true)} variant="outline" size="sm">
                <Plus className="mr-1.5 size-3.5" />
                Connect Provider
              </Button>
            </div>
          </LayoutSectionItem>
        )}

        <LayoutSectionItemFootnote>
          API keys are stored encrypted locally and never sent to BeeHive servers.
        </LayoutSectionItemFootnote>
      </LayoutSection>
    </LayoutStack>
  );
}