# OpenRouter AI Provider

Executa `chat.generate` via OpenRouter API.

## Instalação

```bash
# Adicionar dependência
npm install openai

# Configurar API key
# export OPENROUTER_API_KEY=sua-chave-aqui
# ou em beehive.config.json
```

## Uso

```json
{
  "providers": {
    "ai": {
      "chat.generate": {
        "provider": "openrouter",
        "model": "meta-llama/llama-3-8b-instruct:free"
      }
    }
  }
}
```

## Limitações

- Requer `OPENROUTER_API_KEY` no ambiente ou config
- Rate limits da OpenRouter (ver docs)
- Modelos gratuitos têm prioridade menor
