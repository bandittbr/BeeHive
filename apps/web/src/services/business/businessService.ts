import { getRuntimeClient } from '@/app/runtimeClient';
import type { ContentPlanInput, NdjsonHandlers, PostsInput } from '@/app/runtimeClient';

/**
 * Serviço da Área Business. Fala com o Core (agentes) em streaming.
 *
 * Sprint 13 (Platform Unification): não faz mais `fetch` direto — delega ao
 * `RuntimeClient`. Mesmo contrato de sempre (NDJSON com onDelta/onError).
 */
export type StreamHandlers = NdjsonHandlers;
export type { ContentPlanInput, PostsInput };

export function streamContentPlan(
  input: ContentPlanInput,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  return getRuntimeClient().streamBusinessContentPlan(input, handlers, signal);
}

export function streamPosts(
  input: PostsInput,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  return getRuntimeClient().streamBusinessPosts(input, handlers, signal);
}
