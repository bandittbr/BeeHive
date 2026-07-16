import { chromium, type Browser, type Page } from "playwright";

export class PlaywrightAdapter {
  private browser: Browser | null = null;

  async ensureBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.launch({ headless: true });
    }
    return this.browser;
  }

  async newPage(): Promise<Page> {
    const browser = await this.ensureBrowser();
    return await browser.newPage();
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
