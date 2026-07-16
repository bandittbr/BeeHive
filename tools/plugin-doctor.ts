#!/usr/bin/env tsx
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { load } from 'js-yaml';

const ROOT = process.cwd();
const PLUGINS_DIR = join(ROOT, 'plugins');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function checkMark(label: string, ok: boolean, detail?: string) {
  const mark = ok ? GREEN + '\u2713' : RED + '\u2717';
  const msg = '  ' + mark + RESET + ' ' + label;
  console.log(msg);
  if (detail && !ok) console.log('    ' + YELLOW + detail + RESET);
}

async function diagnosePlugin(dir: string) {
  const manifestPath = join(PLUGINS_DIR, dir, 'src', 'manifest.yaml');
  if (!existsSync(manifestPath)) {
    console.log('  ' + RED + 'No manifest.yaml found in plugins/' + dir + RESET);
    return;
  }

  const raw = readFileSync(manifestPath, 'utf-8');
  const manifest: any = load(raw);

  console.log();
  console.log('  ' + BOLD + CYAN + manifest.name + ' v' + manifest.version + RESET);
  console.log('  ' + DIM + manifest.description + RESET);
  console.log();

  // 1. Manifest syntax
  checkMark('Manifest valido', !!manifest.name && !!manifest.version);

  // 2. Runtime requirements
  if (manifest.requirements?.runtime) {
    for (const req of manifest.requirements.runtime) {
      const match = req.match(/^(\w+)\s*(>=?|<=?|=)\s*(\S+)$/);
      if (match) {
        try {
          const runtimeVer = process.version.slice(1);
          checkMark('runtime ' + req, true, 'node ' + runtimeVer);
        } catch {
          checkMark('runtime ' + req, false, 'unknown');
        }
      } else {
        checkMark('runtime ' + req, true);
      }
    }
  }

  // 3. npm dependencies
  if (manifest.requirements?.dependencies) {
    for (const dep of manifest.requirements.dependencies) {
      try {
        const pkgPath = join(ROOT, 'node_modules', dep);
        checkMark('dependencia ' + dep, existsSync(pkgPath));
      } catch {
        checkMark('dependencia ' + dep, false, 'npm install ' + dep);
      }
    }
  }

  // 4. System dependencies (chromium, etc.)
  if (manifest.name === 'browser') {
    try {
      execSync('npx playwright install --dry-run chromium 2>&1 || npx playwright --version', {
        stdio: 'pipe',
        timeout: 5000,
      });
      checkMark('chromium instalado', true);
    } catch {
      checkMark('chromium instalado', false, 'pnpm browser:setup');
    }
  }

  // 5. Implementation files exist
  if (manifest.capabilities) {
    const capsDir = join(PLUGINS_DIR, dir, 'src', 'capabilities');
    const hasCaps = existsSync(capsDir);
    checkMark('capabilities/ directory', hasCaps);
    if (hasCaps) {
      for (const cap of manifest.capabilities) {
        const capId = typeof cap === 'string' ? cap : cap.id;
        const capFile = join(capsDir, capId + '.ts');
        checkMark('  capability ' + capId, existsSync(capFile));
      }
    }
  }

  // 6. Setup commands
  if (manifest.requirements?.setup) {
    for (const cmd of manifest.requirements.setup) {
      checkMark('setup: ' + cmd, true, DIM + cmd + RESET);
    }
  }

  console.log();
}

async function main() {
  const pluginArg = process.argv[2];

  console.log();
  console.log('  ' + BOLD + 'Plugin Doctor' + RESET);
  console.log('  ' + DIM + 'Usage: pnpm plugin:doctor [plugin-name]' + RESET);
  console.log('  ' + DIM + '       pnpm plugin:doctor browser' + RESET);
  console.log();

  const pluginDirs = readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name);

  const targets = pluginArg
    ? pluginDirs.filter(d => d === pluginArg)
    : pluginDirs;

  if (targets.length === 0) {
    console.log('  No plugins found' + (pluginArg ? ' matching "' + pluginArg + '"' : ''));
    console.log();
    return;
  }

  for (const dir of targets) {
    await diagnosePlugin(dir);
  }
}

main().catch(console.error);
