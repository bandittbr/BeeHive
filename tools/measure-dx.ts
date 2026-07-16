// BeeHive DX Measurement
// Uso: npx tsx tools/measure-dx.ts
//
// Mede a experiencia do desenvolvedor:
// - Tempo para criar um plugin do zero via scaffolding
// - Arquivos criados
// - Linhas geradas
// - Tempo para criar um workflow com WorkflowBuilder
// - Tempo para executar exemplo

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

function elapsed(from: number): string {
  const ms = Date.now() - from;
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(1) + 's';
}

function countLines(dir: string): number {
  let total = 0;
  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.yaml')) {
        total += fs.readFileSync(full, 'utf-8').split('\n').length;
      }
    }
  }
  walk(dir);
  return total;
}

function countFiles(dir: string): number {
  let total = 0;
  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else total++;
    }
  }
  walk(dir);
  return total;
}

async function main() {
  console.log();
  console.log('  ================================================');
  console.log('   BeeHive DX Measurement');
  console.log('  ================================================');
  console.log();

  const results: Record<string, string> = {};

  // 1. Plugin analysis (count existing plugin as baseline)
  console.log('  1. Plugin baseline (browser plugin as reference)');
  const browserPluginDir = 'plugins/browser';
  const browserFiles = countFiles(browserPluginDir);
  const browserLines = countLines(browserPluginDir);
  results['plugin.browser.files'] = browserFiles + ' files';
  results['plugin.browser.lines'] = browserLines + ' lines';
  console.log('       browser plugin: ' + results['plugin.browser.files'] + ', ' + results['plugin.browser.lines']);

  const foundationPluginDir = 'plugins/foundation';
  const foundationFiles = countFiles(foundationPluginDir);
  const foundationLines = countLines(foundationPluginDir);
  results['plugin.foundation.files'] = foundationFiles + ' files';
  results['plugin.foundation.lines'] = foundationLines + ' lines';
  console.log('       foundation plugin: ' + results['plugin.foundation.files'] + ', ' + results['plugin.foundation.lines']);

  // 2. Creating workflow with WorkflowBuilder
  console.log('  2. WorkflowBuilder: create workflow');
  const wfStart = Date.now();
  const { WorkflowBuilder } = require('../packages/sdk/src/workflow-builder');
  for (let i = 0; i < 100; i++) {
    WorkflowBuilder.create('wf-' + i, 'WF').onManual()
      .step('a', 'chat.generate', { msg: 'x' }, 'r')
      .addOutput('o', '{{r.response}}')
      .build();
  }
  results['workflowbuilder.100x'] = elapsed(wfStart);
  console.log('       100 workflows: ' + results['workflowbuilder.100x']);

  // 3. Running example
  console.log('  3. Example execution');
  const exampleStart = Date.now();
  execSync('npx tsx examples/hello-workflow/run.ts', { cwd: process.cwd(), stdio: 'pipe' });
  results['example.hello'] = elapsed(exampleStart);
  console.log('       hello-workflow: ' + results['example.hello']);

  // 4. Running all workflow tests
  console.log('  4. Workflow tests');
  const testStart = Date.now();
  execSync('npx tsx tests/workflows.test.ts', { cwd: process.cwd(), stdio: 'pipe' });
  results['test.workflows'] = elapsed(testStart);
  console.log('       pnpm test:workflows: ' + results['test.workflows']);

  // 5. Time to understand the codebase
  console.log('  5. Codebase size');
  const srcDirs = ['kernel', 'packages/sdk/src', 'packages/shared/src', 'plugins'];
  let totalLines = 0;
  let totalFiles = 0;
  for (const dir of srcDirs) {
    if (fs.existsSync(dir)) {
      totalFiles += countFiles(dir);
      totalLines += countLines(dir);
    }
  }
  results['codebase.files'] = totalFiles + ' files';
  results['codebase.lines'] = totalLines + ' lines';
  console.log('       core source: ' + totalFiles + ' files, ' + totalLines + ' lines');

  // Report
  console.log();
  console.log('  ──────────────────────────────────────────────');
  console.log('   DX Scorecard');
  console.log('  ──────────────────────────────────────────────');
  for (const [key, val] of Object.entries(results)) {
    console.log('   ' + key.padEnd(25) + ' ' + val);
  }
  console.log('  ──────────────────────────────────────────────');

  // Save
  const report = [
    '# BeeHive DX Scorecard',
    '',
    'Data: ' + new Date().toISOString().slice(0, 10),
    '',
    '| Metric | Value |',
    '|--------|-------|',
    ...Object.entries(results).map(([k, v]) => '| ' + k + ' | ' + v + ' |'),
    '',
  ].join('\n');
  fs.writeFileSync('benchmarks/DX.md', report, 'utf-8');
  console.log();
  console.log('  Report: benchmarks/DX.md');
  console.log();

  // No cleanup needed
}

main().catch(console.error);
