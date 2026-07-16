#!/usr/bin/env tsx
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { load } from 'js-yaml';

const ROOT = process.cwd();
const PROVIDERS_DIR = join(ROOT, 'providers');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

const CHECK = '\u2713';
const CIRCLE = '\u25CB';

function printCategory(name: string, status: 'active' | 'planned') {
  console.log();
  console.log('  ' + BOLD + name + RESET);
  console.log('  ' + DIM + '-'.repeat(30) + RESET);
}

function printProvider(name: string, ready: boolean, details?: string[]) {
  const mark = ready ? GREEN + CHECK + RESET : YELLOW + CIRCLE + RESET;
  console.log('    ' + mark + ' ' + name);
  if (details) {
    for (const d of details) {
      console.log('      ' + DIM + d + RESET);
    }
  }
}

async function main() {
  console.log();
  console.log('  ' + BOLD + 'BeeHive Providers' + RESET);
  console.log();

  // Discover provider categories
  if (!existsSync(PROVIDERS_DIR)) {
    console.log('  No providers directory found.');
    console.log();
    return;
  }

  const categories = readdirSync(PROVIDERS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name);

  for (const category of categories) {
    const categoryDir = join(PROVIDERS_DIR, category);
    const subdirs = readdirSync(categoryDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name);

    if (subdirs.length === 0) continue;

    printCategory(category.toUpperCase(), 'active');

    for (const subdir of subdirs) {
      const manifestPath = join(categoryDir, subdir, 'manifest.yaml');
      if (!existsSync(manifestPath)) {
        printProvider(subdir, false, ['no manifest']);
        continue;
      }

      const raw = readFileSync(manifestPath, 'utf-8');
      const manifest: any = load(raw);

      const details: string[] = [];

      // Check capabilities
      if (manifest.capabilities) {
        details.push('capabilities: ' + manifest.capabilities.join(', '));
      }

      // Check settings
      if (manifest.settings) {
        if (manifest.settings.default_model) {
          details.push('default model: ' + manifest.settings.default_model);
        }
        if (manifest.settings.api_key_env) {
          const envVal = process.env[manifest.settings.api_key_env];
          if (envVal) {
            details.push('API key: ' + GREEN + 'configured' + RESET);
          } else {
            details.push('API key: ' + YELLOW + 'not set (' + manifest.settings.api_key_env + ')' + RESET);
          }
        }
      }

      const hasApiKey = manifest.settings?.api_key_env && !!process.env[manifest.settings.api_key_env];
      printProvider(subdir, hasApiKey, details);
    }
  }

  console.log();
  console.log('  ' + DIM + 'Configure via beehive.config.json' + RESET);
  console.log();
}

main().catch(console.error);
