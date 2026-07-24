// Bridge entre o worker Express e o Kernel BeeHive.
// Boota o kernel, descobre plugins, e expõe capabilities via REST.
import { Kernel } from '../../../kernel/Kernel.js';
import type { PluginContext } from '../../../packages/sdk/src/context.js';
import type { ICapability, CapabilityEntry } from '@beehive/shared';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');

let kernel: Kernel | null = null;
let booted = false;

export async function bootKernel(): Promise<Kernel> {
  if (booted && kernel) return kernel;

  // PluginRegistry descobre plugins em process.cwd() + '/plugins'
  // Precisamos garantir que cwd seja a raiz do workspace
  const prevCwd = process.cwd();
  process.chdir(WORKSPACE_ROOT);

  kernel = new Kernel();
  const report = await kernel.boot();

  // Restaura cwd original
  process.chdir(prevCwd);

  booted = true;
  console.log(`[kernel-bridge] booted · ${report.plugins.length} plugins · ${report.capabilities} capabilities`);
  for (const p of report.plugins) {
    console.log(`  plugin ${p.id}: ${p.status}${p.error ? ' (' + p.error + ')' : ''}`);
  }
  return kernel;
}

export function getKernel(): Kernel {
  if (!kernel) throw new Error('Kernel not booted yet');
  return kernel;
}

export async function executeCapability(
  capabilityId: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const k = getKernel();
  const cap = k.capabilities.resolve(capabilityId) as ICapability;
  const ctx = k.createPluginContext('api-bridge');
  const result = await cap.execute(input, ctx as unknown as PluginContext);
  return result;
}

export function listCapabilities(): CapabilityEntry[] {
  const k = getKernel();
  return k.capabilities.list();
}