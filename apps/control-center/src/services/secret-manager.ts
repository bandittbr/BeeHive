import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Simple encryption (in production, use proper crypto with key rotation)
const ENCRYPTION_KEY = process.env.SECRET_ENCRYPTION_KEY || "beehive-secret-key-32-chars!!";

function encrypt(text: string): string {
  // Simple XOR encryption for demo - replace with proper AES-GCM in production
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
  }
  return btoa(result);
}

function decrypt(encrypted: string): string {
  try {
    const text = atob(encrypted);
    let result = "";
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
    }
    return result;
  } catch {
    return "";
  }
}

export interface SecretData {
  id: string;
  projectId: string;
  key: string;
  value: string; // decrypted
  type: "STRING" | "API_KEY" | "DATABASE_URL" | "OAUTH_TOKEN" | "SSH_KEY" | "CERTIFICATE";
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSecretInput {
  projectId: string;
  key: string;
  value: string;
  type?: "STRING" | "API_KEY" | "DATABASE_URL" | "OAUTH_TOKEN" | "SSH_KEY" | "CERTIFICATE";
  description?: string;
  createdBy: string;
}

export class SecretManagerService {
  async createSecret(input: CreateSecretInput): Promise<SecretData> {
    const existing = await prisma.secret.findUnique({
      where: { projectId_key: { projectId: input.projectId, key: input.key } },
    });
    
    if (existing) {
      throw new Error(`Secret with key "${input.key}" already exists`);
    }

    const encrypted = encrypt(input.value);
    
    const secret = await prisma.secret.create({
      data: {
        projectId: input.projectId,
        key: input.key,
        value: encrypted,
        type: input.type || "STRING",
        description: input.description,
        createdBy: input.createdBy,
      },
    });

    return this.formatSecret(secret, true);
  }

  async getSecret(projectId: string, key: string): Promise<SecretData | null> {
    const secret = await prisma.secret.findUnique({
      where: { projectId_key: { projectId, key } },
    });
    
    if (!secret) return null;
    return this.formatSecret(secret, true);
  }

  async getSecrets(projectId: string): Promise<SecretData[]> {
    const secrets = await prisma.secret.findMany({
      where: { projectId },
      orderBy: { key: "asc" },
    });
    
    return secrets.map(s => this.formatSecret(s, false)); // Don't include values in list
  }

  async getSecretsWithValues(projectId: string): Promise<Record<string, string>> {
    const secrets = await prisma.secret.findMany({
      where: { projectId },
    });
    
    const result: Record<string, string> = {};
    for (const secret of secrets) {
      result[secret.key] = decrypt(secret.value);
    }
    return result;
  }

  async updateSecret(projectId: string, key: string, value: string, description?: string): Promise<SecretData> {
    const secret = await prisma.secret.findUnique({
      where: { projectId_key: { projectId, key } },
    });
    
    if (!secret) {
      throw new Error(`Secret "${key}" not found`);
    }

    const encrypted = encrypt(value);
    
    const updated = await prisma.secret.update({
      where: { id: secret.id },
      data: {
        value: encrypted,
        description: description ?? secret.description,
      },
    });

    return this.formatSecret(updated, true);
  }

  async deleteSecret(projectId: string, key: string): Promise<boolean> {
    try {
      await prisma.secret.delete({
        where: { projectId_key: { projectId, key } },
      });
      return true;
    } catch {
      return false;
    }
  }

  // Resolve secret references in text: {{secrets.KEY}} -> actual value
  async resolveSecrets(projectId: string, text: string): Promise<string> {
    const secretPattern = /\{\{\s*secrets\.([A-Z0-9_]+)\s*\}\}/gi;
    const matches = text.matchAll(secretPattern);
    const keys = [...new Set(Array.from(matches, m => m[1]))];
    
    if (keys.length === 0) return text;
    
    const secrets = await this.getSecretsWithValues(projectId);
    
    return text.replace(secretPattern, (match, key) => {
      return secrets[key] || match;
    });
  }

  // Resolve secrets in node config object
  async resolveSecretsInConfig(projectId: string, config: Record<string, any>): Promise<Record<string, any>> {
    const result = { ...config };
    
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === "string") {
        result[key] = await this.resolveSecrets(projectId, value);
      } else if (typeof value === "object" && value !== null) {
        result[key] = await this.resolveSecretsInConfig(projectId, value);
      }
    }
    
    return result;
  }

  private formatSecret(secret: any, includeValue: boolean): SecretData {
    return {
      id: secret.id,
      projectId: secret.projectId,
      key: secret.key,
      value: includeValue ? decrypt(secret.value) : "",
      type: secret.type,
      description: secret.description,
      createdBy: secret.createdBy,
      createdAt: secret.createdAt.toISOString(),
      updatedAt: secret.updatedAt.toISOString(),
    };
  }
}

export const secretManager = new SecretManagerService();

// Node config secret resolver for pipeline executor
export async function resolveNodeSecrets(projectId: string, config: Record<string, any>): Promise<Record<string, any>> {
  return secretManager.resolveSecretsInConfig(projectId, config);
}