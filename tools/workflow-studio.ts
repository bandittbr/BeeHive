import { Kernel } from '../kernel/Kernel';
import { WorkflowBuilder } from '@beehive/sdk';
import * as readline from 'node:readline';
import { EventEmitter } from 'node:events';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let kernel: Kernel;
let rl: readline.Interface;
let eventsMode = false;
const stepTimers = new Map<string, number>();

function elapsed(from: number): string {
  const ms = Date.now() - from;
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(1) + 's';
}

function pad(s: string, n: number): string {
  return s + ' '.repeat(Math.max(0, n - s.length));
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString().slice(11, 23);
}

function showHelp(): void {
  console.log();
  console.log(`  ${BOLD}Commands:${RESET}`);
  console.log(`    ${CYAN}list${RESET}               List registered workflow definitions`);
  console.log(`    ${CYAN}run <id>${RESET}           Execute a workflow with real-time output`);
  console.log(`    ${CYAN}inspect <id>${RESET}       Show workflow definition details`);
  console.log(`    ${CYAN}instances${RESET}          List all workflow instances`);
  console.log(`    ${CYAN}events${RESET}              Toggle live event stream`);
  console.log(`    ${CYAN}help${RESET}                Show this help`);
  console.log(`    ${CYAN}exit${RESET}                Quit the studio`);
  console.log();
}

function showBanner(): void {
  console.log();
  console.log(`  ${BOLD}═══════════════════════════════════════${RESET}`);
  console.log(`  ${BOLD}  BeeHive Workflow Studio              ${RESET}`);
  console.log(`  ${BOLD}═══════════════════════════════════════${RESET}`);
  console.log();
}

function subscribeEvents(): void {
  kernel.events.subscribe('*', (event: any) => {
    if (!eventsMode) return;
    const ts = formatTimestamp(event.timestamp);
    const type = pad(event.type ?? '?', 30);
    const payload = JSON.stringify(event.payload ?? {}).slice(0, 100);
    console.log(`  ${DIM}[${ts}]${RESET} ${CYAN}${type}${RESET} ${DIM}${payload}${RESET}`);
  });
}

async function listWorkflows(): Promise<void> {
  const defs = kernel.workflows.listDefinitions();
  if (defs.length === 0) {
    console.log(`  ${YELLOW}(nenhum workflow registrado)${RESET}`);
    return;
  }
  console.log();
  console.log(`  ${BOLD}Registered Workflows:${RESET}`);
  console.log();
  for (const def of defs) {
    const stepTypes = def.steps.map(s => {
      if (s.type === 'capability') return (s as any).capability;
      return s.type;
    }).join(` ${YELLOW}→${RESET} `);
    console.log(`    ${CYAN}${def.id}${RESET}  ${DIM}${stepTypes}${RESET}`);
    if (def.description) console.log(`    ${' '.repeat(def.id.length + 2)}${DIM}${def.description}${RESET}`);
  }
  console.log(`  ${DIM}Total: ${defs.length} workflows${RESET}`);
}

async function runWorkflow(workflowId: string, input: Record<string, unknown>): Promise<void> {
  const def = kernel.workflows.listDefinitions().find(d => d.id === workflowId);
  if (!def) {
    console.log(`  ${RED}Workflow "${workflowId}" nao encontrado. Use 'list' para ver os disponiveis.${RESET}`);
    return;
  }

  console.log();
  console.log(`  ${BOLD}[EXECUTANDO]${RESET} ${CYAN}${def.name}${RESET} (${def.id})`);
  console.log();

  const steps = new Map<string, { type: string; status: string; result?: string; duration?: string }>();
  for (const s of def.steps) steps.set(s.id, { type: s.type === 'capability' ? (s as any).capability : s.type, status: 'waiting' });

  const sub = kernel.events.subscribe('*', (event: any) => {
    if (event.type === 'workflow:step:started') {
      const sid = event.payload.stepId;
      if (steps.has(sid)) {
        steps.set(sid, { ...steps.get(sid)!, status: 'running' });
        stepTimers.set(sid, Date.now());
        redrawSteps(steps);
      }
    }
    if (event.type === 'workflow:step:completed') {
      const sid = event.payload.stepId;
      if (steps.has(sid)) {
        const s = steps.get(sid)!;
        s.status = 'done';
        s.duration = stepTimers.has(sid) ? elapsed(stepTimers.get(sid)!) : '';
        steps.set(sid, s);
        redrawSteps(steps);
      }
    }
    if (event.type === 'workflow:completed') {
      redrawSteps(steps);
      const p = event.payload;
      console.log();
      if (p.status === 'completed') {
        console.log(`  ${GREEN}✓ Workflow ${p.status}${RESET} (${elapsed(Date.now() - (stepTimers.get('_start') || Date.now()))})`);
      } else {
        console.log(`  ${RED}✗ Workflow ${p.status}${RESET}`);
      }
    }
  });

  try {
    stepTimers.set('_start', Date.now());
    const instance = await kernel.workflows.start(workflowId, input);
    console.log();
    console.log(`  ${DIM}Instance: ${instance.id}${RESET}`);
    if (instance.stepResults) {
      for (const [key, val] of Object.entries(instance.stepResults)) {
        const preview = JSON.stringify(val).slice(0, 120);
        console.log(`  ${GREEN}Artifact:${RESET} ${CYAN}${key}${RESET} ${DIM}${preview}${RESET}`);
      }
    }
  } catch (e: any) {
    console.log(`  ${RED}${e.message}${RESET}`);
  } finally {
    kernel.events.unsubscribe(sub);
    stepTimers.delete('_start');
    console.log();
  }
}

function redrawSteps(steps: Map<string, { type: string; status: string; result?: string; duration?: string }>): void {
  const entries = Array.from(steps.entries());
  for (let i = 0; i < entries.length; i++) {
    const [id, step] = entries[i];
    const prefix = i === entries.length - 1 ? '  └─ ' : '  ├─ ';
    const icon = step.status === 'done' ? `${GREEN}✓${RESET}` :
                 step.status === 'running' ? `${YELLOW}●${RESET}` : `${DIM}○${RESET}`;
    const dur = step.duration ? ` ${DIM}(${step.duration})${RESET}` : '';
    console.log(`  ${prefix} ${icon} ${CYAN}${id}${RESET} ${DIM}[${step.type}]${RESET}${dur}`);
  }
}

async function inspectWorkflow(id: string): Promise<void> {
  const def = kernel.workflows.listDefinitions().find(d => d.id === id);
  if (!def) {
    console.log(`  ${RED}Workflow "${id}" nao encontrado.${RESET}`);
    return;
  }
  console.log();
  console.log(`  ${BOLD}ID:${RESET}          ${def.id}`);
  console.log(`  ${BOLD}Name:${RESET}        ${def.name}`);
  console.log(`  ${BOLD}Version:${RESET}     ${def.version}`);
  if (def.description) console.log(`  ${BOLD}Description:${RESET} ${def.description}`);
  console.log(`  ${BOLD}Triggers:${RESET}    ${def.triggers.map(t => t.type).join(', ')}`);
  if (def.timeout) console.log(`  ${BOLD}Timeout:${RESET}     ${def.timeout}s`);
  console.log();
  console.log(`  ${BOLD}Steps:${RESET}`);
  for (const s of def.steps) {
    if (s.type === 'capability') {
      const cap = s as any;
      console.log(`    ${CYAN}${s.id}${RESET}  ${cap.capability}  ${JSON.stringify(cap.input)}`);
      if (cap.output) console.log(`          ${DIM}→ ${cap.output}${RESET}`);
    } else if (s.type === 'condition') {
      const c = s as any;
      console.log(`    ${YELLOW}${s.id}${RESET}  if ${c.if}  (${c.then.length} then, ${c.else?.length ?? 0} else)`);
    } else if (s.type === 'foreach') {
      const f = s as any;
      console.log(`    ${YELLOW}${s.id}${RESET}  foreach ${f.items}  (${f.steps.length} steps)`);
    } else if (s.type === 'parallel') {
      const p = s as any;
      console.log(`    ${YELLOW}${s.id}${RESET}  parallel  (${p.parallel.length} branches)`);
    }
  }
  if (def.outputs) {
    console.log();
    console.log(`  ${BOLD}Outputs:${RESET}`);
    for (const [k, v] of Object.entries(def.outputs)) {
      console.log(`    ${CYAN}${k}${RESET}  ${DIM}${v}${RESET}`);
    }
  }
  console.log();
}

function listInstances(): void {
  const instances = kernel.workflows.list();
  if (instances.length === 0) {
    console.log(`  ${YELLOW}(nenhuma instancia)${RESET}`);
    return;
  }
  console.log();
  console.log(`  ${BOLD}Instances:${RESET}`);
  console.log();
  for (const inst of instances) {
    const dur = inst.completedAt ? elapsed(inst.completedAt - inst.startedAt) : 'running';
    const statusColor = inst.status === 'completed' ? GREEN : inst.status === 'failed' ? RED : YELLOW;
    console.log(`  ${CYAN}${inst.id}${RESET}  ${statusColor}${inst.status}${RESET}  ${DIM}${dur}${RESET}  ${inst.workflowId}`);
  }
  console.log(`  ${DIM}Total: ${instances.length} instancias${RESET}`);
  console.log();
}

function registerDemoWorkflows(): void {
  const summarize = WorkflowBuilder.create('summarize', 'Summarize')
    .describe('Navega, extrai e resume uma URL')
    .onManual()
    .step('scrape', 'browser.scrape', { url: '{{input.url}}' }, 'page')
    .step('chat', 'chat.generate', { message: 'Resuma em portugues: {{page.markdown}}' }, 'summary')
    .addOutput('result', '{{summary.response}}')
    .build();

  const hello = WorkflowBuilder.create('hello', 'Hello')
    .describe('Exemplo simples: gera uma saudacao')
    .onManual()
    .step('greet', 'chat.generate', { message: 'Diga ola para {{input.name}}' }, 'response')
    .addOutput('result', '{{response.response}}')
    .build();

  kernel.workflows.register(summarize as any);
  kernel.workflows.register(hello as any);
}

async function main(): Promise<void> {
  kernel = new Kernel();
  await kernel.boot();
  registerDemoWorkflows();
  subscribeEvents();

  showBanner();
  showHelp();

  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `  ${CYAN}>${RESET} `,
  });

  rl.prompt();

  rl.on('line', async (line: string) => {
    const trimmed = line.trim();
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    const arg = parts.slice(1).join(' ');

    switch (cmd) {
      case 'list':
        await listWorkflows();
        break;
      case 'run':
        if (!arg) {
          console.log(`  ${YELLOW}Uso: run <workflow-id> [--input key=val ...]${RESET}`);
          break;
        }
        const [id, ...inputArgs] = arg.split(' ');
        const input: Record<string, string> = {};
        for (const ia of inputArgs) {
          if (ia.startsWith('--input=')) {
            const kv = ia.slice(8).split('=', 2);
            if (kv.length === 2) input[kv[0]] = kv[1];
          } else if (ia.startsWith('--')) {
            const eqIdx = ia.indexOf('=');
            if (eqIdx > 0) {
              const k = ia.slice(2, eqIdx);
              const v = ia.slice(eqIdx + 1);
              input[k] = v;
            }
          }
        }
        if (id === 'summarize' && !input.url) input.url = 'https://example.com';
        if (id === 'hello' && !input.name) input.name = 'Mundo';
        await runWorkflow(id, input);
        break;
      case 'inspect':
        if (!arg) {
          console.log(`  ${YELLOW}Uso: inspect <workflow-id>${RESET}`);
          break;
        }
        await inspectWorkflow(arg);
        break;
      case 'instances':
        listInstances();
        break;
      case 'events':
        eventsMode = !eventsMode;
        console.log(`  ${eventsMode ? GREEN + 'Event stream ON' : YELLOW + 'Event stream OFF'}${RESET}`);
        break;
      case 'help':
        showHelp();
        break;
      case 'exit':
      case 'quit':
        console.log();
        await kernel.shutdown();
        rl.close();
        process.exit(0);
      default:
        if (trimmed) console.log(`  ${YELLOW}Comando desconhecido: ${trimmed}. Digite 'help'.${RESET}`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log(`\n  ${DIM}Ate logo!${RESET}\n`);
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
