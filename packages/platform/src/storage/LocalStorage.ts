import { mkdirSync, writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { IStorage, UploadResult } from './types';

const BASE_DIR = join(process.cwd(), 'data', 'clips');

export class LocalStorage implements IStorage {
  private ensureDir(key: string): void {
    mkdirSync(dirname(this.resolve(key)), { recursive: true });
  }

  private resolve(key: string): string {
    return join(BASE_DIR, key);
  }

  async upload(key: string, body: Buffer | Uint8Array, _contentType: string): Promise<UploadResult> {
    this.ensureDir(key);
    writeFileSync(this.resolve(key), body);
    return {
      key,
      url: this.getPublicUrl(key),
      size: body.byteLength,
    };
  }

  async download(key: string): Promise<Buffer> {
    return readFileSync(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolve(key);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  getPublicUrl(key: string): string {
    return `/shorts/clips/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    return existsSync(this.resolve(key));
  }
}
