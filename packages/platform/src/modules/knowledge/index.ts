import { BaseModule } from '../BaseModule';

/** Módulo Conhecimento (placeholder). */
export class KnowledgeModule extends BaseModule {
  readonly id = 'knowledge';
  readonly name = 'Conhecimento';
  readonly version = '0.1.0';
  readonly description = 'Base de referência consultável do sistema.';
}

export const knowledgeModule = new KnowledgeModule();
