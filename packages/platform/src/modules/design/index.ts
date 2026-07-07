import { BaseModule } from '../BaseModule';

/** Módulo Design (placeholder). */
export class DesignModule extends BaseModule {
  readonly id = 'design';
  readonly name = 'Design';
  readonly version = '0.1.0';
  readonly description = 'Identidade visual, marca e peças gráficas.';
}

export const designModule = new DesignModule();
