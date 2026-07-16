export interface IImageEngine {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ImageCapability[];

  generate(params: ImageGenerationParams): Promise<ImageResult>;
  edit(params: ImageEditParams): Promise<ImageResult>;
  healthCheck(): Promise<boolean>;
}

export type ImageCapability = 'text-to-image' | 'image-to-image' | 'inpainting' | 'outpainting' | 'upscale';

export interface ImageGenerationParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  style?: string;
  seed?: number;
  count?: number;
}

export interface ImageEditParams {
  image: string;
  prompt: string;
  mask?: string;
  strength?: number;
}

export interface ImageResult {
  images: string[];
  metadata: {
    seed: number;
    model: string;
    duration: number;
  };
}
