import { BaseModule } from '../BaseModule';

/** Módulo Business (placeholder). Depende da Conversa. */
export class BusinessModule extends BaseModule {
  readonly id = 'business';
  readonly name = 'Business';
  readonly version = '0.1.0';
  readonly description = 'Criação e administração de negócios digitais.';
  readonly dependencies = ['conversation'];
}

export const businessModule = new BusinessModule();
