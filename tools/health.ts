import { Kernel } from '../kernel/Kernel';
import type { ICapability } from '@beehive/shared';
import type { CapabilityEntry } from '@beehive/shared';
import type { CapabilityResult, ExecutionContext, CapabilityReadiness } from '@beehive/sdk';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

const CHECK = '\u2713';
const CROSS = '\u2717';
const WARN = '\u26A0';

function readinessTag(r: CapabilityReadiness): string {
  if (r.status === 'ready') return GREEN + CHECK + RESET;
  if (r.status === 'degraded') return YELLOW + WARN + RESET;
  return RED + CROSS + RESET;
}

function readinessLabel(r: CapabilityReadiness): string {
  if (r.status === 'ready') return GREEN + r.status + RESET;
  if (r.status === 'degraded') return YELLOW + r.status + RESET;
  return RED + r.status + RESET;
}

async function checkReadiness(cap: ICapability): Promise<CapabilityReadiness> {
  if (typeof (cap as any).readiness === 'function') {
    try {
      return await (cap as any).readiness();
    } catch {
      return { status: 'unavailable', reason: 'health check failed' };
    }
  }
  return { status: 'ready' };
}

async function diagnose(cap: ICapability): Promise<{ readiness: CapabilityReadiness; latency: string }> {
  const start = Date.now();
  const readiness = await checkReadiness(cap);
  const latency = (Date.now() - start) + 'ms';
  return { readiness, latency };
}

async function main() {
  console.log();
  console.log('  ' + BOLD + 'Capability Health Dashboard' + RESET);
  console.log();

  const kernel = new Kernel();
  await kernel.boot();

  const entries: CapabilityEntry[] = kernel.capabilities.list();
  const counts = { ready: 0, degraded: 0, unavailable: 0 };

  for (const entry of entries) {
    const cap = entry.capability;
    const { readiness, latency } = await diagnose(cap);

    if (readiness.status === 'ready') counts.ready++;
    else if (readiness.status === 'degraded') counts.degraded++;
    else counts.unavailable++;

    const tag = readinessTag(readiness);
    const label = readinessLabel(readiness);
    const lat = DIM + latency + RESET;
    const plugin = DIM + entry.pluginId + RESET;

    console.log('  ' + tag + ' ' + CYAN + cap.id + RESET);
    console.log('    Plugin:  ' + plugin);
    console.log('    Status:  ' + label + '  ' + lat);

    if (readiness.status !== 'ready') {
      console.log('    Reason:  ' + YELLOW + readiness.reason + RESET);
      if (readiness.fix) {
        console.log('    Fix:     ' + CYAN + readiness.fix + RESET);
      }
    }
    console.log();
  }

  console.log('  ' + BOLD + '\u2500'.repeat(47) + RESET);
  const parts: string[] = [];
  if (counts.ready > 0) parts.push(GREEN + counts.ready + ' ready' + RESET);
  if (counts.degraded > 0) parts.push(YELLOW + counts.degraded + ' degraded' + RESET);
  if (counts.unavailable > 0) parts.push(RED + counts.unavailable + ' unavailable' + RESET);
  console.log('  ' + parts.join('  '));
  console.log('  ' + DIM + entries.length + ' total capabilities' + RESET);
  console.log();

  await kernel.shutdown();
}

main().catch(console.error);
