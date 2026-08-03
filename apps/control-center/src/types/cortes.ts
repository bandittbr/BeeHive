// ===== Cortes Types =====

export type CorteProjectStatus = 'PENDING' | 'GENERATING' | 'READY' | 'ERROR' | 'PUBLISHED';
export type CorteClipStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR' | 'PUBLISHED' | 'SCHEDULED';
export type FontColor = 'BLUE' | 'GREEN' | 'YELLOW' | 'PINK' | 'RED' | 'WHITE';

export interface CorteChannel {
  id: string;
  name: string;
  category?: string;
  description?: string;
  socialAccountIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CorteSocialAccount {
  id: string;
  platform: string;
  accountId: string;
  displayName?: string;
  handle?: string;
  createdAt: string;
  updatedAt: string;
  channelIds: string[];
}

export interface CorteProject {
  id: string;
  name: string;
  sourceVideoUrl: string;
  duration: number; // segundos
  format: string; // "9:16", "16:9", "1:1"
  quantityRequested: number;
  autoHighlights: boolean;
  autoCaptions: boolean;
  autoTitle: boolean;
  autoDescription: boolean;
  autoHashtags: boolean;
  status: CorteProjectStatus;
  error?: string;
  channelId?: string;
  postingSchedule?: { postsPerDay: number; times: string[] };
  clips: CorteClip[];
  createdAt: string;
  updatedAt: string;
}

export interface CorteClip {
  id: string;
  projectId: string;
  index: number;
  startTime: number;
  endTime: number;
  videoFile?: string;
  thumbnailFile?: string;
  caption?: string;
  title?: string;
  description?: string;
  hashtags: string[];
  status: CorteClipStatus;
  error?: string;
  publishedAt?: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CorteSettings {
  id: string;
  subtitleFontSize: number;
  subtitleFontFamily: string;
  subtitleVerticalPos: string;
  subtitleMaxChars: number;
  subtitleColor: string;
  activeWordColor: FontColor;
  activeWordSize: number;
  subtitleStyle: string;
  lineSpacing: number;
  videoQuality: string;
  defaultDuration: number;
  defaultQuantity: number;
  createdAt: string;
  updatedAt: string;
}

// CortesPipeline types (legacy compat)
export interface CorteClipLegacy {
  file: string;
  title?: string;
  start: number;
  end: number;
  url: string;
}

// Form for new project
export interface NewProjectForm {
  url: string;
  name: string;
  channelId?: string;
  quantity: number;
  duration: number;
  format: string;
  autoHighlights: boolean;
  autoCaptions: boolean;
  autoTitle: boolean;
  autoDescription: boolean;
  autoHashtags: boolean;
}
