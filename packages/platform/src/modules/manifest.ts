import type { BeeHiveModule } from './types';
import { conversationModule } from './conversation';

/**
 * Manifesto de módulos — a "descoberta" de módulos do BeeHive.
 *
 * Módulos placeholders foram comentados até terem implementação real.
 * Para reativar: descomentar a importação e a entrada no array.
 *
 * Em um pacote de navegador não há varredura de arquivos em tempo de execução;
 * a descoberta é este manifesto estático. Adicionar um módulo novo é: criar a
 * pasta em `modules/` e acrescentar uma linha aqui. O ModuleManager cuida do
 * resto (ordem por dependência, validação, ciclo de vida, eventos).
 */
// import { businessModule } from './business';
// import { legalModule } from './legal';
// import { developmentModule } from './development';
// import { designModule } from './design';
// import { mediaModule } from './media';
// import { knowledgeModule } from './knowledge';
// import { dashboardModule } from './dashboard';
// import { settingsModule } from './settings';

export const MODULE_MANIFEST: readonly BeeHiveModule[] = [
  conversationModule,
  // businessModule,
  // legalModule,
  // developmentModule,
  // designModule,
  // mediaModule,
  // knowledgeModule,
  // dashboardModule,
  // settingsModule,
];
