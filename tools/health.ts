import { Kernel } from '../kernel/Kernel';
import type { CapabilityEntry } from '@beehive/shared';
import type { ICapability } from '@beehive/shared';
import type { CapabilityReadiness, CapabilityHealth } from '@beehive/sdk';

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

function tagR(r: CapabilityReadiness): string {
  if (r.status === 'ready') return GREEN + CHECK + ' ready' + RESET;
  if (r.status === 'degraded') return YELLOW + WARN + ' degraded' + RESET;
  return RED + CROSS + ' unavailable' + RESET;
}

function tagH(h: CapabilityHealth): string {
  if (h.status === 'healthy') return GREEN + 'healthy' + RESET;
  if (h.status === 'degraded') return YELLOW + 'degraded' + RESET;
  return RED + 'error' + RESET;
}

async function getReadiness(cap: ICapability): Promise<CapabilityReadiness> {
  if (typeof (cap as any).readiness === 'function') {
    try { return await (cap as any).readiness(); } catch { return { status: 'unavailable', reason: 'readiness check failed' }; }
  }
  return { status: 'ready' };
}

async function getHealth(cap: ICapability): Promise<CapabilityHealth> {
  if (typeof (cap as any).health === 'function') {
    try { return await (cap as any).health(); } catch { return { status: 'error', latency: 0, reason: 'health check failed' }; }
  }
  return { status: 'healthy', latency: 0 };
}

async function main() {
  console.log();
  console.log('  ' + BOLD + 'Capability Health Dashboard' + RESET);
  console.log();

  const kernel = new Kernel();
  await kernel.boot();

  const entries: CapabilityEntry[] = kernel.capabilities.list();
  const rCount = { ready: 0, degraded: 0, unavailable: 0 };
  const hCount = { healthy: 0, degraded: 0, error: 0 };

  for (const entry of entries) {
    const cap = entry.capability;
    const readiness = await getReadiness(cap);
    const health = await getHealth(cap);

    if (readiness.status === 'ready') rCount.ready++;
    else if (readiness.status === 'degraded') rCount.degraded++;
    else rCount.unavailable++;

    if (health.status === 'healthy') hCount.healthy++;
    else if (health.status === 'degraded') hCount.degraded++;
    else hCount.error++;

    const pluginStr = DIM + entry.pluginId + RESET;

    console.log('  ' + CYAN + cap.id + RESET + '  ' + pluginStr + '  ' + DIM + health.latency + 'ms' + RESET);
    console.log('    Readiness: ' + tagR(readiness));
    console.log('    Health:    ' + tagH(health));
    if (readiness.status !== 'ready') {
      console.log('    Reason:    ' + YELLOW + readiness.reason + RESET);
      if (readiness.fix) console.log('    Fix:       ' + CYAN + readiness.fix + RESET);
    }
    if (health.status !== 'healthy' && health.reason) {
      console.log('    Error:     ' + RED + health.reason + RESET);
      if (health.fix) console.log('    Fix:       ' + CYAN + health.fix + RESET);
    }
    console.log();
  }

  console.log('  ' + BOLD + '\u2500'.repeat(47) + RESET);
  const rParts: string[] = [];
  if (rCount.ready > 0) rParts.push(GREEN + rCount.ready + ' ready' + RESET);
  if (rCount.degraded > 0) rParts.push(YELLOW + rCount.degraded + ' degraded' + RESET);
  if (rCount.unavailable > 0) rParts.push(RED + rCount.unavailable + ' unavailable' + RESET);
  console.log('  Readiness: ' + rParts.join('  '));
  const hParts: string[] = [];
  if (hCount.healthy > 0) hParts.push(GREEN + hCount.healthy + ' healthy' + RESET);
  if (hCount.degraded > 0) hParts.push(YELLOW + hCount.degraded + ' degraded' + RESET);
  if (hCount.error > 0) hParts.push(RED + hCount.error + ' error' + RESET);
  console.log('  Health:    ' + hParts.join('  '));
  console.log('  ' + DIM + entries.length + ' total capabilities' + RESET);
  console.log();

  await kernel.shutdown();
}

main().catch(console.error);
