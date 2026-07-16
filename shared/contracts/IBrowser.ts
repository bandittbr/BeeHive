export interface IBrowser {
  readonly id: string;
  readonly name: string;

  newPage(url?: string): Promise<IBrowserPage>;
  close(): Promise<void>;
  screenshot(options?: ScreenshotOptions): Promise<string>;
  healthCheck(): Promise<boolean>;
}

export interface IBrowserPage {
  url: string;
  goto(url: string): Promise<void>;
  click(selector: string): Promise<void>;
  type(selector: string, text: string): Promise<void>;
  evaluate<T>(fn: string): Promise<T>;
  screenshot(options?: ScreenshotOptions): Promise<string>;
  pdf(options?: PDFOptions): Promise<Buffer>;
  close(): Promise<void>;
}

export interface ScreenshotOptions {
  fullPage?: boolean;
  type?: 'png' | 'jpeg';
  quality?: number;
}

export interface PDFOptions {
  format?: 'A4' | 'Letter';
  landscape?: boolean;
  printBackground?: boolean;
}
