import { Artifact } from './artifact';
import type { ArtifactType } from './types';

export class ArtifactBuilder {
  static create(type: ArtifactType, createdBy: string) {
    return new ArtifactBuilder(type, createdBy);
  }

  private data: unknown;
  private metadata: Record<string, unknown> = {};
  private version = '1.0.0';

  private constructor(
    public readonly type: ArtifactType,
    public readonly createdBy: string,
  ) {}

  withData(d: unknown): this { this.data = d; return this; }
  withMetadata(m: Record<string, unknown>): this { this.metadata = m; return this; }
  withVersion(v: string): this { this.version = v; return this; }

  build(): Artifact {
    return new Artifact({
      type: this.type,
      createdBy: this.createdBy,
      data: this.data,
      metadata: this.metadata,
      version: this.version,
    });
  }
}
