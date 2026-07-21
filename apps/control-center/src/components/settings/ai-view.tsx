import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, KeyRound, X, Plus } from "lucide-react";
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

type ConnectedProvider = {
  id: string;
  name: string;
  source?: "env" | "api" | "config" | "custom";
};

type AiSettingsViewProps = {
  connectedProviders: ConnectedProvider[];
  onAddProvider: (providerId: string, apiKey: string) => void;
  onRemoveProvider: (providerId: string) => void;
};

function providerSourceLabel(source?: ConnectedProvider["source"]) {
  if (source === "env") return "Environment";
  if (source === "api") return "API Key";
  if (source === "config") return "Config";
  if (source === "custom") return "Custom";
  return null;
}

export function AiSettingsView({ connectedProviders, onAddProvider, onRemoveProvider }: AiSettingsViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingProvider, setAddingProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");

  const PROVIDER_OPTIONS = [
    { id: "openrouter", name: "OpenRouter", desc: "Multiple models via OpenRouter" },
    { id: "openai", name: "OpenAI", desc: "GPT-4, DALL-E, Whisper" },
    { id: "anthropic", name: "Anthropic", desc: "Claude 3.5 Sonnet, Claude 3 Opus" },
    { id: "google", name: "Google", desc: "Gemini 1.5 Pro, Gemini 1.5 Flash" },
    { id: "ollama", name: "Ollama", desc: "Local models (Llama, Mistral, etc.)" },
    { id: "deepseek", name: "DeepSeek", desc: "DeepSeek Coder, DeepSeek Chat" },
  ];

  const availableProviders = PROVIDER_OPTIONS.filter(
    (p) => !connectedProviders.some((c) => c.id === p.id)
  );

  return (
    <LayoutStack>
      <LayoutSection>
        <LayoutSectionHeader>
          <LayoutSectionTitle>AI Providers</LayoutSectionTitle>
          <LayoutSectionDescription>Manage your AI provider connections and API keys</LayoutSectionDescription>
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

        {showAddModal && (
          <LayoutSectionItem className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-medium">Add Provider</h4>
              <div className="flex flex-col gap-2">
                {availableProviders.map((p) => (
                  <button
                    key={p.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 ${
                      addingProvider === p.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                    onClick={() => setAddingProvider(addingProvider === p.id ? null : p.id)}
                  >
                    <ProviderIcon providerId={p.id} size={20} />
                    <div className="min-w-0">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              {addingProvider && (
                <div className="flex flex-col gap-2 mt-2">
                  <input
                    type="password"
                    placeholder="API Key (sk-...)"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (apiKey.trim()) {
                          onAddProvider(addingProvider, apiKey.trim());
                          setApiKey("");
                          setAddingProvider(null);
                          setShowAddModal(false);
                        }
                      }}
                      disabled={!apiKey.trim()}
                    >
                      Connect
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setAddingProvider(null); setApiKey(""); setShowAddModal(false); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </LayoutSectionItem>
        )}

        {connectedProviders.length > 0 ? (
          <div className="space-y-2">
            {connectedProviders.map((provider) => (
              <LayoutSectionItem
                key={provider.id}
                className="flex-row flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <ProviderIcon providerId={provider.id} size={20} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{provider.name}</span>
                      {provider.source === "env" ? (
                        <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {providerSourceLabel("env")}
                        </span>
                      ) : null}
                    </div>
                    <div className="truncate font-mono text-xs text-muted-foreground">{provider.id}</div>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onRemoveProvider(provider.id)}
                >
                  Disconnect
                </Button>
              </LayoutSectionItem>
            ))}
          </div>
        ) : (
          <LayoutSectionItem className="rounded-2xl border border-dashed border-border px-4 py-6 text-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <KeyRound className="size-8" />
              <p className="text-sm">No providers connected yet</p>
              <p className="text-xs">Add a provider to start using AI models</p>
            </div>
          </LayoutSectionItem>
        )}

        <LayoutSectionItemFootnote>
          API keys are stored locally and never sent to BeeHive servers.
        </LayoutSectionItemFootnote>
      </LayoutSection>
    </LayoutStack>
  );
}
