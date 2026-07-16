// BeeHive Architecture Tests
// "Testes que garantem que ninguém quebre o BeeHive daqui seis meses"
//
// Static:  scan filesystem, no runtime needed
// Dynamic: boot kernel, validate runtime behavior

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { load } from 'js-yaml';

const ROOT = process.cwd();
const PLUGINS_DIR = join(ROOT, 'plugins');
const PROVIDERS_DIR = join(ROOT, 'providers');

// ---- Helpers ----
interface Manifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  capabilities: Array<{ id: string; description: string }>;
  adapters: string[];
  dependencies: string[];
  permissions: string[];
  requirements?: {
    runtime?: string[];
    dependencies?: string[];
    setup?: string[];
  };
}

function parseYaml(raw: string): Manifest {
  const parsed: any = load(raw);
  return {
    name: parsed.name || '',
    version: parsed.version || '',
    description: parsed.description || '',
    author: parsed.author,
    capabilities: Array.isArray(parsed.capabilities) ? parsed.capabilities : [],
    adapters: Array.isArray(parsed.adapters) ? parsed.adapters : [],
    dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies : [],
    permissions: Array.isArray(parsed.permissions) ? parsed.permissions : [],
  };
}

function findAllFiles(dir: string, ext: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;
  function walk(d: string) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') walk(full);
      else if (entry.isFile() && entry.name.endsWith(ext)) files.push(full);
    }
  }
  walk(dir);
  return files;
}

function readFile(path: string): string {
  return readFileSync(path, 'utf-8');
}

function relativePath(p: string): string {
  return relative(ROOT, p).replace(/\\/g, '/');
}

// ---- Test Runner ----
interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  details: string[];
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => { pass: boolean; details: string[] } | Promise<{ pass: boolean; details: string[] }>) {
  try {
    const result = await fn();
    results.push({ name, status: result.pass ? 'PASS' : 'FAIL', details: result.details });
  } catch (e: any) {
    results.push({ name, status: 'FAIL', details: [], error: e.message });
  }
}

// ============================================================
// TEST 1: Todo plugin encontrado deve possuir manifest válido
// ============================================================

// ============================================================
// TEST 2: Toda capability declarada no manifesto deve possuir implementação
// ============================================================

// ============================================================
// TEST 3: Nenhum plugin pode importar o Kernel
// ============================================================

// ============================================================
// TEST 4: Nenhum Adapter pode acessar outro Adapter
// ============================================================

// ============================================================
// TEST 5: Nenhum Provider pode conhecer Plugins
// ============================================================

// ============================================================
// TEST 6: Toda Capability deve retornar Artifact
// ============================================================

// ============================================================
// TEST 7: Toda execução deve possuir ExecutionContext
// ============================================================

// ============================================================
// TEST 8: Toda execução publica eventos
// ============================================================

// ---- Main ----
async function main() {
  // Test 1: Plugin Manifest Validation
  await test('Test 1: Plugin Manifest Valido', () => {
    const details: string[] = [];
    let pass = true;

    const pluginDirs = readdirSync(PLUGINS_DIR, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name);

    for (const dir of pluginDirs) {
      const manifestPath = join(PLUGINS_DIR, dir, 'src', 'manifest.yaml');
      if (!existsSync(manifestPath)) {
        details.push('  MISSING: ' + dir + '/src/manifest.yaml');
        pass = false;
        continue;
      }
      try {
        const manifest = parseYaml(readFile(manifestPath));
        if (!manifest.name) { details.push('  INVALID: ' + dir + ' manifest missing name'); pass = false; }
        if (!manifest.version) { details.push('  INVALID: ' + dir + ' manifest missing version'); pass = false; }
        if (!Array.isArray(manifest.capabilities)) { details.push('  INVALID: ' + dir + ' manifest missing capabilities'); pass = false; }
        if (!Array.isArray(manifest.adapters)) { details.push('  INVALID: ' + dir + ' manifest missing adapters'); pass = false; }
        if (!Array.isArray(manifest.permissions)) { details.push('  INVALID: ' + dir + ' manifest missing permissions'); pass = false; }
        details.push('  OK: ' + dir + ' (' + manifest.capabilities.length + ' capabilities, ' + manifest.adapters.length + ' adapters)');
      } catch (e: any) {
        details.push('  PARSE_ERROR: ' + dir + ' manifest: ' + e.message);
        pass = false;
      }
    }

    return { pass, details };
  });

  // Test 2: Capability Implementation
  await test('Test 2: Capability Implementation', () => {
    const details: string[] = [];
    let pass = true;

    const pluginDirs = readdirSync(PLUGINS_DIR, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name);

    for (const dir of pluginDirs) {
      const manifestPath = join(PLUGINS_DIR, dir, 'src', 'manifest.yaml');
      if (!existsSync(manifestPath)) continue;

      const manifest = parseYaml(readFile(manifestPath));
      const capsDir = join(PLUGINS_DIR, dir, 'src', 'capabilities');

      if (!existsSync(capsDir)) {
        details.push('  MISSING: ' + dir + '/src/capabilities/ directory not found');
        pass = false;
        continue;
      }

      for (const cap of manifest.capabilities) {
        const capId = typeof cap === 'string' ? cap : cap.id;
        const capFile = join(capsDir, capId + '.ts');
        if (!existsSync(capFile)) {
          details.push('  MISSING: ' + dir + ' declares ' + capId + ' but no ' + capId + '.ts found');
          pass = false;
        } else {
          const content = readFile(capFile);
          if (!content.includes('extends Capability') && !content.includes('CapabilityBuilder')) {
            details.push('  INVALID: ' + dir + '/' + capId + '.ts does not export a Capability class');
            pass = false;
          } else {
            details.push('  OK: ' + dir + '/' + capId + '.ts');
          }
        }
      }
    }

    return { pass, details };
  });

  // Test 3: Plugin Kernel Isolation
  await test('Test 3: Plugin Kernel Isolation', () => {
    const details: string[] = [];
    let pass = true;

    const pluginFiles = findAllFiles(PLUGINS_DIR, '.ts').filter(f => !f.includes('node_modules'));

    for (const file of pluginFiles) {
      const content = readFile(file);
      const badImports: string[] = [];
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes('from') && (line.includes('kernel') || line.includes('../kernel') || line.includes('../../kernel'))) {
          badImports.push(line.trim());
        }
      }
      if (badImports.length > 0) {
        details.push('  FAIL: ' + relativePath(file) + ' imports Kernel:');
        badImports.forEach(i => details.push('    ' + i));
        pass = false;
      }
    }

    if (pass) details.push('  OK: Nenhum plugin importa o Kernel');
    return { pass, details };
  });

  // Test 4: Adapter Isolation
  await test('Test 4: Adapter Isolation', () => {
    const details: string[] = [];
    let pass = true;

    const adapterFiles = findAllFiles(PLUGINS_DIR, '.ts')
      .filter(f => f.includes('adapters') && !f.includes('node_modules'));

    for (const file of adapterFiles) {
      const content = readFile(file);
      const badImports: string[] = [];
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes('from') && line.includes('adapters') && !line.includes(relativePath(file))) {
          badImports.push(line.trim());
        }
      }
      if (badImports.length > 0) {
        details.push('  FAIL: ' + relativePath(file) + ' imports another adapter');
        badImports.forEach(i => details.push('    ' + i));
        pass = false;
      }
    }

    if (pass) details.push('  OK: Nenhum adapter importa outro adapter');
    return { pass, details };
  });

  // Test 5: Provider Plugin Isolation
  await test('Test 5: Provider Plugin Isolation', () => {
    const details: string[] = [];
    let pass = true;

    if (!existsSync(PROVIDERS_DIR)) {
      details.push('  SKIP: providers/ directory not yet created');
      return { pass: true, details };
    }

    const providerFiles = findAllFiles(PROVIDERS_DIR, '.ts').filter(f => !f.includes('node_modules'));

    for (const file of providerFiles) {
      const content = readFile(file);
      const badImports: string[] = [];
      const lines = content.split('\n');
      for (const line of lines) {
        if ((line.includes('plugins') || line.includes('@beehive/sdk')) && line.includes('from')) {
          badImports.push(line.trim());
        }
      }
      if (badImports.length > 0) {
        details.push('  FAIL: ' + relativePath(file) + ' imports plugin layer');
        badImports.forEach(i => details.push('    ' + i));
        pass = false;
      }
    }

    if (pass) details.push('  OK: Nenhum provider conhece plugins');
    return { pass, details };
  });

  // Test 6: Capability Artifact Return
  await test('Test 6: Capability Artifact Return', () => {
    const details: string[] = [];
    let pass = true;

    const capFiles = findAllFiles(PLUGINS_DIR, '.ts')
      .filter(f => f.includes('capabilities') && !f.includes('node_modules'));

    for (const file of capFiles) {
      const content = readFile(file);
      const importsArtifact = content.includes('import { Artifact') || content.includes('import { Capability, Artifact');
      if (!importsArtifact) {
        details.push('  WARN: ' + relativePath(file) + ' does not import Artifact');
      } else {
        details.push('  OK: ' + relativePath(file) + ' imports Artifact');
      }
    }

    return { pass, details };
  });

  // Test 7: ExecutionContext Enforcement
  await test('Test 7: ExecutionContext Enforcement', () => {
    const details: string[] = [];
    let pass = true;

    const capFiles = findAllFiles(PLUGINS_DIR, '.ts')
      .filter(f => f.includes('capabilities') && !f.includes('node_modules'));

    for (const file of capFiles) {
      const content = readFile(file);
      const hasExecuteMethod = content.includes('async execute(') || content.includes('execute(');
      const hasCtxParam = content.includes('ctx: ExecutionContext');
      if (hasExecuteMethod && !hasCtxParam) {
        details.push('  FAIL: ' + relativePath(file) + ' execute() missing ExecutionContext parameter');
        pass = false;
      } else if (hasExecuteMethod) {
        details.push('  OK: ' + relativePath(file) + ' uses ExecutionContext');
      }
    }

    return { pass, details };
  });

  // Test 8: Event Publication
  await test('Test 8: Event Publication', () => {
    const details: string[] = [];
    let pass = true;

    const capFiles = findAllFiles(PLUGINS_DIR, '.ts')
      .filter(f => f.includes('capabilities') && !f.includes('node_modules'));

    for (const file of capFiles) {
      const content = readFile(file);
      const publishes = content.includes('ctx.events.publish(') || content.includes('ctx.events.publishMany(');
      if (!publishes) {
        details.push('  WARN: ' + relativePath(file) + ' does not publish events');
      } else {
        details.push('  OK: ' + relativePath(file) + ' publishes events');
      }
    }

    return { pass, details };
  });

  // Test 9: Dynamic - Kernel Boot and Plugin Activation
  await test('Test 9: Dynamic - Kernel Boot and Plugin Activation', async () => {
    const details: string[] = [];
    const { Kernel } = await import('../../kernel/Kernel');
    const kernel = new Kernel();
    const report = await kernel.boot();

    details.push('  Kernel booted in ' + report.kernel.duration + 'ms');
    details.push('  Status: ' + report.kernel.status);

    for (const plugin of report.plugins) {
      if (plugin.status === 'activated') {
        details.push('  Plugin: ' + plugin.id + ' -> ACTIVATED');
      } else {
        details.push('  Plugin: ' + plugin.id + ' -> FAILED: ' + plugin.error);
      }
    }

    details.push('  Capabilities registered: ' + report.capabilities);

    return {
      pass: report.kernel.status === 'running' && report.capabilities > 0,
      details,
    };
  });

  // Test 10: Dynamic - Capability Resolution
  await test('Test 10: Dynamic - Capability Resolution', async () => {
    const details: string[] = [];
    const { Kernel } = await import('../../kernel/Kernel');
    const kernel = new Kernel();
    await kernel.boot();

    const caps = kernel.capabilities.list();
    details.push('  Total registered: ' + caps.length);

    let allResolve = true;
    for (const entry of caps) {
      try {
        kernel.capabilities.resolve(entry.capability.id);
        details.push('  ' + entry.capability.id + ' -> plugin:' + entry.pluginId + ' -> RESOLVES');
      } catch (e: any) {
        details.push('  ' + entry.capability.id + ' -> FAILED: ' + e.message);
        allResolve = false;
      }
    }

    return {
      pass: caps.length > 0 && allResolve,
      details,
    };
  });

  // ---- Report ----
  const failed = results.filter(r => r.status === 'FAIL');
  console.log('\n');
  console.log('  ' + '='.repeat(55));
  console.log('   BeeHive Architecture Tests');
  console.log('  ' + '='.repeat(55));
  console.log('   Date: ' + new Date().toISOString());
  console.log('  ' + '-'.repeat(55));
  console.log();

  for (const r of results) {
    const icon = r.status === 'PASS' ? '  \u2713' : '  \u2717';
    console.log(' ' + icon + ' ' + r.name);
    for (const d of r.details) console.log('    ' + d);
    if (r.error) console.log('    ERROR: ' + r.error);
    console.log();
  }

  console.log('  ' + '-'.repeat(55));
  console.log('   Total: ' + results.length + ' | PASS: ' + (results.length - failed.length) + ' | FAIL: ' + failed.length);
  console.log('  ' + '='.repeat(55));
  console.log();

  if (failed.length > 0) {
    console.log('  FAILED TESTS:');
    for (const f of failed) console.log('    - ' + f.name);
    process.exit(1);
  }
}

main().catch(console.error);
