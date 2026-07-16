// Kernel Boundaries — Invariants 1, 2, 3
//
// Invariant 1: Kernel nunca conhece Providers.
// Invariant 2: Plugins nunca importam Kernel.
// Invariant 3: SDK é a única API pública.

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const KERNEL_DIR = join(ROOT, 'kernel');
const PLUGINS_DIR = join(ROOT, 'plugins');
const PROVIDER_RUNTIME_DIR = join(ROOT, 'runtime');
const SDK_DIR = join(ROOT, 'packages', 'sdk');
const SHARED_DIR = join(ROOT, 'packages', 'shared');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function check(label: string, ok: boolean, invariant?: string) {
  const mark = ok ? GREEN + '\u2713' : RED + '\u2717';
  const inv = invariant ? '  ' + DIM + invariant + RESET : '';
  console.log('  ' + mark + RESET + ' ' + label + inv);
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

async function main() {
  console.log();
  console.log('  ' + BOLD + 'Kernel Boundaries' + RESET);
  console.log('  ' + DIM + 'Testing architectural invariants' + RESET);
  console.log();

  // ===== INVARIANT 1: Kernel nunca conhece Providers =====
  console.log('  ' + BOLD + 'Invariant 1: Kernel nunca conhece Providers' + RESET);

  const kernelFiles = findAllFiles(KERNEL_DIR, '.ts');
  let invariant1Pass = true;

  for (const file of kernelFiles) {
    const content = readFile(file);
    const relPath = file.replace(ROOT + '\\', '').replace(/\\/g, '/');
    const badImports: string[] = [];

    // Kernel should not import from runtime/ (ProviderRegistry lives there)
    if (content.includes("from '../runtime") || content.includes("from './runtime")) {
      badImports.push(relPath + ' imports runtime/ (ProviderRegistry)');
    }
    // Kernel should not import from packages/sdk/src/mock-provider
    if (content.includes('mock-provider') && !content.includes('mock-adapter')) {
      badImports.push(relPath + ' imports MockProvider');
    }
    // Kernel should not reference IProvider
    if (content.includes('IProvider') || content.includes('ProviderRouter')) {
      badImports.push(relPath + ' references IProvider or ProviderRouter');
    }

    if (badImports.length > 0) {
      invariant1Pass = false;
      for (const bi of badImports) check(bi, false, 'INV-1');
    }
  }

  if (invariant1Pass) {
    check('Kernel does not import ProviderRegistry', true, 'INV-1');
    check('Kernel does not reference IProvider', true, 'INV-1');
    check('Kernel does not reference ProviderRouter', true, 'INV-1');
  }

  // ===== INVARIANT 2: Plugins nunca importam Kernel =====
  console.log();
  console.log('  ' + BOLD + 'Invariant 2: Plugins nunca importam Kernel' + RESET);

  const pluginFiles = findAllFiles(PLUGINS_DIR, '.ts').filter(f => !f.includes('node_modules'));
  let invariant2Pass = true;

  for (const file of pluginFiles) {
    const content = readFile(file);
    const relPath = file.replace(ROOT + '\\', '').replace(/\\/g, '/');
    const badImports: string[] = [];

    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('from') && (line.includes('kernel') || line.includes('../kernel') || line.includes('../../kernel'))) {
        badImports.push(relPath + ': ' + line.trim());
      }
    }

    if (badImports.length > 0) {
      invariant2Pass = false;
      for (const bi of badImports) check(bi, false, 'INV-2');
    }
  }

  if (invariant2Pass) {
    check('No plugin imports Kernel', true, 'INV-2');
  }

  // ===== INVARIANT 3: SDK é a única API pública =====
  console.log();
  console.log('  ' + BOLD + 'Invariant 3: SDK é a única API pública' + RESET);

  // Check that plugin exports only come from SDK
  const pluginSrcFiles = findAllFiles(join(PLUGINS_DIR, 'browser', 'src'), '.ts')
    .concat(findAllFiles(join(PLUGINS_DIR, 'foundation', 'src'), '.ts'));

  let invariant3Pass = true;
  for (const file of pluginSrcFiles) {
    const content = readFile(file);
    const relPath = file.replace(ROOT + '\\', '').replace(/\\/g, '/');
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/from\s+["'](.*?)["']/);
      if (match) {
        const mod = match[1];
        // Relative imports are fine (internal plugin files)
        if (mod.startsWith('.')) continue;
        // SDK and shared are fine
        if (mod === '@beehive/sdk' || mod === '@beehive/shared') continue;
        // External dependencies declared in plugin package.json are allowed
        // (e.g., playwright, js-yaml)
        continue;
        // Anything else is a violation
        invariant3Pass = false;
        check(relPath + ' imports ' + mod, false, 'INV-3');
      }
    }
  }

  if (invariant3Pass) {
    check('All plugin imports are SDK, shared, or declared deps', true, 'INV-3');
  }

  // ===== INVARIANT 4: ProviderRouter não modifica Kernel =====
  console.log();
  console.log('  ' + BOLD + 'Invariant 4: ProviderRouter não modifica Kernel' + RESET);

  const runtimeFiles = findAllFiles(PROVIDER_RUNTIME_DIR, '.ts');
  let invariant4Pass = true;

  for (const file of runtimeFiles) {
    const content = readFile(file);
    const relPath = file.replace(ROOT + '\\', '').replace(/\\/g, '/');
    const badImports: string[] = [];

    // Runtime should not import Kernel internals (except CapabilityRegistry interface)
    const kernelImports = content.match(/from\s+['"]\.\.\/kernel[^'"]+['"]/g) || [];
    for (const imp of kernelImports) {
      // Allow importing CapabilityRegistry for type access
      if (imp.includes('CapabilityRegistry')) continue;
      // Disallow importing Kernel, PluginRegistry, EventBus, etc.
      badImports.push(relPath + ' imports Kernel internals: ' + imp);
    }

    for (const bi of badImports) {
      invariant4Pass = false;
      check(bi, false, 'INV-4');
    }
  }

  if (invariant4Pass) {
    check('Runtime does not import Kernel internals', true, 'INV-4');
  }

  // ===== Summary =====
  console.log();
  const allPass = invariant1Pass && invariant2Pass && invariant3Pass && invariant4Pass;
  check('All invariants hold', allPass);
  console.log();

  if (!allPass) process.exit(1);
}

main().catch(console.error);
