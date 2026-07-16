export const ARTIFACT_TYPES = [
  'image', 'video', 'audio', 'document',
  'markdown', 'json', 'csv', 'pdf',
  'transcript', 'thumbnail', 'dataset',
  'prompt', 'workflow', 'report',
  'code', 'config', 'archive',
] as const;

export const ARTIFACT_MIME_TYPES: Record<string, string> = {
  image: 'image/png',
  video: 'video/mp4',
  audio: 'audio/mp3',
  markdown: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  pdf: 'application/pdf',
  transcript: 'text/plain',
  thumbnail: 'image/jpeg',
  prompt: 'text/plain',
  workflow: 'application/json',
  report: 'text/markdown',
  code: 'text/plain',
  config: 'application/json',
  archive: 'application/zip',
};

export const ARTIFACT_EXTENSIONS: Record<string, string> = {
  image: 'png',
  video: 'mp4',
  audio: 'mp3',
  markdown: 'md',
  json: 'json',
  csv: 'csv',
  pdf: 'pdf',
  transcript: 'txt',
  thumbnail: 'jpg',
  prompt: 'txt',
  workflow: 'json',
  report: 'md',
  code: 'txt',
  config: 'json',
  archive: 'zip',
};
