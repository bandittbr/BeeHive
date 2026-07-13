import type { AutomationMode, BrowserConfig, BrowserType, IBrowserInstance } from './types';
import { CDPBrowser } from './CDPBrowser';
import { PlaywrightBrowser } from './PlaywrightBrowser';

/**
 * BrowserFactory — fábrica que instancia o navegador correto.
 *
 * Responsabilidade única: criar a implementação concreta de IBrowserInstance
 * com base no tipo de navegador e modo de automação.
 *
 * Permite trocar de navegador sem alterar os agentes — eles só conhecem
 * a interface IBrowserInstance.
 */
export class BrowserFactory {
  private instanceCounter = 0;

  /**
   * Cria uma nova instância de navegador.
   * @param type Tipo do navegador (chrome, chromium, obscura, firefox)
   * @param automation Modo de automação (playwright, cdp)
   * @param config Configuração adicional
   */
  create(
    type: BrowserType,
    automation: AutomationMode,
    config?: Partial<BrowserConfig>,
  ): IBrowserInstance {
    const id = `browser_${++this.instanceCounter}_${Date.now()}`;

    const fullConfig: BrowserConfig = {
      type,
      automation,
      headless: true,
      defaultTimeout: 30000,
      cdpPort: 9222,
      ...config,
    };

    switch (automation) {
      case 'playwright':
        return new PlaywrightBrowser(id, fullConfig);
      case 'cdp':
        return new CDPBrowser(id, fullConfig);
      default:
        throw new Error(`Modo de automação não suportado: ${automation}`);
    }
  }

  /**
   * Retorna o modo de automação recomendado para um tipo de navegador.
   */
  getRecommendedAutomation(type: BrowserType): AutomationMode {
    switch (type) {
      case 'chrome':
      case 'chromium':
      case 'obscura':
        return 'playwright';
      case 'firefox':
        return 'playwright';
      default:
        return 'playwright';
    }
  }
}
