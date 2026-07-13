/**
 * Tipos do módulo Cortes Youtube (Shorts).
 */

export type SocialPlatform = 'youtube' | 'tiktok' | 'instagram';

export type PipelineStatus =
  | 'queued'
  | 'downloading'
  | 'transcribing'
  | 'analyzing'
  | 'cropping'
  | 'generating_metadata'
  | 'publishing'
  | 'done'
  | 'error';

export type PublishStatus = 'pending' | 'publishing' | 'published' | 'error';

export type ClipStatus = 'generated' | 'published' | 'error';

export interface ShortsAgent {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  niche: string;
  defaultProviderId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentSocialAccount {
  id: string;
  agentId: string;
  platform: SocialPlatform;
  accountName: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  connectedAt: string;
  active: boolean;
}

export interface PipelineJob {
  id: string;
  agentId: string;
  youtubeUrl: string;
  status: PipelineStatus;
  progress: number;
  numClips: number;
  providerId: string;
  language: string;
  errorMessage: string;
  startedAt: string;
  completedAt: string;
  createdAt: string;
}

export interface PipelineClip {
  id: string;
  jobId: string;
  agentId: string;
  title: string;
  description: string;
  hashtags: string[];
  startTime: number;
  endTime: number;
  score: number;
  hookSentence: string;
  viralityReason: string;
  clipPath: string;
  thumbnailPath: string;
  subtitlePath: string;
  duration: number;
  status: ClipStatus;
  createdAt: string;
}

export interface PublishQueueItem {
  id: string;
  clipId: string;
  agentId: string;
  platform: SocialPlatform;
  scheduledAt: string;
  status: PublishStatus;
  errorMessage: string;
  publishedAt: string;
  externalPostId: string;
  createdAt: string;
}

export interface ShortsMetrics {
  id: string;
  clipId: string;
  agentId: string;
  platform: SocialPlatform;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  subscribersGained: number;
  collectedAt: string;
}

export interface AgentSummary {
  agent: ShortsAgent;
  socialAccounts: AgentSocialAccount[];
  totalClips: number;
  totalViews: number;
  totalLikes: number;
  activeJobs: number;
  recentJobs: PipelineJob[];
}

export interface ShortsMetricsSummary {
  agentId: string;
  period: string;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  subscribersGained: number;
  clipsPublished: number;
  byPlatform: Record<SocialPlatform, { views: number; likes: number; comments: number }>;
}
