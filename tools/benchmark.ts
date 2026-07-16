// BeeHive Benchmark
// Uso: npx tsx tools/benchmark.ts
//
// Mede metricas chave do kernel, runtime e plugins.
// Resultados em benchmarks/RESULTS.md

import { Kernel } from '../kernel/Kernel';
import { WorkflowBuilder, MockAdapter } from '@beehive/sdk';
import * as fs from 'node:fs';
import * as path from 'node:path';

function elapsed(from: number): string {
  const ms = Date.now() - from;
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(2) + 's';
}

function measure(label: string, fn: () => Promise<void> | void, iterations = 1): number[] {
  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    fn();
    const end = Date.now();
    samples.push(end - start);
  }
  return samples;
}

function avg(samples: number[]): number {
  return samples.reduce((a, b) => a + b, 0) / samples.length;
}

function min(samples: number[]): number {
  return Math.min(...samples);
}

function median(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function main() {
  console.log();
  console.log('  ================================================');
  console.log('   BeeHive Benchmark');
  console.log('  ================================================');
  console.log('   Data: ' + new Date().toISOString().slice(0, 10));
  console.log('   Platform: ' + process.platform + ' ' + process.arch);
  console.log('   Node: ' + process.version);
  console.log('  ================================================');
  console.log();

  const results: Record<string, { min: string; avg: string; median: string; samples: number; unit: string }> = {};
  const ITERATIONS = 5;

  // 1. Boot time (cold start)
  console.log('  1. Kernel Boot (cold start, ' + ITERATIONS + 'x)');
  const bootSamples: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const kernel = new Kernel();
    const start = Date.now();
    await kernel.boot();
    bootSamples.push(Date.now() - start);
    await kernel.shutdown();
  }
  results['kernel.boot'] = {
    min: min(bootSamples) + 'ms', avg: avg(bootSamples).toFixed(0) + 'ms',
    median: median(bootSamples) + 'ms', samples: ITERATIONS, unit: 'ms',
  };
  console.log('       min: ' + results['kernel.boot'].min + '  avg: ' + results['kernel.boot'].avg + '  median: ' + results['kernel.boot'].median);

  // 2. Plugin discovery
  console.log('  2. Plugin Discovery (' + ITERATIONS + 'x)');
  for (let i = 0; i < ITERATIONS; i++) {
    const kernel = new Kernel();
    await kernel.boot();
    const count = kernel.plugins.list().length;
    if (i === 0) console.log('       plugins found: ' + count);
    await kernel.shutdown();
  }

  // 3. Workflow Runtime — simple
  console.log('  3. Workflow Runtime — simple (chat.generate, ' + ITERATIONS + 'x)');
  const simpleSamples: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const kernel = new Kernel();
    await kernel.boot();
    const mocks = MockAdapter.for(kernel);
    mocks.mock('chat.generate');
    const wf = WorkflowBuilder.create('bench', 'Bench')
      .onManual().step('s', 'chat.generate', { message: 'hello' }, 'r').build();
    kernel.workflows.register(wf as any);
    const start = Date.now();
    await kernel.workflows.start('bench', {});
    simpleSamples.push(Date.now() - start);
    await kernel.shutdown();
  }
  results['workflow.simple'] = {
    min: min(simpleSamples) + 'ms', avg: avg(simpleSamples).toFixed(0) + 'ms',
    median: median(simpleSamples) + 'ms', samples: ITERATIONS, unit: 'ms',
  };
  console.log('       min: ' + results['workflow.simple'].min + '  avg: ' + results['workflow.simple'].avg + '  median: ' + results['workflow.simple'].median);

  // 4. Workflow Runtime — 3 steps
  console.log('  4. Workflow Runtime — 3 steps (' + ITERATIONS + 'x)');
  const multiSamples: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const kernel = new Kernel();
    await kernel.boot();
    const mocks = MockAdapter.for(kernel);
    mocks.mockAll();
    const wf = WorkflowBuilder.create('bench3', 'Bench3')
      .onManual()
      .step('a', 'browser.scrape', { url: 'x' }, 'p')
      .step('b', 'chat.generate', { message: '{{p.markdown}}' }, 's')
      .step('c', 'chat.generate', { message: '{{s.response}}' }, 't')
      .build();
    kernel.workflows.register(wf as any);
    const start = Date.now();
    await kernel.workflows.start('bench3', { url: 'https://example.com' });
    multiSamples.push(Date.now() - start);
    await kernel.shutdown();
  }
  results['workflow.3steps'] = {
    min: min(multiSamples) + 'ms', avg: avg(multiSamples).toFixed(0) + 'ms',
    median: median(multiSamples) + 'ms', samples: ITERATIONS, unit: 'ms',
  };
  console.log('       min: ' + results['workflow.3steps'].min + '  avg: ' + results['workflow.3steps'].avg + '  median: + ' + results['workflow.3steps'].median);

  // 5. Capability resolution
  console.log('  5. Capability Resolution (' + ITERATIONS + 'x)');
  const caps = ['chat.generate', 'browser.scrape', 'memory.search', 'tool.execute', 'browser.navigate'];
  for (const capId of caps) {
    const kernel = new Kernel();
    await kernel.boot();
    const resolveSamples: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      kernel.capabilities.resolve(capId);
      resolveSamples.push(Date.now() - start);
    }
    const capAvg = avg(resolveSamples);
    console.log('       ' + capId + ': ' + capAvg.toFixed(3) + 'ms avg (' + resolveSamples.length + ' samples)');
    await kernel.shutdown();
  }

  // 6. Total capabilities registered
  const k = new Kernel();
  await k.boot();
  const totalCaps = k.capabilities.list().length;
  results['capabilities.total'] = {
    min: totalCaps + '', avg: totalCaps + '', median: totalCaps + ' caps', samples: 1, unit: 'caps',
  };
  console.log('  6. Capabilities registered: ' + totalCaps);
  await k.shutdown();

  // 7. Memory usage
  console.log('  7. Memory (after full boot)');
  const mem = process.memoryUsage();
  results['memory.heapUsed'] = {
    min: (mem.heapUsed / 1024 / 1024).toFixed(1) + 'MB', avg: '', median: '', samples: 1, unit: 'MB',
  };
  results['memory.rss'] = {
    min: (mem.rss / 1024 / 1024).toFixed(1) + 'MB', avg: '', median: '', samples: 1, unit: 'MB',
  };
  console.log('       heapUsed: ' + results['memory.heapUsed'].min);
  console.log('       rss: ' + results['memory.rss'].min);

  // Write report
  const report = [
    '# BeeHive Benchmark Results',
    '',
    'Data: ' + new Date().toISOString().slice(0, 10),
    'Platform: ' + process.platform + ' ' + process.arch,
    'Node: ' + process.version,
    '',
    '| Metric | Value | Samples |',
    '|--------|-------|---------|',
    ...Object.entries(results).map(([key, val]) =>
      '| ' + key + ' | ' + val.min + ' (avg: ' + val.avg + ', median: ' + val.median + ') | ' + val.samples + ' |'
    ),
    '',
    '## Capabilities Registered',
    '',
    '| ID | Resolution |',
    '|---|-----------|',
  ].join('\n');

  fs.mkdirSync('benchmarks', { recursive: true });
  fs.writeFileSync('benchmarks/RESULTS.md', report, 'utf-8');

  console.log();
  console.log('  Report: benchmarks/RESULTS.md');
  console.log();
  console.log('  ================================================');
  console.log('   Benchmark concluido');
  console.log('  ================================================');
  console.log();
}

main().catch(console.error);
