export interface AIManagerConfig {
  defaultProvider?: string;
  defaultModel?: string;
  providers?: Array<{
    name: string;
    apiKey?: string;
    baseUrl?: string;
    models: string[];
  }>;
}

export const DEFAULT_AI_CONFIG: AIManagerConfig = {
  defaultProvider: 'openai',
  defaultModel: 'gpt-4',
  providers: [],
};