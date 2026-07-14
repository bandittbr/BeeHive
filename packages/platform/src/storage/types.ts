export interface StorageConfig {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  publicUrl?: string;
  region?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
}

export interface IStorage {
  upload(key: string, body: Buffer | Uint8Array, contentType: string): Promise<UploadResult>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
  exists(key: string): Promise<boolean>;
}
