/**
 * Browser Manager do BeeHive.
 *
 * Gerenciador de navegadores que permite trocar de navegador sem alterar
 * os agentes. Suporta Chrome, Chromium, Obscura e Firefox com automação
 * via Playwright ou CDP.
 */

export { BrowserManager } from './BrowserManager';
export { BrowserFactory } from './BrowserFactory';
export { PlaywrightBrowser } from './PlaywrightBrowser';
export { CDPBrowser } from './CDPBrowser';
export { BaseBrowserInstance } from './BaseBrowserInstance';
export { BaseTab } from './BaseTab';
export { BrowserProfileStore } from './BrowserProfileStore';

export type {
  AutomationMode,
  BrowserConfig,
  BrowserInstanceSnapshot,
  BrowserMetrics,
  BrowserProfile,
  BrowserProfileInputCreate,
  BrowserProfileInputUpdate,
  BrowserType,
  BrowserViewport,
  IBrowserInstance,
  IBrowserManager,
  IBrowserTab,
  InstanceState,
  LaunchOptions,
  ScreenshotOptions,
  TabState,
} from './types';
