import type { IBrowserTab, ScreenshotOptions, TabState } from './types';

/**
 * BaseTab — implementação base de uma aba do navegador.
 *
 * Fornece a estrutura comum (id, url, title, state) e métodos que
 * as implementações concretas (Playwright, CDP) devem sobrescrever.
 */
export abstract class BaseTab implements IBrowserTab {
  readonly id: string;
  abstract url: string;
  abstract title: string;
  abstract state: TabState;

  constructor(id: string) {
    this.id = id;
  }

  abstract navigate(url: string): Promise<void>;
  abstract reload(): Promise<void>;
  abstract goBack(): Promise<void>;
  abstract goForward(): Promise<void>;
  abstract close(): Promise<void>;

  abstract getContent(): Promise<string>;
  abstract getText(): Promise<string>;
  abstract getTitle(): Promise<string>;
  abstract getUrl(): Promise<string>;

  abstract screenshot(options?: ScreenshotOptions): Promise<Buffer>;
  abstract evaluate<T = unknown>(script: string): Promise<T>;
  abstract waitForSelector(selector: string, timeout?: number): Promise<void>;
  abstract click(selector: string): Promise<void>;
  abstract fill(selector: string, value: string): Promise<void>;
  abstract getTextContent(selector: string): Promise<string>;
}
