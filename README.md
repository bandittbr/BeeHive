# 🐝 BeeHive

> Sistema Operacional de Inteligência Artificial — modular, com a **Conversa** como interface principal.

Este repositório contém o código e a documentação do BeeHive. A visão, a filosofia e as regras do projeto vivem em [`docs/`](./docs/README.md) — comece pela [Constituição](./docs/00_BeeHive_Constitution.md) e pelo [Guia de Desenvolvimento](./docs/03_Development_Guide.md).

## Estrutura do repositório

```
BeeHive/
├── apps/
│   ├── web/        # Frontend — a interface do BeeHive (React + TypeScript + Vite)
│   └── api/        # Backend — hospeda o BeeHive Runtime + fala com a IA local (Ollama)
├── packages/
│   └── platform/   # Kernel, Módulos, Serviços, AI Layer, Tools, Runtime (pacote compartilhado)
├── docs/           # Documentação de fundação (Constituição, arquitetura, roadmap, sprints)
├── package.json    # Raiz do monorepo (workspaces)
└── ...configs      # Padrões de qualidade compartilhados (lint, formatação, editor)
```

| Pasta | Propósito |
|-------|-----------|
| `apps/web` | A interface do usuário. A tela do BeeHive (Conversa, Áreas, kit de componentes) — cliente do Runtime (HTTP/WebSocket). |
| `apps/api` | O backend (Core): hospeda o BeeHive Runtime (`@beehive/platform`) como processo próprio e fala com a IA local (Ollama) por uma abstração substituível. |
| `packages/platform` | A plataforma compartilhada (Kernel, Módulos, Serviços, AI Layer, Tools, Runtime), extraída de `apps/web` na Sprint 12. Consumida por `apps/api` (executa) e `apps/web` (tipos/contratos). |
| `docs` | Toda a documentação conceitual e o registro dos Sprints. |

## Começando (desenvolvimento)

Pré-requisitos:
1. **Node.js** (versão LTS atual) e npm.
2. **Ollama** instalado e em execução — https://ollama.com.
3. O modelo baixado (padrão `llama3.2`): `ollama pull llama3.2`.

```bash
# na raiz do repositório
npm install            # instala as dependências de todos os apps (workspaces)
npm run dev            # sobe frontend (apps/web) E backend (apps/api) juntos
npm run lint           # checa padrões de código
npm run format         # formata o código
```

O frontend abre em http://localhost:5173 e conversa com o backend (Core) em
http://localhost:4000, que por sua vez fala com o Ollama. Se o Ollama não
estiver rodando, a Conversa avisa com uma mensagem de sistema (a interface não
quebra).

> Estado atual: **Sprint 12 — Plataforma de packages (workspaces).** Kernel,
> Módulos, Serviços, AI Layer, Tools e Runtime vivem em `packages/platform` e
> rodam como processo próprio dentro de `apps/api`, expostos por HTTP/WebSocket;
> `apps/web` é cliente remoto. A Conversa já gera respostas reais via IA local
> (Ollama); Business gera plano/posts e imagem. Continuam de fora: unificação
> do Runtime com esses fluxos reais (hoje paralelos — ver `Sprint_12.md`),
> persistência em banco de dados (Business ainda usa `localStorage`) e
> autenticação. Registros em [`docs/sprints/`](./docs/sprints/).
