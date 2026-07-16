export interface IVideoEngine {
  readonly id: string;
  readonly name: string;
  readonly capabilities: VideoCapability[];

  generateShorts(params: ShortsParams): Promise<ShortsResult>;
  renderVideo(params: VideoParams): Promise<VideoResult>;
  exportMedia(params: ExportParams): Promise<ExportResult>;
  healthCheck(): Promise<boolean>;
}

export type VideoCapability = 'shorts' | 'long-form' | 'render' | 'export' | 'subtitles' | 'thumbnail';

export interface ShortsParams {
  sourceUrl?: string;
  sourceFile?: string;
  niche?: string;
  duration?: number;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  subtitles?: boolean;
  music?: boolean;
  maxClips?: number;
}

export interface ShortsResult {
  clips: ClipInfo[];
  metadata: VideoMetadata;
}

export interface ClipInfo {
  id: string;
  path: string;
  duration: number;
  startTime: number;
  endTime: number;
  thumbnail?: string;
}

export interface VideoParams {
  script: string;
  scenes: Scene[];
  voiceOver?: string;
  backgroundMusic?: string;
}

export interface Scene {
  text: string;
  image?: string;
  video?: string;
  duration: number;
}

export interface VideoResult {
  path: string;
  duration: number;
  resolution: string;
  size: number;
}

export interface ExportParams {
  inputPath: string;
  format: string;
  quality?: 'draft' | 'standard' | 'high';
}

export interface ExportResult {
  path: string;
  size: number;
  format: string;
}

export interface VideoMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  duration: number;
  resolution?: string;
}
