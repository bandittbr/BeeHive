// BeeHive Capability Health Dashboard
// Uso: npx tsx tools/health.ts
//
// Mostra o estado de todas as capabilities registradas:
//   - Plugin de origem
//   - Status (healthy / degraded / error)
//   - Latencia (se disponivel)
//   - Provider

import { Kernel } from '../kernel/Kernel';
import type { ICapability, CapabilityEntry } from '@beehive/shared';
import type { CapabilityResult, ExecutionContext } from '@beehive/sdk';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function statusTag(s: string): string {
  if (s === 'healthy') return GREEN + 'healthy' + RESET;
  if (s === 'degraded') return YELLOW + 'degraded' + RESET;
  return RED + s + RESET;
}

async function diagnose(cap: ICapability): Promise<{ status: string; latency: string; error?: string }> {
  const start = Date.now();
  try {
    const input: Record<string, unknown> = {};
    for (const inp of cap.inputs) {
      input[inp.name] = inp.type === 'number' ? 1 : inp.type === 'boolean' ? true : 'test';
    }
    const ctx: ExecutionContext = {
      correlationId: 'health-check',
      logger: { info: () => {}, warn: () => {}, error: () => {} },
      events: { publish: () => {} },
    } as any;
    const result: CapabilityResult = await cap.execute(input, ctx);
    const ms = Date.now() - start;
    return {
      status: result.success ? 'healthy' : 'degraded',
      latency: ms + 'ms',
      error: result.error,
    };
  } catch (e: any) {
    return {
      status: 'error',
      latency: (Date.now() - start) + 'ms',
      error: e.message,
    };
  }
}

async function main() {
  console.log();
  console.log('  ' + BOLD + '═══════════════════════════════════════' + RESET);
  console.log('  ' + BOLD + '  Capability Health Dashboard' + RESET);
  console.log('  ' + BOLD + '═══════════════════════════════════════' + RESET);
  console.log();

  const kernel = new Kernel();
  await kernel.boot();

  const entries: CapabilityEntry[] = kernel.capabilities.list();
  let healthy = 0;
  let degraded = 0;
  let errors = 0;

  for (const entry of entries) {
    const cap = entry.capability;
    const diag = await diagnose(cap);

    if (diag.status === 'healthy') healthy++;
    else if (diag.status === 'degraded') degraded++;
    else errors++;

    const tag = statusTag(diag.status);
    const latency = DIM + diag.latency + RESET;
    const plugin = DIM + entry.pluginId + RESET;

    console.log('  ' + CYAN + cap.id + RESET);
    console.log('    Provider: ' + plugin);
    console.log('    Status:   ' + tag + '  ' + latency);
    if (diag.error) console.log('    Error:    ' + RED + diag.error + RESET);
    console.log();
  }

  console.log('  ' + BOLD + '─────────────────────────────────────' + RESET);
  console.log('  ' + GREEN + healthy + ' healthy' + RESET + '  ' +
    (degraded > 0 ? YELLOW + degraded + ' degraded' + RESET + '  ' : '') +
    (errors > 0 ? RED + errors + ' errors' + RESET : ''));
  console.log('  ' + DIM + entries.length + ' total capabilities' + RESET);
  console.log('  ' + BOLD + '═══════════════════════════════════════' + RESET);
  console.log();

  await kernel.shutdown();
}

main().catch(console.error);
