import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff, Save, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  LayoutSection, LayoutSectionDescription, LayoutSectionHeader, 
  LayoutSectionItemFootnote, LayoutSectionTitle, LayoutStack 
} from "./settings-layout";
import { SettingsNotice, SettingsStatusBadge } from "./settings-section";

interface EnvVariable {
  key: string;
  value: string;
}

const DEFAULT_ENV_VARS: EnvVariable[] = [
  { key: "OPENROUTER_API_KEY", value: "sk-or-v1-..." },
  { key: "ANTHROPIC_API_KEY", value: "sk-ant-..." },
  { key: "OPENAI_API_KEY", value: "sk-..." },
];

export function EnvironmentView() {
  const [envVars, setEnvVars] = useState<EnvVariable[]>(DEFAULT_ENV_VARS);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (newKey.trim() && !envVars.some((v) => v.key === newKey.trim())) {
      setEnvVars([...envVars, { key: newKey.trim(), value: newValue }]);
      setNewKey("");
      setNewValue("");
      setIsAdding(false);
    }
  };

  const handleDelete = (key: string) => {
    setEnvVars(envVars.filter((v) => v.key !== key));
  };

  const handleUpdate = (key: string, newValue: string) => {
    setEnvVars(envVars.map((v) => v.key === key ? { ...v, value: newValue } : v));
    setEditingKey(null);
  };

  const toggleShow = (key: string) => {
    setShowValues((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <LayoutStack>
      <LayoutSection>
        <LayoutSectionHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <LayoutSectionTitle>Environment Variables</LayoutSectionTitle>
              <LayoutSectionDescription className="max-w-[52ch]">
                Manage API keys and environment variables for your providers.
              </LayoutSectionDescription>
            </div>
            <Button onClick={() => setIsAdding(true)} className="shrink-0">
              <Plus className="size-4 mr-1.5" />
              Add Variable
            </Button>
          </div>
        </LayoutSectionHeader>

        <SettingsNotice>
          Changes require a restart to take effect. API keys are stored locally and never sent to BeeHive servers.
        </SettingsNotice>

        {/* Add new variable form */}
        {isAdding && (
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <input
                  placeholder="VARIABLE_NAME"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  spellCheck={false}
                  autoComplete="off"
                />
                <input
                  placeholder="value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} disabled={!newKey.trim()}>
                  <Save className="size-3.5 mr-1.5" />
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsAdding(false); setNewKey(""); setNewValue(""); }}>
                  <X className="size-3.5 mr-1.5" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Environment variables table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Key</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Value</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {envVars.map((envVar) => (
                <tr key={envVar.key} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs">{envVar.key}</td>
                  <td className="px-4 py-2.5">
                    {editingKey === envVar.key ? (
                      <input
                        defaultValue={envVar.value}
                        onBlur={(e) => handleUpdate(envVar.key, e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(envVar.key, (e.target as HTMLInputElement).value); }}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                        autoFocus
                      />
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">
                        {showValues[envVar.key] ? envVar.value : "••••••••"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleShow(envVar.key)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={showValues[envVar.key] ? "Hide" : "Show"}
                      >
                        {showValues[envVar.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => setEditingKey(envVar.key)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Edit"
                      >
                        <Save size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(envVar.key)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {envVars.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    No environment variables configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <LayoutSectionItemFootnote>
          Environment variables override system defaults. Use UPPER_CASE naming.
        </LayoutSectionItemFootnote>
      </LayoutSection>
    </LayoutStack>
  );
}
