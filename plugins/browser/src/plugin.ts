import { Plugin } from "@beehive/sdk";
import type { PluginContext, PluginManifest } from "@beehive/sdk";
import { BrowserNavigate } from "./capabilities/browser.navigate";
import { BrowserScrape } from "./capabilities/browser.scrape";
import { BrowserScreenshot } from "./capabilities/browser.screenshot";

export class BrowserPlugin extends Plugin {
  readonly id = "plugin:browser";
  readonly name = "Browser";
  readonly version = "1.1.0";
  readonly manifest: PluginManifest = {
    name: "browser",
    version: "1.1.0",
    description: "Plugin de navegador",
    capabilities: ["browser.navigate", "browser.scrape", "browser.screenshot"],
    adapters: ["Playwright"],
    permissions: ["browser:navigate", "browser:scrape", "browser:screenshot"],
  };

  async activate(ctx: PluginContext): Promise<void> {
    ctx.logger.info("BrowserPlugin activating...");
    ctx.capabilities.register(this.id, new BrowserNavigate());
    ctx.capabilities.register(this.id, new BrowserScrape());
    ctx.capabilities.register(this.id, new BrowserScreenshot());
    ctx.logger.info("BrowserPlugin activated");
  }

  async deactivate(): Promise<void> {}
}
