import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  return Buffer.from(keyHex, 'hex');
}

export function encryptApiKey(apiKey: string): { encrypted: string; iv: string; authTag: string } {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decryptApiKey(encrypted: string, iv: string, authTag: string): string {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export type ProviderType = 'openai' | 'anthropic' | 'openrouter' | 'google' | 'ollama' | 'deepseek' | 'custom';
export type ProviderStatus = 'connected' | 'disconnected' | 'error' | 'testing';

export interface CreateProviderInput {
  providerType: ProviderType;
  name: string;
  apiKey: string;
  baseUrl?: string;
  config?: Record<string, unknown>;
}

export interface UpdateProviderInput {
  name?: string;
  apiKey?: string;
  baseUrl?: string;
  config?: Record<string, unknown>;
  isDefault?: boolean;
}

export interface ProviderWithMaskedKey {
  id: string;
  providerType: ProviderType;
  name: string;
  maskedApiKey: string;
  baseUrl: string | null;
  config: Record<string, unknown> | null;
  isDefault: boolean;
  status: ProviderStatus;
  lastTestedAt: Date | null;
  lastTestedError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestResult {
  success: boolean;
  error?: string;
  latency?: number;
  models?: string[];
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  maxOutput?: number;
  supportsImages?: boolean;
  supportsTools?: boolean;
}

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return '****';
  return apiKey.slice(0, 4) + '...' + apiKey.slice(-4);
}

function toMaskedProvider(provider: { id: string; providerType: string; name: string; encryptedKey: string; baseUrl: string | null; config: unknown; isDefault: boolean; status: string; lastTestedAt: Date | null; lastTestedError: string | null; createdAt: Date; updatedAt: Date }): ProviderWithMaskedKey {
  return {
    id: provider.id,
    providerType: provider.providerType as ProviderType,
    name: provider.name,
    maskedApiKey: maskApiKey(provider.encryptedKey),
    baseUrl: provider.baseUrl,
    config: provider.config as Record<string, unknown> | null,
    isDefault: provider.isDefault,
    status: provider.status as ProviderStatus,
    lastTestedAt: provider.lastTestedAt,
    lastTestedError: provider.lastTestedError,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

class ProviderCredentialService {
  async listProviders(): Promise<ProviderWithMaskedKey[]> {
    const providers = await prisma.aiProvider.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return providers.map(toMaskedProvider);
  }

  async createProvider(input: CreateProviderInput): Promise<ProviderWithMaskedKey> {
    const { encrypted, iv, authTag } = encryptApiKey(input.apiKey);
    
    const provider = await prisma.aiProvider.create({
      data: {
        providerType: input.providerType,
        name: input.name,
        encryptedKey: encrypted,
        iv,
        authTag,
        baseUrl: input.baseUrl || null,
        config: input.config || null,
      },
    });
    
    return toMaskedProvider(provider);
  }

  async updateProvider(id: string, input: UpdateProviderInput): Promise<ProviderWithMaskedKey> {
    const updateData: Record<string, unknown> = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.baseUrl !== undefined) updateData.baseUrl = input.baseUrl;
    if (input.config !== undefined) updateData.config = input.config;
    if (input.isDefault !== undefined) {
      if (input.isDefault) {
        await prisma.aiProvider.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }
      updateData.isDefault = input.isDefault;
    }
    
    if (input.apiKey !== undefined) {
      const { encrypted, iv, authTag } = encryptApiKey(input.apiKey);
      updateData.encryptedKey = encrypted;
      updateData.iv = iv;
      updateData.authTag = authTag;
    }
    
    const provider = await prisma.aiProvider.update({
      where: { id },
      data: updateData,
    });
    
    return toMaskedProvider(provider);
  }

  async deleteProvider(id: string): Promise<void> {
    await prisma.aiProvider.delete({ where: { id } });
  }

  async getDecryptedKey(id: string): Promise<string> {
    const provider = await prisma.aiProvider.findUniqueOrThrow({ where: { id } });
    return decryptApiKey(provider.encryptedKey, provider.iv, provider.authTag);
  }

  async testConnection(id: string): Promise<TestResult> {
    const provider = await prisma.aiProvider.findUniqueOrThrow({ where: { id } });
    const apiKey = decryptApiKey(provider.encryptedKey, provider.iv, provider.authTag);
    const baseUrl = provider.baseUrl;
    
    const startTime = Date.now();
    
    try {
      let result: TestResult;
      
      switch (provider.providerType) {
        case 'openai':
          result = await this.testOpenAI(apiKey);
          break;
        case 'anthropic':
          result = await this.testAnthropic(apiKey);
          break;
        case 'openrouter':
          result = await this.testOpenRouter(apiKey);
          break;
        case 'ollama':
          result = await this.testOllama(baseUrl || 'http://localhost:11434');
          break;
        case 'deepseek':
          result = await this.testDeepSeek(apiKey);
          break;
        case 'custom':
          result = await this.testCustom(baseUrl || '', apiKey);
          break;
        default:
          result = { success: false, error: 'Unsupported provider type' };
      }
      
      result.latency = Date.now() - startTime;
      
      await prisma.aiProvider.update({
        where: { id },
        data: {
          status: result.success ? 'connected' : 'error',
          lastTestedAt: new Date(),
          lastTestedError: result.error || null,
        },
      });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await prisma.aiProvider.update({
        where: { id },
        data: {
          status: 'error',
          lastTestedAt: new Date(),
          lastTestedError: errorMessage,
        },
      });
      
      return {
        success: false,
        error: errorMessage,
        latency: Date.now() - startTime,
      };
    }
  }

  async fetchModels(id: string): Promise<Model[]> {
    const provider = await prisma.aiProvider.findUniqueOrThrow({ where: { id } });
    const apiKey = await this.getDecryptedKey(id);
    const baseUrl = provider.baseUrl;
    
    try {
      let models: Model[] = [];
      
      switch (provider.providerType) {
        case 'openai':
          models = await this.fetchOpenAIModels(apiKey);
          break;
        case 'anthropic':
          models = this.getAnthropicModels();
          break;
        case 'openrouter':
          models = await this.fetchOpenRouterModels(apiKey);
          break;
        case 'ollama':
          models = await this.fetchOllamaModels(baseUrl || 'http://localhost:11434');
          break;
        case 'deepseek':
          models = await this.fetchDeepSeekModels(apiKey);
          break;
        case 'custom':
          models = await this.fetchCustomModels(baseUrl || '', apiKey);
          break;
      }
      
      return models;
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return [];
    }
  }

  private async testOpenAI(apiKey: string): Promise<TestResult> {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `OpenAI API error: ${response.status} - ${error}` };
    }
    
    const data = await response.json() as { data: Array<{ id: string }> };
    return { success: true, models: data.data.map(m => m.id) };
  }

  private async testAnthropic(apiKey: string): Promise<TestResult> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Anthropic API error: ${response.status} - ${error}` };
    }
    
    return { success: true, models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'] };
  }

  private async testOpenRouter(apiKey: string): Promise<TestResult> {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `OpenRouter API error: ${response.status} - ${error}` };
    }
    
    const data = await response.json() as { data: Array<{ id: string }> };
    return { success: true, models: data.data.map(m => m.id) };
  }

  private async testOllama(baseUrl: string): Promise<TestResult> {
    const response = await fetch(`${baseUrl}/api/tags`);
    
    if (!response.ok) {
      return { success: false, error: `Ollama not reachable at ${baseUrl}` };
    }
    
    const data = await response.json() as { models: Array<{ name: string }> };
    return { success: true, models: data.models.map(m => m.name) };
  }

  private async testDeepSeek(apiKey: string): Promise<TestResult> {
    const response = await fetch('https://api.deepseek.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `DeepSeek API error: ${response.status} - ${error}` };
    }
    
    const data = await response.json() as { data: Array<{ id: string }> };
    return { success: true, models: data.data.map(m => m.id) };
  }

  private async testCustom(baseUrl: string, apiKey?: string): Promise<TestResult> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    
    const response = await fetch(`${baseUrl}/v1/models`, { headers });
    
    if (!response.ok) {
      return { success: false, error: `Custom endpoint not reachable at ${baseUrl}` };
    }
    
    const data = await response.json() as { data?: Array<{ id: string }> };
    return { success: true, models: data.data?.map(m => m.id) || [] };
  }

  private async fetchOpenAIModels(apiKey: string): Promise<Model[]> {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    if (!response.ok) return [];
    
    const data = await response.json() as { data: Array<{ id: string; owned_by?: string }> };
    
    return data.data
      .filter(m => m.id.startsWith('gpt-') || m.id.startsWith('o1') || m.id.startsWith('o3'))
      .map(m => ({
        id: m.id,
        name: m.id,
        provider: 'openai',
        contextWindow: this.getOpenAIContextWindow(m.id),
        maxOutput: this.getOpenAIMaxOutput(m.id),
        supportsImages: !m.id.includes('mini'),
        supportsTools: true,
      }));
  }

  private getAnthropicModels(): Model[] {
    return [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', contextWindow: 200000, maxOutput: 8192, supportsImages: true, supportsTools: true },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic', contextWindow: 200000, maxOutput: 4096, supportsImages: true, supportsTools: true },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic', contextWindow: 200000, maxOutput: 4096, supportsImages: true, supportsTools: true },
    ];
  }

  private async fetchOpenRouterModels(apiKey: string): Promise<Model[]> {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    if (!response.ok) return [];
    
    const data = await response.json() as { data: Array<{ id: string; name: string; context_length: number; pricing: { prompt: string; completion: string } }> };
    
    return data.data
      .filter(m => m.pricing && parseFloat(m.pricing.prompt) < 0.1)
      .slice(0, 50)
      .map(m => ({
        id: m.id,
        name: m.name,
        provider: 'openrouter',
        contextWindow: m.context_length || 4096,
        supportsImages: m.id.includes('vision') || m.id.includes('gpt-4o'),
        supportsTools: !m.id.includes('mini'),
      }));
  }

  private async fetchOllamaModels(baseUrl: string): Promise<Model[]> {
    const response = await fetch(`${baseUrl}/api/tags`);
    
    if (!response.ok) return [];
    
    const data = await response.json() as { models: Array<{ name: string; size: number }> };
    
    return data.models.map(m => ({
      id: m.name,
      name: m.name,
      provider: 'ollama',
      contextWindow: 4096,
      supportsImages: m.name.includes('llava'),
      supportsTools: m.name.includes('llama'),
    }));
  }

  private async fetchDeepSeekModels(apiKey: string): Promise<Model[]> {
    const response = await fetch('https://api.deepseek.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    if (!response.ok) return [];
    
    const data = await response.json() as { data: Array<{ id: string }> };
    
    return data.data.map(m => ({
      id: m.id,
      name: m.id,
      provider: 'deepseek',
      contextWindow: m.id.includes('coder') ? 128000 : 32000,
      supportsImages: false,
      supportsTools: true,
    }));
  }

  private async fetchCustomModels(baseUrl: string, apiKey?: string): Promise<Model[]> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    
    const response = await fetch(`${baseUrl}/v1/models`, { headers });
    
    if (!response.ok) return [];
    
    const data = await response.json() as { data?: Array<{ id: string }> };
    
    return (data.data || []).map(m => ({
      id: m.id,
      name: m.id,
      provider: 'custom',
      contextWindow: 4096,
    }));
  }

  private getOpenAIContextWindow(modelId: string): number {
    if (modelId.includes('128k') || modelId.includes('gpt-4-turbo')) return 128000;
    if (modelId.includes('gpt-4o')) return 128000;
    if (modelId.includes('gpt-4')) return 8192;
    if (modelId.includes('gpt-3.5-turbo-16k')) return 16384;
    return 4096;
  }

  private getOpenAIMaxOutput(modelId: string): number {
    if (modelId.includes('gpt-4o')) return 4096;
    if (modelId.includes('gpt-4-turbo')) return 4096;
    if (modelId.includes('gpt-4')) return 8192;
    if (modelId.includes('gpt-3.5-turbo')) return 4096;
    return 4096;
  }
}

export const providerCredentialService = new ProviderCredentialService();
