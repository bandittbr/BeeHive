# apps/api — Backend (Core)

O Core do BeeHive: orquestra a Conversa e fala com a inteligência por meio de
uma abstração substituível. No Sprint 3, o provedor de inteligência é o
**Ollama** (local, gratuito).

## Estrutura

```
apps/api/
├── src/
│   ├── config.ts          # Configuração (porta, Ollama) via .env
│   ├── intelligence/      # Abstração de IA (porta) — substituível (P7)
│   │   ├── types.ts       #   contrato IntelligenceProvider
│   │   └── ollamaProvider.ts  #   adaptador do Ollama (único que o conhece)
│   ├── core/              # Orquestração
│   │   ├── systemPrompt.ts
│   │   └── conversationOrchestrator.ts
│   └── server.ts          # Servidor HTTP (expõe a Conversa)
└── .env.example
```

## Pré-requisitos

1. **Node.js** instalado.
2. **Ollama** instalado e em execução — baixe em https://ollama.com.
3. Um modelo baixado. Padrão: `llama3.2`.
   ```bash
   ollama pull llama3.2
   ```
   (Para usar outro, ajuste `OLLAMA_MODEL` no `.env`.)

## Rodando

A partir da raiz do monorepo, `npm run dev` sobe frontend e backend juntos.
Para rodar só o backend:

```bash
npm run dev --workspace apps/api
```

Opcional: copie `.env.example` para `.env` e ajuste porta/modelo.

## Endpoints

- `GET  /api/health` — status e provedor ativo.
- `POST /api/conversation/respond` — corpo `{ message: { content }, history: [] }`,
  resposta `{ messages: [{ role: "assistant", content }] }`.
