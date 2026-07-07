import { BaseModule } from '../BaseModule';

/** Módulo Configurações (placeholder). */
export class SettingsModule extends BaseModule {
  readonly id = 'settings';
  readonly name = 'Configurações';
  readonly version = '0.1.0';
  readonly description = 'Preferências, integrações e segurança.';
}

export const settingsModule = new SettingsModule();
