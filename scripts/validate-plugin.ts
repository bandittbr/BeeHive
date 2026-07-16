#!/usr/bin/env npx tsx
// pnpm validate plugin <name>
// Valida um plugin contra todas as regras de arquitetura

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { load } from "js-yaml";

interface CheckResult {
  name: string;
  status: "PASS" | "FAIL" | "WARN";
  detail: string;
}

const PLUGINS_DIR = join(process.cwd(), "plugins");

function parseYaml(raw: string): any {
  return load(raw);
}

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") files.push(...getAllTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(full);
  }
  return files;
}

async function main() {
  const pluginName = process.argv[2];
  if (!pluginName) {
    console.error("  Usage: pnpm validate plugin <name>");
    console.error("  Example: pnpm validate plugin foundation");
    process.exit(1);
  }

  const pluginDir = join(PLUGINS_DIR, pluginName);
  if (!existsSync(pluginDir)) {
    console.error("  Error: Plugin '" + pluginName + "' not found in plugins/");
    process.exit(1);
  }

  const srcDir = join(pluginDir, "src");
  const manifestPath = join(srcDir, "manifest.yaml");
  const capsDir = join(srcDir, "capabilities");
  const adaptersDir = join(srcDir, "adapters");

  const results: CheckResult[] = [];

  // 1. Manifest
  if (!existsSync(manifestPath)) {
    results.push({ name: "Manifest", status: "FAIL", detail: "manifest.yaml not found" });
  } else {
    try {
      const manifest = parseYaml(readFileSync(manifestPath, "utf-8"));
      results.push({ name: "Manifest", status: "PASS", detail: pluginName + "/src/manifest.yaml" });

      if (manifest.name) results.push({ name: "  name", status: "PASS", detail: manifest.name });
      else results.push({ name: "  name", status: "FAIL", detail: "missing" });

      if (manifest.version) results.push({ name: "  version", status: "PASS", detail: manifest.version });
      else results.push({ name: "  version", status: "FAIL", detail: "missing" });

      const caps = manifest.capabilities || [];
      if (Array.isArray(caps) && caps.length > 0)
        results.push({ name: "  capabilities", status: "PASS", detail: caps.length + " declared" });
      else results.push({ name: "  capabilities", status: "FAIL", detail: "none declared" });

      const adapters = manifest.adapters || [];
      if (Array.isArray(adapters))
        results.push({ name: "  adapters", status: "PASS", detail: adapters.length + " declared" });

      const permissions = manifest.permissions || [];
      if (Array.isArray(permissions))
        results.push({ name: "  permissions", status: "PASS", detail: permissions.length + " declared" });
    } catch (e: any) {
      results.push({ name: "Manifest", status: "FAIL", detail: "parse error: " + e.message });
    }
  }

  // 2. Capabilities
  const manifestCaps: string[] = [];
  if (existsSync(manifestPath)) {
    const m = parseYaml(readFileSync(manifestPath, "utf-8"));
    if (Array.isArray(m.capabilities)) {
      for (const c of m.capabilities) {
        if (typeof c === "string") {
          const match = c.match(/id:\s*(.+)/);
          manifestCaps.push(match ? match[1].trim() : c);
        } else {
          manifestCaps.push(c.id || String(c));
        }
      }
    }

    if (manifestCaps.length > 0) {
      results.push({ name: "Capabilities", status: "PASS", detail: manifestCaps.length + " declared" });

      for (const capId of manifestCaps) {
        const capFile = join(capsDir, capId + ".ts");
        if (existsSync(capFile)) {
          const content = readFileSync(capFile, "utf-8");
          if (content.includes("extends Capability")) {
            results.push({ name: "  " + capId, status: "PASS", detail: "implements Capability" });

            if (content.includes("ArtifactBuilder") || content.includes("new Artifact") || content.includes("Artifact.create"))
              results.push({ name: "    artifact", status: "PASS", detail: "produces Artifact" });
            else results.push({ name: "    artifact", status: "WARN", detail: "no Artifact found" });

            if (content.includes("ctx.events.publish"))
              results.push({ name: "    events", status: "PASS", detail: "publishes events" });
            else results.push({ name: "    events", status: "WARN", detail: "no events published" });

            if (content.includes("ctx: ExecutionContext"))
              results.push({ name: "    context", status: "PASS", detail: "uses ExecutionContext" });
            else results.push({ name: "    context", status: "FAIL", detail: "missing ExecutionContext" });
          } else {
            results.push({ name: "  " + capId, status: "FAIL", detail: "does not extend Capability" });
          }
        } else {
          results.push({ name: "  " + capId, status: "FAIL", detail: capId + ".ts not found" });
        }
      }
    }
  }

  // 3. Adapters
  if (existsSync(adaptersDir)) {
    const adapterFiles = readdirSync(adaptersDir).filter((f) => f.endsWith(".ts"));
    if (adapterFiles.length > 0) {
      results.push({ name: "Adapters", status: "PASS", detail: adapterFiles.length + " found" });
      for (const f of adapterFiles) {
        results.push({ name: "  " + f, status: "PASS", detail: "" });
      }
    }
  }

  // 4. Kernel isolation
  const allFiles = getAllTsFiles(srcDir);
  let kernelImports = false;
  for (const f of allFiles) {
    const content = readFileSync(f, "utf-8");
    if ((content.includes("../kernel") || content.includes("kernel/")) && content.includes("from")) {
      kernelImports = true;
      results.push({ name: "Kernel Isolation", status: "FAIL", detail: f + " imports Kernel" });
      break;
    }
  }
  if (!kernelImports) results.push({ name: "Kernel Isolation", status: "PASS", detail: "no Kernel imports" });

  // 5. SDK imports only
  let sdkOnly = true;
  for (const f of allFiles) {
    const content = readFileSync(f, "utf-8");
    const imports = content.match(/from\s+["'].*?["']/g) || [];
    for (const imp of imports) {
      const path = imp.replace(/from\s+/, "").replace(/["']/g, "");
      if (path.startsWith(".") || path === "@beehive/sdk") continue;
      if (path.startsWith("@beehive/") && path !== "@beehive/sdk") {
        results.push({ name: "SDK Only", status: "FAIL", detail: f + " imports " + path });
        sdkOnly = false;
      }
    }
  }
  if (sdkOnly) results.push({ name: "SDK Only", status: "PASS", detail: "only imports @beehive/sdk" });

  // ---- Report ----
  const failed = results.filter((r) => r.status === "FAIL");
  const warned = results.filter((r) => r.status === "WARN");
  const passed = results.filter((r) => r.status === "PASS");

  console.log();
  console.log("  ===============================");
  console.log("   Validate Plugin: " + pluginName);
  console.log("  ===============================");
  console.log();

  for (const r of results) {
    const icon = r.status === "PASS" ? "  \u2713" : r.status === "WARN" ? "  !" : "  \u2717";
    console.log(" " + icon + " " + r.name);
    if (r.detail) console.log("       " + r.detail);
  }

  console.log();
  const total = results.length;
  const score = total > 0 ? Math.round((passed.length / total) * 100) : 0;
  console.log("  ----------------------------------");
  console.log("   PASS: " + passed.length + " | WARN: " + warned.length + " | FAIL: " + failed.length);
  console.log("   Architecture Score: " + score + "%");
  console.log("  ===================================");

  if (failed.length > 0) process.exit(1);
}

main().catch(console.error);
