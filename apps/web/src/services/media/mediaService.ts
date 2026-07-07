import { getRuntimeClient } from '@/app/runtimeClient';

/**
 * Serviço de Mídia — geração de imagem via Core (provedor na nuvem).
 * A interface não conhece o provedor concreto (P7): recebe apenas uma URL.
 *
 * Sprint 13 (Platform Unification): não faz mais `fetch` direto — delega ao
 * `RuntimeClient`.
 */
export function generateImage(prompt: string, seed?: number): Promise<string> {
  return getRuntimeClient().generateImage(prompt, seed);
}
