import { BaseTool } from '../BaseTool';
import type { ToolContext, ToolDefinition } from '../types';

export interface BrowserToolInput {
  operation: 'goto' | 'screenshot' | 'click' | 'fill' | 'getText' | 'getTitle' | 'getUrl' | 'evaluate' | 'waitForSelector' | 'goBack' | 'goForward' | 'reload' | 'solveCaptcha';
  url?: string;
  selector?: string;
  value?: string;
  script?: string;
  captchaType?: 'recaptcha' | 'hcaptcha' | 'turnstile' | 'funcaptcha' | 'image';
  captchaService?: '2captcha' | 'anticaptcha' | 'capsolver';
  captchaApiKey?: string;
  screenshotOptions?: {
    fullPage?: boolean;
    type?: 'png' | 'jpeg';
  };
}

export interface BrowserToolOutput {
  success: boolean;
  url?: string;
  title?: string;
  text?: string;
  html?: string;
  screenshot?: string;
  captchaToken?: string;
  error?: string;
}

let browserProcess: any = null;
let currentContext: any = null;
let currentPage: any = null;

async function ensureBrowser(): Promise<void> {
  if (browserProcess) return;

  const pw = await import('playwright');

  browserProcess = await pw.chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-infobars',
      '--disable-dev-shm-usage',
    ],
  });

  currentContext = await browserProcess.newContext({
    viewport: { width: 1280, height: 720 },
  });

  try {
    const stealth = await import('playwright-stealth');
    await stealth.default(currentContext);
  } catch {}
}

async function ensurePage(): Promise<any> {
  await ensureBrowser();
  if (currentPage && !currentPage.isClosed()) return currentPage;
  currentPage = await currentContext.newPage();
  return currentPage;
}

async function solveCaptchaWithService(
  type: string,
  service: string,
  apiKey: string,
  pageUrl: string,
  page: any,
): Promise<string> {
  let siteKey = '';

  switch (type) {
    case 'recaptcha': {
      siteKey = await page.evaluate(() => {
        const el = document.querySelector('[data-sitekey]');
        return el?.getAttribute('data-sitekey') ?? '';
      }) as string;
      break;
    }
    case 'hcaptcha': {
      siteKey = await page.evaluate(() => {
        const el = document.querySelector('[data-hcaptcha-widget-id]') ||
                   document.querySelector('iframe[src*="hcaptcha"]');
        return el?.getAttribute('data-sitekey') ??
               el?.getAttribute('src')?.match(/sitekey=([^&]+)/)?.[1] ?? '';
      }) as string;
      break;
    }
    case 'turnstile': {
      siteKey = await page.evaluate(() => {
        const el = document.querySelector('[data-turnstile-widget-id]') ||
                   document.querySelector('iframe[src*="turnstile"]');
        return el?.getAttribute('data-sitekey') ?? '';
      }) as string;
      break;
    }
    case 'funcaptcha': {
      siteKey = await page.evaluate(() => {
        const el = document.querySelector('iframe[src*="funcaptcha"]');
        return el?.getAttribute('src')?.match(/sitekey=([^&]+)/)?.[1] ?? '';
      }) as string;
      break;
    }
  }

  if (!siteKey) throw new Error('Não foi possível extrair siteKey do captcha');

  let apiUrl = '';
  let params: Record<string, string> = {};

  switch (service) {
    case '2captcha':
      apiUrl = 'http://2captcha.com/in.php';
      params = {
        key: apiKey,
        method: 'userrecaptcha',
        googlekey: siteKey,
        pageurl: pageUrl,
        json: '1',
      };
      break;
    case 'anticaptcha':
      apiUrl = 'https://api.anti-captcha.com/createTask';
      params = {
        clientKey: apiKey,
        taskType: type === 'recaptcha' ? 'RecaptchaV2TaskProxyless' : 'HCaptchaTaskProxyless',
      };
      break;
    case 'capsolver':
      apiUrl = 'https://api.capsolver.com/createTask';
      params = {
        token: apiKey,
        taskType: 'ReCaptchaV2EnterpriseTaskProxyLess',
      };
      break;
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await response.json();

  if (data.errorId && data.errorId !== 0) {
    throw new Error(`Captcha service error: ${data.errorDescription ?? JSON.stringify(data)}`);
  }

  const taskId = data.taskId ?? data.request;
  if (!taskId) throw new Error('Não recebeu taskId do serviço de captcha');

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));

    const pollResponse = await fetch(
      service === '2captcha'
        ? `http://2captcha.com/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`
        : service === 'anticaptcha'
          ? 'https://api.anti-captcha.com/getTaskResult'
          : 'https://api.capsolver.com/getTaskResult',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: service === '2captcha' ? undefined : JSON.stringify({ clientKey: apiKey, taskId }),
      },
    );

    const pollData = await pollResponse.json();
    const status = pollData.status ?? pollData.solution?.status;
    const token = pollData.request ?? pollData.solution?.gRecaptchaResponse ?? pollData.solution?.token;

    if (status === 'ready' || status === 2 || token) {
      return token;
    }
  }

  throw new Error('Timeout aguardando resolução do captcha');
}

export class BrowserTool extends BaseTool {
  readonly id = 'browser';
  readonly name = 'Browser';
  readonly version = '1.0.0';
  readonly description = 'Navegador web com stealth, resolução de captchas e automação completa.';
  readonly category = 'browser' as const;
  readonly capabilities = ['web', 'stealth', 'captcha', 'scraping', 'automation'];

  readonly definition: ToolDefinition = {
    id: this.id,
    name: this.name,
    description: this.description,
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['goto', 'screenshot', 'click', 'fill', 'getText', 'getTitle', 'getUrl', 'evaluate', 'waitForSelector', 'goBack', 'goForward', 'reload', 'solveCaptcha'],
          description: 'Operação do navegador',
        },
        url: {
          type: 'string',
          description: 'URL para navegar (obrigatório para goto)',
        },
        selector: {
          type: 'string',
          description: 'Seletor CSS para click/fill/waitForSelector',
        },
        value: {
          type: 'string',
          description: 'Valor para fill',
        },
        script: {
          type: 'string',
          description: 'Código JS para evaluate',
        },
        captchaType: {
          type: 'string',
          enum: ['recaptcha', 'hcaptcha', 'turnstile', 'funcaptcha', 'image'],
          description: 'Tipo de captcha',
        },
        captchaService: {
          type: 'string',
          enum: ['2captcha', 'anticaptcha', 'capsolver'],
          description: 'Serviço de resolução de captcha',
        },
        captchaApiKey: {
          type: 'string',
          description: 'API key do serviço de captcha',
        },
        screenshotOptions: {
          type: 'object',
          description: 'Opções de screenshot (fullPage, type)',
        },
      },
      required: ['operation'],
    },
  };

  async execute(input: unknown, context: ToolContext): Promise<BrowserToolOutput> {
    const req = input as BrowserToolInput;
    context.logger.info(`Browser: ${req.operation}`);

    try {
      switch (req.operation) {
        case 'goto': {
          if (!req.url) return { success: false, error: 'URL obrigatória' };
          const page = await ensurePage();
          await page.goto(req.url, { waitUntil: 'networkidle', timeout: 30000 });
          return {
            success: true,
            url: page.url(),
            title: await page.title(),
          };
        }

        case 'screenshot': {
          const page = await ensurePage();
          const buf = await page.screenshot({
            fullPage: req.screenshotOptions?.fullPage,
            type: req.screenshotOptions?.type ?? 'png',
          });
          return {
            success: true,
            screenshot: buf.toString('base64'),
          };
        }

        case 'click': {
          if (!req.selector) return { success: false, error: 'Seletor obrigatório' };
          const page = await ensurePage();
          await page.click(req.selector);
          return { success: true };
        }

        case 'fill': {
          if (!req.selector || !req.value) return { success: false, error: 'Seletor e valor obrigatórios' };
          const page = await ensurePage();
          await page.fill(req.selector, req.value);
          return { success: true };
        }

        case 'getText': {
          const page = await ensurePage();
          const text = await page.evaluate(() => document.body.innerText);
          return { success: true, text };
        }

        case 'getTitle': {
          const page = await ensurePage();
          const title = await page.title();
          return { success: true, title };
        }

        case 'getUrl': {
          const page = await ensurePage();
          const url = page.url();
          return { success: true, url };
        }

        case 'evaluate': {
          if (!req.script) return { success: false, error: 'Script obrigatório' };
          const page = await ensurePage();
          const result = await page.evaluate(new Function(`return ${req.script}`)());
          return { success: true, text: JSON.stringify(result) };
        }

        case 'waitForSelector': {
          if (!req.selector) return { success: false, error: 'Seletor obrigatório' };
          const page = await ensurePage();
          await page.waitForSelector(req.selector, { timeout: 30000 });
          return { success: true };
        }

        case 'goBack': {
          const page = await ensurePage();
          await page.goBack();
          return { success: true, url: page.url() };
        }

        case 'goForward': {
          const page = await ensurePage();
          await page.goForward();
          return { success: true, url: page.url() };
        }

        case 'reload': {
          const page = await ensurePage();
          await page.reload();
          return { success: true, url: page.url() };
        }

        case 'solveCaptcha': {
          if (!req.captchaType || !req.captchaService || !req.captchaApiKey) {
            return { success: false, error: 'captchaType, captchaService e captchaApiKey obrigatórios' };
          }

          const page = await ensurePage();
          const token = await solveCaptchaWithService(
            req.captchaType,
            req.captchaService,
            req.captchaApiKey,
            page.url(),
            page,
          );

          return { success: true, captchaToken: token };
        }

        default:
          return { success: false, error: `Operação desconhecida: ${req.operation}` };
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
      };
    }
  }
}

export function createBrowserTool(): BrowserTool {
  return new BrowserTool();
}
