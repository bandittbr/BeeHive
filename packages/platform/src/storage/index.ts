export { S3Storage } from './S3Storage';
export { LocalStorage } from './LocalStorage';
export type { StorageConfig, IStorage, UploadResult } from './types';

import { S3Storage } from './S3Storage';
import { LocalStorage } from './LocalStorage';
import type { IStorage } from './types';

export function createStorage(): IStorage {
  if (process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY) {
    return new S3Storage({
      endpoint: process.env.S3_ENDPOINT,
      bucket: process.env.S3_BUCKET,
      accessKey: process.env.S3_ACCESS_KEY,
      secretKey: process.env.S3_SECRET_KEY ?? '',
      publicUrl: process.env.S3_PUBLIC_URL,
      region: process.env.S3_REGION ?? 'auto',
    });
  }
  return new LocalStorage();
}
