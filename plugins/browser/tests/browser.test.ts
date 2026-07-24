// Browser Plugin Tests
// Definition of Done checklist:
//   ? Installs without altering Kernel
//   ? Auto-discovered by PluginRegistry
//   ? Registers capabilities
//   ? Passes validate:plugin
//   ? Has own tests
//   ? Publishes events
//   ? Returns only Artifact
//   ? Uses ExecutionContext

import { readFileSync } from "fs";
import { BrowserPlugin } from "../src/plugin";
import { CapabilityBuilder } from "@beehive/sdk";

// MOCK PluginContext
function createMockCtx() {
  const capabilities: any[] = [];
  const events: any[] = [];

  return {
    capabilities: {
      register(pluginId: string, cap: any) {
        capabilities.push({ pluginId, cap });
      },
      list: () => capabilities,
    },
    events: {
      publish(event: any) { events.push(event); },
      getPublished: () => events,
    },
    logger: {
      info: (...args: any[]) => {},
      warn: (...args: any[]) => {},
      error: (...args: any[]) => {},
    },
    storage: { get: async () => null, set: async () => {}, delete: async () => {}, list: async () => [] },
    memory: { search: async () => [], store: async () => "", get: async () => null, delete: async () => {} },
    ai: { chat: async () => ({}), chatStream: async function*() {} },
    config: { get: () => undefined, set: () => {}, getAll: () => ({}), getPluginConfig: () => ({}), watch: () => () => {} },
    permissions: { hasPermission: async () => true, requirePermission: async () => {} },
    workflow: { execute: async () => null, getStatus: async () => "" },
    _capabilities: capabilities,
    _events: events,
  } as any;
}

async function main() {
  let passed = 0;
  let failed = 0;

  function assert(name: string, fn: () => boolean | Promise<boolean>) {
    const result = fn();
    const ok = result instanceof Promise ? false : result;
    if (ok) { passed++; console.log("  \u2713 " + name); }
    else { failed++; console.log("  \u2717 " + name); }
  }

  async function assertAsync(name: string, fn: () => Promise<boolean>) {
    try {
      const ok = await fn();
      if (ok) { passed++; console.log("  \u2713 " + name); }
      else { failed++; console.log("  \u2717 " + name); }
    } catch (e: any) {
      failed++;
      console.log("  \u2717 " + name + " (" + e.message + ")");
    }
  }

  console.log("  -- Browser Plugin Tests --");

  // Test 1: Plugin activates and registers 3 capabilities
  await assertAsync("Registers 3 capabilities", async () => {
    const plugin = new BrowserPlugin();
    const ctx = createMockCtx();
    await plugin.activate(ctx);
    return ctx._capabilities.length === 3;
  });

  // Test 2: Capabilities have correct IDs
  await assertAsync("Has browser.navigate", async () => {
    return (new BrowserPlugin().manifest.capabilities.includes("browser.navigate"));
  });

  await assertAsync("Has browser.scrape", async () => {
    return (new BrowserPlugin().manifest.capabilities.includes("browser.scrape"));
  });

  await assertAsync("Has browser.screenshot", async () => {
    return (new BrowserPlugin().manifest.capabilities.includes("browser.screenshot"));
  });

  // Test 3: Plugin manifest is valid
  assert("Manifest has name", () => !!new BrowserPlugin().manifest.name);
  assert("Manifest has version", () => !!new BrowserPlugin().manifest.version);
  assert("Manifest has 3 capabilities", () => new BrowserPlugin().manifest.capabilities.length === 3);

  // Test 4: Capability schemas are valid
  const navigateCap = new (await import("../src/capabilities/browser.navigate")).BrowserNavigate();
  const scrapeCap = new (await import("../src/capabilities/browser.scrape")).BrowserScrape();
  const screenshotCap = new (await import("../src/capabilities/browser.screenshot")).BrowserScreenshot();

  assert("navigate has url input", () => navigateCap.inputs.some((i: any) => i.name === "url" && i.required));
  assert("scrape has url input", () => scrapeCap.inputs.some((i: any) => i.name === "url" && i.required));
  assert("screenshot has url input", () => screenshotCap.inputs.some((i: any) => i.name === "url" && i.required));

  assert("navigate has title output", () => navigateCap.outputs.some((o: any) => o.name === "title"));
  assert("scrape has markdown output", () => scrapeCap.outputs.some((o: any) => o.name === "markdown"));
  assert("screenshot has image output", () => screenshotCap.outputs.some((o: any) => o.name === "image"));

  // Test 5: All capabilities import ArtifactBuilder
  assert("navigate uses ArtifactBuilder", () => {
    
    const content = readFileSync("plugins/browser/src/capabilities/browser.navigate.ts", "utf-8");
    return content.includes("ArtifactBuilder");
  });

  assert("scrape uses ArtifactBuilder", () => {
    
    const content = readFileSync("plugins/browser/src/capabilities/browser.scrape.ts", "utf-8");
    return content.includes("ArtifactBuilder");
  });

  assert("screenshot uses ArtifactBuilder", () => {
    
    const content = readFileSync("plugins/browser/src/capabilities/browser.screenshot.ts", "utf-8");
    return content.includes("ArtifactBuilder");
  });

  // Test 6: No Kernel imports
  assert("No Kernel imports in navigate", () => {
    
    const content = readFileSync("plugins/browser/src/capabilities/browser.navigate.ts", "utf-8");
    return !content.includes("../kernel") && !content.includes("kernel/");
  });

  assert("No Kernel imports in scrape", () => {
    
    const content = readFileSync("plugins/browser/src/capabilities/browser.scrape.ts", "utf-8");
    return !content.includes("../kernel") && !content.includes("kernel/");
  });

  assert("No Kernel imports in screenshot", () => {
    
    const content = readFileSync("plugins/browser/src/capabilities/browser.screenshot.ts", "utf-8");
    return !content.includes("../kernel") && !content.includes("kernel/");
  });

  // Test 8: Readiness returns ready when chromium present
  await assertAsync("Readiness returns ready", async () => {
    const navigateCap = new (await import("../src/capabilities/browser.navigate")).BrowserNavigate();
    const result = await navigateCap.readiness();
    return result.status === 'ready';
  });

  // Test 9: Health returns healthy when chromium present
  await assertAsync("Health returns healthy", async () => {
    const navigateCap = new (await import("../src/capabilities/browser.navigate")).BrowserNavigate();
    const result = await navigateCap.health();
    return result.status === 'healthy';
  });

  // Test 10: Readiness/Health methods exist on all capabilities
  const allCaps = [
    new (await import("../src/capabilities/browser.navigate")).BrowserNavigate(),
    new (await import("../src/capabilities/browser.scrape")).BrowserScrape(),
    new (await import("../src/capabilities/browser.screenshot")).BrowserScreenshot(),
  ];

  for (const cap of allCaps) {
    assert(cap.id + " has readiness()", () => typeof (cap as any).readiness === 'function');
    assert(cap.id + " has health()", () => typeof (cap as any).health === 'function');
  }

  // Test 7: SDK imports only
  assert("Only SDK imports in navigate", () => {
    
    const content = readFileSync("plugins/browser/src/capabilities/browser.navigate.ts", "utf-8");
    const imports = content.match(/from\s+["'].*?["']/g) || [];
    return imports.every((i: string) => {
      const path = i.replace(/from\s+/, "").replace(/["']/g, "");
      return path.startsWith(".") || path === "@beehive/sdk";
    });
  });

  console.log();
  console.log("  Results: " + passed + " passed, " + failed + " failed of " + (passed + failed));
  console.log();

  if (failed > 0) process.exit(1);
}

main().catch(console.error);

