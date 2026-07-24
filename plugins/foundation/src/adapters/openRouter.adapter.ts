export class OpenRouterAdapter {
  constructor(private config: { apiKey?: string; baseUrl?: string }) {}

  async chat(messages: { role: string; content: string }[], options?: { model?: string; stream?: boolean }) {
    const baseUrl = this.config.baseUrl ?? 'https://openrouter.ai/api/v1';
    const response = await fetch(${baseUrl}/chat/completions, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': Bearer ,
      },
      body: JSON.stringify({
        model: options?.model ?? 'meta-llama/llama-3.1-8b-instruct',
        messages,
        stream: options?.stream ?? false,
      }),
    });
    return response.json();
  }
}
