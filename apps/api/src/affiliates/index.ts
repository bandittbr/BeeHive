/**
 * Módulo Afiliados — ponto de entrada.
 *
 * Reúne o AI Router, providers e worker para o sistema de
 * marketing de afiliados do BeeHive.
 */

export { AIRouter, createAIRouter } from './aiRouter.service';
export type { AIRouterResult } from './aiRouter.service';
export { MercadoLivreProvider } from './providers/mercadoLivre.provider';
export { InstagramProvider } from './providers/instagram.provider';
export { bootstrapWorker } from './worker/index';
