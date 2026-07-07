/**
 * Service Layer do BeeHive — ponto único de importação da infraestrutura.
 *
 * Onde vive a regra de negócio (em Services concretos, criados em sprints
 * futuras). Aqui está apenas a fundação: contratos, base e o gerenciador.
 */
export * from './types';
export { BaseService } from './BaseService';
export { ServiceManager } from './ServiceManager';
