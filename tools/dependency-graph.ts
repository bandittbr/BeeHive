// BeeHive Dependency Graph
// Uso: npx tsx tools/dependency-graph.ts
//
// Mostra a cadeia completa: Plugin -> Capability -> Adapter -> Provider

import { Kernel } from '../kernel/Kernel';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

function parseYaml(raw: string): any {
  const result: any = {};
  const lines = raw.split('\n');
  let currentKey: string | null = null;
  let currentArr: any[] | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (!trimmed.startsWith('-') && trimmed.includes(':')) {
      if (currentArr && currentKey) { result[currentKey] = currentArr; currentArr = null; }
      const colonIdx = trimmed.indexOf(':');
      const key = trimmed.slice(0, colonIdx).trim();
      let val: any = trimmed.slice(colonIdx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val === '') { currentKey = key; currentArr = []; }
      else { result[key] = val; currentKey = null; }
    } else if (trimmed.startsWith('- ') && currentKey) {
      const item = trimmed.slice(2).trim();
      if (currentArr) currentArr.push(item);
    } else if (trimmed.startsWith('- {') && currentKey) {
      if (currentArr) { try { currentArr.push(JSON.parse(trimmed.slice(2))); } catch {} }
    }
  }
  if (currentArr && currentKey) result[currentKey] = currentArr;
  return result;
}

function findAdapterFiles(pluginDir: string): string[] {
  const adaptersDir = join(pluginDir, 'src', 'adapters');
  if (!existsSync(adaptersDir)) return [];
  return readdirSync(adaptersDir).filter(f => f.endsWith('.ts'));
}

async function graph() {
  console.log();
  console.log('  ====================================');
  console.log('   BeeHive Dependency Graph');
  console.log('  ====================================');
  console.log();

  const kernel = new Kernel();
  await kernel.boot();

  const pluginsDir = join(process.cwd(), 'plugins');
  const pluginDirs = readdirSync(pluginsDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name);

  for (const dir of pluginDirs) {
    const manifestPath = join(pluginsDir, dir, 'src', 'manifest.yaml');
    if (!existsSync(manifestPath)) continue;

    const manifest = parseYaml(readFileSync(manifestPath, 'utf-8'));
    const caps = manifest.capabilities || [];
    const adapters = manifest.adapters || [];
    const deps = manifest.dependencies || [];

    console.log(`   ${manifest.name} Plugin`);
    console.log(`   ${' '.repeat(3)}version: ${manifest.version}`);
    console.log();

    for (const cap of caps) {
      const capId = typeof cap === 'string' ? cap : cap.id;
      console.log(`   ${' '.repeat(3)}+-- ${capId}`);
      console.log(`   ${' '.repeat(6)}|`);
      for (const adpt of adapters) {
        console.log(`   ${' '.repeat(6)}+-- ${adpt} Adapter`);
        console.log(`   ${' '.repeat(9)}|`);
        console.log(`   ${' '.repeat(9)}+-- ${adpt} Provider`);
        console.log(`   ${' '.repeat(9)}`);
      }
    }

    if (deps.length > 0) {
      console.log(`   ${' '.repeat(3)}dependencies: ${deps.join(', ')}`);
    }
    console.log();
  }

  // List capabilities from runtime
  const caps = kernel.capabilities.list();
  console.log('  ------------------------------------');
  console.log('   Summary');
  console.log('  ------------------------------------');
  console.log(`   Plugins: ${pluginDirs.length}`);
  console.log(`   Capabilities: ${caps.length}`);
  const adapterCount = caps.reduce((acc: any[], c: any) => {
    const inputs = (c.capability.inputs || []) as any[];
    return [...new Set([...acc, ...inputs.map((i: any) => i.type)])];
  }, [] as string[]).filter(Boolean).length;
  console.log('   Adapters: ' + adapterCount);
  console.log();

  console.log('  ====================================');
  console.log();

  await kernel.shutdown();
}

graph().catch(console.error);
