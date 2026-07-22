// Executor de navegador (Playwright, dependência opcional).
// Suporta ações básicas: navegar, extrair texto/HTML, screenshot, preencher e clicar.
// Se o Playwright não estiver instalado, retorna erro claro (não derruba o worker).
import { resolveInWorkspace } from '../workspace.js';
import type { JobRequest } from '../types.js';

interface BrowserStep {
  action: 'goto' | 'text' | 'html' | 'screenshot' | 'fill' | 'click' | 'wait';
  url?: string;
  selector?: string;
  value?: string;
  path?: string;
  ms?: number;
}

export async function runBrowser(
  req: JobRequest,
  onChunk: (kind: 'stdout' | 'stderr', data: string) => void,
): Promise<{ result: unknown }> {
  let chromium: any;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('browser: Playwright não instalado neste worker. Instale com "npx playwright install --with-deps chromium".');
  }

  const steps: BrowserStep[] = Array.isArray(req.payload.steps) ? (req.payload.steps as BrowserStep[]) : [];
  if (steps.length === 0) throw new Error('browser: payload.steps vazio');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const outputs: Record<string, unknown> = {};

  try {
    for (const step of steps) {
      onChunk('stdout', `→ ${step.action}${step.url ? ' ' + step.url : ''}${step.selector ? ' ' + step.selector : ''}\n`);
      switch (step.action) {
        case 'goto':
          await page.goto(String(step.url), { waitUntil: 'domcontentloaded', timeout: 45000 });
          break;
        case 'wait':
          await page.waitForTimeout(Number(step.ms ?? 1000));
          break;
        case 'fill':
          await page.fill(String(step.selector), String(step.value ?? ''));
          break;
        case 'click':
          await page.click(String(step.selector));
          break;
        case 'text':
          outputs.text = step.selector
            ? await page.textContent(String(step.selector))
            : await page.evaluate('document.body.innerText');
          break;
        case 'html':
          outputs.html = await page.content();
          break;
        case 'screenshot': {
          const rel = step.path ?? 'screenshot.png';
          const abs = resolveInWorkspace(rel);
          await page.screenshot({ path: abs, fullPage: true });
          outputs.screenshot = rel;
          break;
        }
      }
    }
    return { result: outputs };
  } finally {
    await browser.close();
  }
}
