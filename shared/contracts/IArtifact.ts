export interface IArtifact {
  readonly id: string;
  readonly type: ArtifactType;
  readonly version: string;
  readonly uri: string;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: number;
  readonly createdBy: string;

  getContent(): Promise<unknown>;
  getStream(): AsyncIterable<Buffer>;
  validate(): boolean;
}

export type ArtifactType =
  | 'image' | 'video' | 'audio' | 'document'
  | 'markdown' | 'json' | 'csv' | 'pdf'
  | 'transcript' | 'thumbnail' | 'dataset'
  | 'prompt' | 'workflow' | 'report'
  | 'code' | 'config' | 'archive';

export interface ArtifactRef {
  id: string;
  type: ArtifactType;
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: number;
}

export interface IArtifactStore {
  store(artifact: IArtifact): Promise<string>;
  get(id: string): Promise<IArtifact | null>;
  delete(id: string): Promise<void>;
  list(filter?: { type?: ArtifactType; createdBy?: string; from?: number; to?: number }): Promise<ArtifactRef[]>;
  link(sourceId: string, targetId: string, relation: string): Promise<void>;
  getLinked(id: string, relation?: string): Promise<ArtifactRef[]>;
}
