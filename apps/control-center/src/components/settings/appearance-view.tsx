import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { LayoutStack } from "./settings-layout";

type ThemeMode = "light" | "dark" | "system";

export function AppearanceView() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    if (themeMode === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.add(prefersDark ? "dark" : "light");
    } else {
      document.documentElement.classList.add(themeMode);
    }
  }, [themeMode]);
  return (
    <LayoutStack>
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-medium text-foreground">Theme</h3>
          <p className="text-sm text-muted-foreground">Choose your preferred color scheme</p>
        </div>
        <div className="flex gap-4">
          {(["system", "light", "dark"] as ThemeMode[]).map((mode) => (
            <button
              key={mode}
              className={`group/theme flex flex-1 flex-col items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                themeMode === mode
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
              onClick={() => setThemeMode(mode)}
            >
              <div
                className={`aspect-[4/3] w-full overflow-hidden rounded-md border transition-shadow ${
                  mode === "system"
                    ? ""
                    : mode === "light"
                    ? "bg-white"
                    : "bg-zinc-950"
                } ${themeMode === mode ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
              >
                {mode === "system" && (
                  <div className="flex h-full">
                    <div className="w-1/2 bg-white" />
                    <div className="w-1/2 bg-zinc-950" />
                  </div>
                )}
              </div>
              <span className={`text-sm capitalize ${themeMode === mode ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {mode}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          System theme follows your operating system preference.
        </p>
      </div>
    </LayoutStack>
  );
}
