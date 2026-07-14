import { createHmac, createHash } from 'node:crypto';
import type { StorageConfig, IStorage, UploadResult } from './types';

function hmacSha256(key: Buffer | string, message: string): Buffer {
  return createHmac('sha256', key).update(message).digest();
}

function hashSha256(data: string | Buffer | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

function hex(buf: Buffer): string {
  return buf.toString('hex');
}

function iso8601(date: Date): string {
  return date.toISOString().replace(/[:-]/g, '').replace(/\.\d{3}/, '');
}

function signedHeaders(headers: Record<string, string>): string {
  return Object.keys(headers)
    .map((k) => k.toLowerCase())
    .sort()
    .join(';');
}

function canonicalHeaders(headers: Record<string, string>): string {
  return Object.keys(headers)
    .sort()
    .map((k) => `${k.toLowerCase()}:${headers[k].trim()}\n`)
    .join('');
}

export class S3Storage implements IStorage {
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = {
      region: 'auto',
      ...config,
    };
  }

  async upload(key: string, body: Buffer | Uint8Array, contentType: string): Promise<UploadResult> {
    const url = this.objectUrl(key);
    const response = await this.signedRequest('PUT', url, body, contentType);
    if (response.status !== 200) {
      throw new Error(`S3 upload failed: ${response.status} ${await response.text()}`);
    }
    return {
      key,
      url: this.getPublicUrl(key),
      size: body.byteLength,
    };
  }

  async download(key: string): Promise<Buffer> {
    const url = this.objectUrl(key);
    const response = await this.signedRequest('GET', url);
    if (!response.ok) {
      throw new Error(`S3 download failed: ${response.status} ${await response.text()}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(key: string): Promise<void> {
    const url = this.objectUrl(key);
    const response = await this.signedRequest('DELETE', url);
    if (response.status !== 204 && !response.ok) {
      throw new Error(`S3 delete failed: ${response.status} ${await response.text()}`);
    }
  }

  getPublicUrl(key: string): string {
    if (this.config.publicUrl) {
      const base = this.config.publicUrl.replace(/\/+$/, '');
      return `${base}/${key}`;
    }
    return `${this.config.endpoint.replace(/\/+$/, '')}/${this.config.bucket}/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    const url = this.objectUrl(key);
    const response = await this.signedRequest('HEAD', url);
    return response.status === 200;
  }

  private objectUrl(key: string): string {
    const base = this.config.endpoint.replace(/\/+$/, '');
    return `${base}/${this.config.bucket}/${encodeURIComponent(key)}`;
  }

  private async signedRequest(
    method: string,
    url: string,
    body?: Buffer | Uint8Array,
    contentType?: string,
  ): Promise<Response> {
    const parsedUrl = new URL(url);
    const now = new Date();
    const amzDate = iso8601(now);
    const dateStamp = amzDate.slice(0, 8);
    const service = 's3';
    const region = this.config.region ?? 'auto';

    const canonicalUri = parsedUrl.pathname;
    const canonicalQuery = parsedUrl.search.slice(1);

    const headers: Record<string, string> = {
      host: parsedUrl.host,
      'x-amz-content-sha256': body ? hashSha256(body) : hashSha256(''),
      'x-amz-date': amzDate,
    };

    if (body && contentType) {
      headers['content-type'] = contentType;
    }

    const sh = signedHeaders(headers);
    const ch = canonicalHeaders(headers);
    const payloadHash = body ? hashSha256(body) : hashSha256('');
    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQuery,
      ch,
      sh,
      payloadHash,
    ].join('\n');

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      hashSha256(canonicalRequest),
    ].join('\n');

    const signingKey = this.getSigningKey(dateStamp, region, service);
    const signature = hex(hmacSha256(signingKey, stringToSign));

    headers.authorization = [
      `${algorithm} Credential=${this.config.accessKey}/${credentialScope}`,
      `SignedHeaders=${sh}`,
      `Signature=${signature}`,
    ].join(', ');

    const fetchOpts: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET' && method !== 'HEAD' && method !== 'DELETE') {
      fetchOpts.body = body instanceof Buffer ? body : Buffer.from(body);
    }

    return fetch(url, fetchOpts);
  }

  private getSigningKey(dateStamp: string, region: string, service: string): Buffer {
    const kDate = hmacSha256(`AWS4${this.config.secretKey}`, dateStamp);
    const kRegion = hmacSha256(kDate, region);
    const kService = hmacSha256(kRegion, service);
    return hmacSha256(kService, 'aws4_request');
  }
}
