import { BaseModule } from '../BaseModule';

/** Módulo Jurídico (placeholder). Não depende de ninguém. */
export class LegalModule extends BaseModule {
  readonly id = 'legal';
  readonly name = 'Jurídico';
  readonly version = '0.1.0';
  readonly description = 'Legislação, jurisprudência, teses e redação de peças.';
}

export const legalModule = new LegalModule();
