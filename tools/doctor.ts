import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { load } from 'js-yaml';

const ROOT = process.cwd();

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

const CHECK = '\u2713' + ' ';
const CROSS = '\u2717' + ' ';
const WARN = '\u26A0' + ' ';

function print(label: string, status: 'ok' | 'warn' | 'error', detail?: string) {
  const prefix = status === 'ok' ? GREEN + CHECK : status === 'warn' ? YELLOW + WARN : RED + CROSS;
  const out = '    ' + prefix + RESET + label;
  console.log(out);
  if (detail && status !== 'ok') console.log('      ' + YELLOW + detail + RESET);
}

async function checkKernel() {
  console.log('  ' + BOLD + 'Kernel' + RESET);
  try {
    const { Kernel } = await import('../kernel/Kernel');
    const kernel = new Kernel();
    const start = Date.now();
    const report = await kernel.boot();
    const bootTime = Date.now() - start;

    print('boot ' + bootTime + 'ms', 'ok');
    print('status ' + report.kernel.status, 'ok');
    print('plugins ' + report.plugins.length + ' loaded', 'ok');
    print('capabilities ' + report.capabilities + ' registered', 'ok');
    await kernel.shutdown();
  } catch (e: any) {
    print('kernel boot failed', 'error', e.message);
  }
  console.log();
}

async function checkPlugins() {
  console.log('  ' + BOLD + 'Plugins' + RESET);

  const pluginDirs = readdirSync(join(ROOT, 'plugins'), { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name);

  for (const dir of pluginDirs) {
    const manifestPath = join(ROOT, 'plugins', dir, 'src', 'manifest.yaml');
    if (!existsSync(manifestPath)) {
      print(dir + ' (no manifest)', 'warn', 'missing manifest.yaml');
      continue;
    }

    const raw = readFileSync(manifestPath, 'utf-8');
    const manifest: any = load(raw);
    const ver = manifest.version || '?';
    const label = dir + ' v' + ver;

    if (dir === 'browser') {
      let chromiumOk = false;
      try {
        execSync('npx playwright --version', { stdio: 'pipe', timeout: 5000 });
        chromiumOk = true;
      } catch {}
      if (chromiumOk) {
        print(label, 'ok');
      } else {
        print(label, 'warn', 'Chromium ausente — pnpm browser:setup');
      }
    } else {
      print(label, 'ok');
    }
  }
  console.log();
}

async function checkProviders() {
  console.log('  ' + BOLD + 'Providers' + RESET);
  const providersDir = join(ROOT, 'providers');
  if (!existsSync(providersDir)) {
    print('no providers directory yet', 'warn');
    console.log();
    return;
  }

  const providerDirs = readdirSync(providersDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name);

  for (const dir of providerDirs) {
    print(dir, 'ok');
  }

  if (providerDirs.length === 0) {
    print('no providers registered', 'warn');
  }
  console.log();
}

function printActions() {
  console.log('  ' + BOLD + 'Suggested Actions' + RESET);

  let hasActions = false;

  const pluginDirs = readdirSync(join(ROOT, 'plugins'), { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name);

  for (const dir of pluginDirs) {
    const manifestPath = join(ROOT, 'plugins', dir, 'src', 'manifest.yaml');
    if (!existsSync(manifestPath)) continue;
    const raw = readFileSync(manifestPath, 'utf-8');
    const manifest: any = load(raw);

    if (manifest.requirements?.setup) {
      for (const cmd of manifest.requirements.setup) {
        const desc = cmd.replace(/npx /g, '').replace(/--/g, '');
        print(desc, 'warn', 'pnpm ' + desc);
        hasActions = true;
      }
    }
  }

  if (!hasActions) {
    print('all systems ready', 'ok');
  }
  console.log();
}

async function main() {
  console.log();
  console.log('  ' + BOLD + 'BeeHive System Doctor' + RESET);
  console.log('  ' + DIM + new Date().toISOString().slice(0, 19).replace('T', ' ') + RESET);
  console.log();

  await checkKernel();
  await checkPlugins();
  await checkProviders();
  printActions();
}

main().catch(console.error);
