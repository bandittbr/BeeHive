import type { IArtifact, ArtifactType } from './types';

export class Artifact implements IArtifact {
  readonly id: string;
  readonly type: ArtifactType;
  readonly version: string;
  readonly uri: string;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: number;
  readonly createdBy: string;

  private data: unknown;

  constructor(params: {
    type: ArtifactType;
    version?: string;
    uri?: string;
    metadata?: Record<string, unknown>;
    createdBy: string;
    data?: unknown;
  }) {
    this.id = 'art-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    this.type = params.type;
    this.version = params.version ?? '1.0.0';
    this.uri = params.uri ?? 'beehive://artifacts/' + this.id;
    this.metadata = params.metadata ?? {};
    this.createdAt = Date.now();
    this.createdBy = params.createdBy;
    this.data = params.data;
  }

  async getContent(): Promise<unknown> { return this.data; }
  getStream(): AsyncIterable<Uint8Array> { throw new Error('Not implemented'); }
  validate(): boolean { return true; }
}
