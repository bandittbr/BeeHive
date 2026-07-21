import { useState } from "react";
import { Puzzle, Sparkles, Plus, Trash2, ExternalLink, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  LayoutSection, LayoutSectionDescription, LayoutSectionHeader, 
  LayoutSectionItemFootnote, LayoutSectionTitle, LayoutStack 
} from "./settings-layout";
import { SettingsStatusBadge, SettingsNotice } from "./settings-section";

interface Plugin {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  version: string;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

const DEFAULT_PLUGINS: Plugin[] = [
  { id: "browser", name: "Browser", description: "Web browsing and scraping capabilities", enabled: true, version: "1.2.0" },
  { id: "filesystem", name: "Filesystem", description: "Local file system access", enabled: true, version: "1.0.0" },
  { id: "github", name: "GitHub", description: "GitHub API integration", enabled: false, version: "0.9.0" },
];

const DEFAULT_SKILLS: Skill[] = [
  { id: "code-review", name: "Code Review", description: "Automated code review and suggestions", enabled: true },
  { id: "documentation", name: "Documentation", description: "Generate and update documentation", enabled: true },
  { id: "testing", name: "Testing", description: "Write and run tests", enabled: false },
];

export function ExtensionsView() {
  const [activeTab, setActiveTab] = useState<"plugins" | "skills">("plugins");
  const [plugins, setPlugins] = useState<Plugin[]>(DEFAULT_PLUGINS);
  const [skills, setSkills] = useState<Skill[]>(DEFAULT_SKILLS);
  const [newPluginId, setNewPluginId] = useState("");
  const [isAddingPlugin, setIsAddingPlugin] = useState(false);

  const togglePlugin = (id: string) => {
    setPlugins(plugins.map((p) => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  const toggleSkill = (id: string) => {
    setSkills(skills.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const removePlugin = (id: string) => {
    setPlugins(plugins.filter((p) => p.id !== id));
  };

  const addPlugin = () => {
    if (newPluginId.trim() && !plugins.some((p) => p.id === newPluginId.trim())) {
      setPlugins([...plugins, {
        id: newPluginId.trim(),
        name: newPluginId.trim(),
        description: "Custom plugin",
        enabled: true,
        version: "1.0.0",
      }]);
      setNewPluginId("");
      setIsAddingPlugin(false);
    }
  };

  return (
    <LayoutStack>
      <LayoutSection>
        <LayoutSectionHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <LayoutSectionTitle>Extensions</LayoutSectionTitle>
              <LayoutSectionDescription className="max-w-[52ch]">
                Manage plugins and skills to extend BeeHive's capabilities.
              </LayoutSectionDescription>
            </div>
          </div>
        </LayoutSectionHeader>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
          <button
            onClick={() => setActiveTab("plugins")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "plugins" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Puzzle size={14} />
            Plugins ({plugins.length})
          </button>
          <button
            onClick={() => setActiveTab("skills")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "skills" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles size={14} />
            Skills ({skills.length})
          </button>
        </div>

        {activeTab === "plugins" && (
          <>
            {/* Add plugin */}
            <div className="flex items-center gap-2">
              {isAddingPlugin ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    placeholder="plugin-name"
                    value={newPluginId}
                    onChange={(e) => setNewPluginId(e.target.value)}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    onKeyDown={(e) => { if (e.key === "Enter") addPlugin(); }}
                    autoFocus
                  />
                  <Button size="sm" onClick={addPlugin} disabled={!newPluginId.trim()}>
                    <Check className="size-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setIsAddingPlugin(false); setNewPluginId(""); }}>
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsAddingPlugin(true)}>
                  <Plus className="size-3.5 mr-1.5" />
                  Add Plugin
                </Button>
              )}
            </div>

            {/* Plugin list */}
            <div className="space-y-2">
              {plugins.map((plugin) => (
                <div
                  key={plugin.id}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Puzzle size={18} className="text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{plugin.name}</span>
                        <span className="text-xs text-muted-foreground">v{plugin.version}</span>
                        <SettingsStatusBadge
                          tone={plugin.enabled ? "ready" : "neutral"}
                          label={plugin.enabled ? "Active" : "Inactive"}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{plugin.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={plugin.enabled}
                      onCheckedChange={() => togglePlugin(plugin.id)}
                    />
                    <button
                      onClick={() => removePlugin(plugin.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <LayoutSectionItemFootnote>
              Plugins extend BeeHive with additional capabilities. Install from npm or add custom plugins.
            </LayoutSectionItemFootnote>
          </>
        )}

        {activeTab === "skills" && (
          <>
            {/* Skill list */}
            <div className="space-y-2">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Sparkles size={18} className="text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{skill.name}</span>
                        <SettingsStatusBadge
                          tone={skill.enabled ? "ready" : "neutral"}
                          label={skill.enabled ? "Active" : "Inactive"}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={skill.enabled}
                      onCheckedChange={() => toggleSkill(skill.id)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <LayoutSectionItemFootnote>
              Skills provide specialized knowledge and workflows for specific tasks.
            </LayoutSectionItemFootnote>
          </>
        )}
      </LayoutSection>
    </LayoutStack>
  );
}
