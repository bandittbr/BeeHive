import { getRuntimeClient } from '@/app/runtimeClient';
import type { ModelsInfo } from '@/app/runtimeClient';

/**
 * Serviço de Configurações — fala com o Core para listar e trocar o modelo de
 * inteligência. Mantém a interface desacoplada do backend concreto.
 *
 * Sprint 13 (Platform Unification): não faz mais `fetch` direto — delega ao
 * `RuntimeClient`.
 */
export type { ModelsInfo };

export function listModels(): Promise<ModelsInfo> {
  return getRuntimeClient().listModels();
}

export function setActiveModel(model: string): Promise<string> {
  return getRuntimeClient().setActiveModel(model);
}
