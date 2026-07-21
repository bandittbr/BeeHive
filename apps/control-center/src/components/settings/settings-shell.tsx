import { useState } from "react";
import { 
  ArrowLeft, ChevronDown, X, Cpu, SlidersHorizontal, Paintbrush, 
  Terminal, Puzzle, Sparkles, Shield, Zap, RefreshCcw, Wrench,
  Bug, Network, BarChart3, Settings as SettingsIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  SettingsContent, SettingsPanel, SettingsPanelHeading, 
  SettingsPanelTitle, SettingsPanelDescription 
} from "./panel";
import { AiSettingsView } from "./ai-view";
import { AppearanceView } from "./appearance-view";
import { PreferencesView } from "./preferences-view";
import { EnvironmentView } from "./environment-view";
import { ExtensionsView } from "./extensions-view";
import { McpSettingsPanel } from "@/components/chat/McpSettingsPanel";

export type SettingsTab = 
  | "general" | "ai" | "preferences" | "appearance" | "extensions" 
  | "environment" | "mcp" | "skills" | "plugins" | "advanced" | "debug";

export function getSettingsTabIcon(tab: SettingsTab) {
  switch (tab) {
    case "ai": return Zap;
    case "preferences": return SlidersHorizontal;
    case "appearance": return Paintbrush;
    case "extensions": return Puzzle;
    case "environment": return Terminal;
    case "mcp": return Network;
    case "skills": return Sparkles;
    case "plugins": return Puzzle;
    case "advanced": return Wrench;
    case "debug": return Bug;
    default: return SettingsIcon;
  }
}

export function getSettingsTabLabel(tab: SettingsTab) {
  switch (tab) {
    case "ai": return "AI Providers";
    case "preferences": return "Preferences";
    case "appearance": return "Appearance";
    case "extensions": return "Extensions";
    case "environment": return "Environment";
    case "mcp": return "MCP Servers";
    case "skills": return "Skills";
    case "plugins": return "Plugins";
    case "advanced": return "Advanced";
    case "debug": return "Debug";
    default: return "Settings";
  }
}

export function getSettingsTabDescription(tab: SettingsTab) {
  switch (tab) {
    case "ai": return "Connect services that provide AI models";
    case "preferences": return "Default model, reasoning, and compaction";
    case "appearance": return "Theme, colors, and visual preferences";
    case "extensions": return "MCP servers, plugins, and skills";
    case "environment": return "Environment variables and API keys";
    case "mcp": return "Model Context Protocol servers";
    case "skills": return "Install and manage skills";
    case "plugins": return "Install and manage plugins";
    case "advanced": return "Developer options and diagnostics";
    case "debug": return "Debug tools and logs";
    default: return "Overview of all settings";
  }
}

const SETTINGS_SECTIONS = [
  { label: null, tabs: ["general"] as SettingsTab[] },
  { label: "System", tabs: ["ai", "preferences", "appearance", "extensions"] as SettingsTab[] },
  { label: "Data", tabs: ["environment", "mcp"] as SettingsTab[] },
  { label: "Developer", tabs: ["advanced", "debug"] as SettingsTab[] },
];

interface SettingsShellProps {
  activeTab: SettingsTab;
  onSelectTab: (tab: SettingsTab) => void;
  onClose: () => void;
  children?: React.ReactNode;
}

export function SettingsShell({ activeTab, onSelectTab, onClose, children }: SettingsShellProps) {
  const title = getSettingsTabLabel(activeTab);
  const description = getSettingsTabDescription(activeTab);

  return (
    <div className="flex h-dvh min-h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r border-border bg-muted/30">
        <div className="flex h-12 items-center gap-2 border-b border-border px-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-2">
          {SETTINGS_SECTIONS.map((section, i) => (
            <div key={section.label ?? "root"}>
              {i > 0 && <div className="my-2 border-t border-border" />}
              {section.label && (
                <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {section.label}
                </div>
              )}
              {section.tabs.map((tab) => {
                const Icon = getSettingsTabIcon(tab);
                return (
                  <button
                    key={tab}
                    onClick={() => onSelectTab(tab)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors",
                      activeTab === tab
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon size={16} />
                    <span>{getSettingsTabLabel(tab)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Mobile header */}
      <div className="flex md:hidden fixed top-0 left-0 right-0 h-12 items-center justify-between border-b border-border bg-background px-4 z-10">
        <button onClick={onClose} className="flex items-center gap-2 text-sm">
          <ArrowLeft size={14} />
          <span>Settings</span>
        </button>
        <SettingsDropdown activeTab={activeTab} onSelectTab={onSelectTab} />
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pt-12 md:pt-0">
        <SettingsContent>
          <SettingsPanel>
            <SettingsPanelHeading>
              <SettingsPanelTitle>{title}</SettingsPanelTitle>
              <SettingsPanelDescription>{description}</SettingsPanelDescription>
            </SettingsPanelHeading>
          </SettingsPanel>
          
          <SettingsTabContent activeTab={activeTab} />
          {children}
        </SettingsContent>
      </main>
    </div>
  );
}

function SettingsDropdown({ activeTab, onSelectTab }: { activeTab: SettingsTab; onSelectTab: (tab: SettingsTab) => void }) {
  const [open, setOpen] = useState(false);
  const Icon = getSettingsTabIcon(activeTab);
  
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm"
      >
        <Icon size={14} />
        <span>{getSettingsTabLabel(activeTab)}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-border bg-background shadow-lg z-50 py-1">
          {SETTINGS_SECTIONS.map((section, i) => (
            <div key={section.label ?? "root"}>
              {i > 0 && <div className="my-1 border-t border-border" />}
              {section.tabs.map((tab) => {
                const TabIcon = getSettingsTabIcon(tab);
                return (
                  <button
                    key={tab}
                    onClick={() => { onSelectTab(tab); setOpen(false); }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors",
                      activeTab === tab
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <TabIcon size={14} />
                    <span>{getSettingsTabLabel(tab)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SettingsTabContentProps {
  activeTab: SettingsTab;
}

function SettingsTabContent({ activeTab }: SettingsTabContentProps) {
  switch (activeTab) {
    case "ai":
      return <AiSettingsView />;
    case "preferences":
      return <PreferencesView />;
    case "appearance":
      return <AppearanceView />;
    case "extensions":
      return <ExtensionsView />;
    case "environment":
      return <EnvironmentView />;
    case "mcp":
      return <McpSettingsPanel />;
    default:
      return (
        <div className="text-sm text-muted-foreground py-8 text-center">
          This section is under development.
        </div>
      );
  }
}
