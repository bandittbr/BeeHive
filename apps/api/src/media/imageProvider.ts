/**
 * Abstração de geração de imagem (a "porta" para qualquer provedor de imagem).
 *
 * Como a inteligência de texto (P7), o provedor de imagem é substituível. Hoje
 * usamos o Pollinations (gratuito, sem chave, gera no servidor deles — ideal
 * para máquinas sem GPU forte). Trocar de provedor é implementar esta interface.
 */
export interface ImageOptions {
  seed?: number;
  width?: number;
  height?: number;
}

export interface ImageProvider {
  readonly name: string;
  /** Devolve uma URL de imagem para o prompt (a geração ocorre ao carregar a URL). */
  buildUrl(prompt: string, opts?: ImageOptions): string;
}

export function createPollinationsProvider(): ImageProvider {
  return {
    name: 'pollinations',
    buildUrl(prompt, opts) {
      const params = new URLSearchParams({
        width: String(opts?.width ?? 1024),
        height: String(opts?.height ?? 1024),
        nologo: 'true',
      });
      if (opts?.seed !== undefined) params.set('seed', String(opts.seed));
      return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
    },
  };
}
