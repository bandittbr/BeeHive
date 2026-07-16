#!/usr/bin/env npx tsx
// pnpm create plugin
// Scaffolding tool para criar novos plugins BeeHive

import { readdirSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { createInterface } from "readline";

const PLUGINS_DIR = join(process.cwd(), "plugins");

function ask(query: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(query, (answer) => { rl.close(); resolve(answer.trim()); }));
}

async function main() {
  console.log();
  console.log("  ===============================");
  console.log("   pnpm create plugin");
  console.log("  ===============================");
  console.log();

  const name = await ask("  Plugin name: ");
  if (!name || !/^[a-z][a-z0-9_-]*$/.test(name)) {
    console.error("  Error: Plugin name must start with a letter and contain only lowercase letters, numbers, hyphens, or underscores.");
    process.exit(1);
  }

  const pluginDir = join(PLUGINS_DIR, name);
  if (existsSync(pluginDir)) {
    console.error("  Error: Plugin '" + name + "' already exists.");
    process.exit(1);
  }

  console.log("  Enter capability IDs (one per line, empty line to finish):");
  const capabilities: string[] = [];
  while (true) {
    const cap = await ask("    > ");
    if (!cap) break;
    if (cap.includes(".")) capabilities.push(cap);
    else console.log("    (use format: domain.action, e.g. browser.scrape)");
  }

  const hasAdapters = (await ask("  Needs adapters? (y/N): ")).toLowerCase() === "y";
  const adapters: string[] = [];
  if (hasAdapters) {
    console.log("  Enter adapter names (one per line, empty line to finish):");
    while (true) {
      const a = await ask("    > ");
      if (!a) break;
      adapters.push(a);
    }
  }

  // --- Generate plugin ---
  const srcDir = join(pluginDir, "src");
  const capsDir = join(srcDir, "capabilities");
  const adaptersDir = join(srcDir, "adapters");
  mkdirSync(capsDir, { recursive: true });
  if (adapters.length > 0) mkdirSync(adaptersDir, { recursive: true });

  // package.json
  writeFileSync(join(pluginDir, "package.json"), JSON.stringify({
    name: "@beehive/plugin-" + name,
    version: "0.1.0",
    private: true,
    type: "module",
    main: "./src/index.ts",
    dependencies: { "@beehive/sdk": "workspace:*" },
  }, null, 2));

  // manifest.yaml
  const manifests = capabilities.map((c) => "  - id: " + c + "\n    description: \"" + c + " capability\"\n    inputs:\n      - { name: input, type: string, required: true }\n    outputs:\n      - { name: result, type: object }");
  const yamlContent = "name: " + name + "\nversion: 1.0.0\ndescription: \"" + name + " plugin\"\nauthor: BeeHive\n\ncapabilities:\n" + manifests.join("\n") + "\n\nadapters:\n" + (adapters.length > 0 ? adapters.map((a) => "  - " + a).join("\n") : "  - builtin") + "\n\npermissions:\n" + capabilities.map(() => "  - ").join("\n") + "\n";
  writeFileSync(join(srcDir, "manifest.yaml"), yamlContent);

  // plugin.ts
  const capImports = capabilities.map((c) => {
    const className = toPascalCase(c);
    return "import { " + className + ' } from "./capabilities/' + c + '";';
  }).join("\n");
  const capRegisters = capabilities.map((c) => {
    const className = toPascalCase(c);
    return "    ctx.capabilities.register(this.id, new " + className + "());";
  }).join("\n");

  writeFileSync(join(srcDir, "plugin.ts"), [
    'import { Plugin } from "@beehive/sdk";',
    'import type { PluginContext, PluginManifest } from "@beehive/sdk";',
    "",
    capImports,
    "",
    "export class " + toPascalCase(name) + "Plugin extends Plugin {",
    '  readonly id = "plugin:' + name + '";',
    '  readonly name = "' + toPascalCase(name) + '";',
    '  readonly version = "1.0.0";',
    "  readonly manifest: PluginManifest = {",
    '    name: "' + name + '",',
    '    version: "1.0.0",',
    '    description: "' + name + ' plugin",',
    "    capabilities: [" + capabilities.map((c) => '"' + c + '"').join(", ") + "],",
    "    adapters: [" + adapters.map((a) => '"' + a + '"').join(", ") + "],",
    "    permissions: [" + capabilities.map(() => '""').join(", ") + "],",
    "  };",
    "",
    "  async activate(ctx: PluginContext): Promise<void> {",
    "    ctx.logger.info('" + toPascalCase(name) + "Plugin activating...');",
    capRegisters,
    "    ctx.logger.info('" + toPascalCase(name) + "Plugin activated');",
    "  }",
    "",
    "  async deactivate(): Promise<void> {}",
    "}",
  ].join("\n"));

  // index.ts
  writeFileSync(join(srcDir, "index.ts"), 'export { ' + toPascalCase(name) + 'Plugin } from "./plugin";\n');

  // capabilities
  for (const cap of capabilities) {
    const className = toPascalCase(cap);
    writeFileSync(join(capsDir, cap + ".ts"), [
      'import { Capability, ArtifactBuilder, EventBuilder } from "@beehive/sdk";',
      'import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from "@beehive/sdk";',
      "",
      "export class " + className + " extends Capability {",
      '  readonly id = "' + cap + '";',
      '  readonly name = "' + className + '";',
      '  readonly description = "' + cap + ' capability";',
      "  readonly inputs: CapabilityInput[] = [",
      '    { name: "input", type: "string", description: "Input", required: true },',
      "  ];",
      "  readonly outputs: CapabilityOutput[] = [",
      '    { name: "result", type: "object", description: "Result" },',
      "  ];",
      "",
      "  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {",
      "    ctx.logger.info('" + className + ": ' + params.input);",
      "",
      "    const result = { processed: params.input, timestamp: Date.now() };",
      "    const artifact = ArtifactBuilder.create('json', this.id).withData(result).build();",
      "",
      "    const event = EventBuilder.create('" + cap.replace(".", ":") + ":completed', this.id)",
      '      .withPayload({ artifactId: artifact.id })',
      "      .build();",
      "    ctx.events.publish(event);",
      "",
      "    return {",
      "      success: true,",
      "      outputs: { result },",
      "      metrics: { duration: 0 },",
      "    };",
      "  }",
      "}",
    ].join("\n"));
  }

  // adapters
  for (const adapter of adapters) {
    writeFileSync(join(adaptersDir, adapter.toLowerCase() + ".adapter.ts"), [
      "export class " + toPascalCase(adapter) + "Adapter {",
      "  constructor(private config: Record<string, unknown> = {}) {}",
      "}",
    ].join("\n"));
  }

  console.log();
  console.log("  Plugin '" + name + "' created successfully!");
  console.log();
  console.log("  Location: plugins/" + name + "/");
  console.log("  Capabilities: " + capabilities.join(", "));
  if (adapters.length > 0) console.log("  Adapters: " + adapters.join(", "));
  console.log();
  console.log("  Next steps:");
  console.log("    Implement the capabilities in plugins/" + name + "/src/capabilities/");
  console.log("    Run 'pnpm validate plugin " + name + "' to verify");
  console.log();
}

function toPascalCase(str: string): string {
  return str
    .split(/[.\-_\s]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

main().catch(console.error);
