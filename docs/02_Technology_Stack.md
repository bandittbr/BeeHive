# 02 — Stack Tecnológica

> **Natureza: VOLÁTIL.** Tudo aqui pode mudar. Este é, deliberadamente, o documento onde concentramos todas as decisões mutáveis — linguagens, frameworks, bancos de dados, provedores de IA, bibliotecas, hospedagem, APIs específicas e ferramentas — para que a Constituição e a Arquitetura permaneçam estáveis.
>
> Valores de referência: **junho/2026**. Limites de serviços gratuitos mudam com frequência — confirmar antes de cada decisão.

---

## Princípio de seleção

Toda escolha aqui serve a três regras, nesta ordem:
1. **Custo zero na base** (Fase 1 deve rodar sem gastar nada).
2. **Substituível** — nenhuma escolha pode amarrar o sistema (honra P7 da Constituição).
3. **Pronta para escalar** sem reescrita.

> ⚠️ As opções abaixo são **candidatas atuais**, não compromissos permanentes. A camada de abstração da arquitetura (`01`) garante que trocá-las seja barato.

---

## 1. Inteligência (cérebro de IA)

- **Fase 1 — local, grátis, privado:** Ollama, rodando modelos abertos (ex.: Llama 3.x, Qwen, Gemma) na própria máquina.
- **Reforço opcional na nuvem (tiers gratuitos):**
  - **Google Gemini (AI Studio):** ~1.500 req/dia no Flash, contexto até 1M tokens, sem cartão.
  - **Groq:** Llama 3.3 70B muito rápido, ~1.000 req/dia, API compatível com OpenAI.
  - **OpenRouter:** 28+ modelos grátis (DeepSeek R1, Qwen, Llama), ~20 req/min.
  - **Cerebras / Mistral (tier Experiment):** cotas generosas para tarefas específicas.
- **Estratégia:** rotear entre provedores multiplica a capacidade gratuita. Todo acesso passa pela abstração de inteligência, então qualquer um pode entrar ou sair.

## 2. Interface (Dashboard + Conversa)

- Candidata: aplicação web baseada em componentes (ex.: React/Next.js), hospedável em plano gratuito (Fase 2).

## 3. Orquestração / Automação

- Lógica de roteamento da Conversa: código próprio.
- Motor de fluxos dos agentes: ferramenta de automação open source (ex.: n8n) onde fizer sentido.

## 4. Mídia (geração local)

- Imagem e vídeo locais via ferramenta de workflow visual (ex.: ComfyUI) com modelos abertos (Stable Diffusion/Flux para imagem; AnimateDiff/Wan/SVD para vídeo).
- ⚠️ **Custo escondido = hardware.** Vídeo exige GPU com VRAM (8 GB faz o básico; 12–24 GB para qualidade/modelos maiores). Não é assinatura — é placa.

## 5. Conhecimento & Dados

- Banco: solução local na Fase 1 (ex.: SQLite); banco relacional com tier gratuito depois (ex.: PostgreSQL gerenciado).
- Memória/RAG: banco vetorial local + embeddings locais.
- Mídia/arquivos: disco local na Fase 1; storage barato depois.

## 6. Código & Hospedagem

- Versionamento e CI: repositório Git em serviço gratuito (ex.: GitHub).
- Frontend: hospedagem gratuita (ex.: Vercel) na Fase 2.
- Agentes 24h: VPS simples na Fase 3.

## 7. Integrações externas (APIs específicas)

- Redes sociais e marketplaces serão integrados via suas APIs oficiais. Cada integração tem regras, aprovações e limites próprios — ver `12_Risks_and_Constraints.md` e `05_Business.md`.
- ⚠️ Estas APIs são as mais voláteis de todas: versões, limites e políticas mudam por trimestre.

---

## Registro de decisões (a manter)

Recomenda-se registrar aqui, ao longo do tempo, cada escolha técnica com data e motivo, para que substituições futuras sejam conscientes. Exemplo de formato:

| Data | Decisão | Alternativas consideradas | Motivo | Status |
|------|---------|---------------------------|--------|--------|
| 2026-06-30 | Monorepo com workspaces npm (`apps/web`, `apps/api`, `packages`) | Repositórios separados | Compartilhar padrões e contratos sem múltiplos repos; escala bem | Ativo |
| 2026-06-30 | Frontend: React + TypeScript + Vite | Next.js | Sprint 1 é um shell visual; Vite é mais simples e leve para isso. Decisão revisável se SSR/hospedagem exigir | Ativo |
| 2026-06-30 | Estilo: CSS por tokens (variáveis) + CSS por componente | Tailwind, CSS-in-JS | Controle preciso do design aprovado, zero dependência de estilo, troca de tema trivial | Ativo |
| 2026-06-30 | Qualidade: ESLint (flat config) + Prettier | Biome | Padrão de mercado, amplamente conhecido | Ativo |
| 2026-06-30 | Ícones: SVG inline próprios (componente `Icon`) | Biblioteca de ícones | Evita acoplar a UI a uma lib específica; poucos ícones por ora | Ativo |
| 2026-06-30 | Roteamento interno por hash (sem lib de rotas) — Sprint 2 | React Router | App de Área única; evita dependência, dá URLs e "voltar" | Ativo |
| 2026-06-30 | Injeção do serviço de Conversa via Context (porta p/ o Core) — Sprint 2 | Chamada direta no componente | Desacopla UI de quem responde; Core entra no Sprint 3 sem refatorar a tela (P6/P7) | Ativo |
| 2026-06-30 | Registro central de Áreas como fonte única de verdade — Sprint 2 | Listas duplicadas (menu/rotas) | Menu e roteamento nunca divergem | Ativo |
| 2026-06-30 | Backend: Express + TypeScript + tsx — Sprint 3 | Fastify, http nativo | Onipresente, simples; tsx roda TS em dev sem build | Ativo |
| 2026-06-30 | Inteligência: Ollama local via abstração `IntelligenceProvider` — Sprint 3 | Amarrar a um provedor | Local, grátis, privado; trocável sem mexer no Core/UI (P7) | Ativo |
| 2026-06-30 | Modelo padrão `llama3.2` (configurável por `.env`) — Sprint 3 | Fixar no código | Pequeno e comum; ajustável sem recompilar | Ativo |
| 2026-06-30 | Vite proxy `/api` + `concurrently` — Sprint 3 | CORS manual, 2 terminais | Evita CORS em dev; um comando sobe web+api | Ativo |
| 2026-07-01 | Plataforma (Kernel/Módulos/Serviços/AI/Tools/Runtime) extraída para `packages/platform`, pacote de workspace — Sprint 12 | Manter tudo em `apps/web`; duplicar código entre web/api | Um único código-fonte, agnóstico de ambiente, consumido por `apps/api` (executa) e `apps/web` (tipos) — sem duplicação nem drift | Ativo |
| 2026-07-01 | BeeHive Runtime hospedado como processo próprio em `apps/api`, exposto por HTTP (`/api/runtime/*`) — Sprint 12 | Manter o Runtime no navegador | Cumpre "a Web é só um cliente" (Sprint 11); único ponto de execução, observável e futuramente multi-cliente (Desktop) | Ativo |
| 2026-07-01 | Eventos do Runtime em tempo real via `ws` (WebSocket) em `/api/runtime/events` — Sprint 12 | Polling do snapshot; Server-Sent Events | Bidirecional e leve; biblioteca `ws` é o padrão de mercado para Node; a UI só assina, nunca escreve pelo socket (comandos continuam por HTTP) | Ativo |

> Nota: estas são as primeiras decisões reais de implementação (Sprints 1–3). Todas respeitam o princípio de substituibilidade — em especial, a escolha de frontend é revisável sem afetar a arquitetura conceitual.
