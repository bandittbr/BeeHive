import { BaseModule } from '../BaseModule';

/** Módulo Desenvolvimento (placeholder). */
export class DevelopmentModule extends BaseModule {
  readonly id = 'development';
  readonly name = 'Desenvolvimento';
  readonly version = '0.1.0';
  readonly description = 'Criação de projetos, de um arquivo a um sistema.';
}

export const developmentModule = new DevelopmentModule();
