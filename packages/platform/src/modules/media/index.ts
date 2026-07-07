import { BaseModule } from '../BaseModule';

/** Módulo Mídia (placeholder). */
export class MediaModule extends BaseModule {
  readonly id = 'media';
  readonly name = 'Mídia';
  readonly version = '0.1.0';
  readonly description = 'Geração de imagens, vídeos e áudio.';
}

export const mediaModule = new MediaModule();
