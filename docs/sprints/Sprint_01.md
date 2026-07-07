# Sprint 1 — Fundação Técnica

- **Objetivo:** estabelecer a base técnica do BeeHive (estrutura, padrões, ambiente) e entregar a primeira tela — **apenas visual** — inspirada na interface aprovada pelo Product Owner.

- **Escopo (dentro):**
  - Monorepo organizado (`apps/web`, `apps/api`, `packages`, `docs`).
  - Frontend com ambiente de desenvolvimento, lint e formatação configurados.
  - Sistema de design por tokens (tema escuro padrão + tema claro).
  - Primeira tela: barra lateral com as 11 Áreas, barra superior, Área Conversa (herói, cartões de ação, campo de mensagem, sugestões) e painel de histórico.
  - Layout responsivo e preparado para expansão.
  - Placeholder do backend, documentado e **sem código funcional**.

- **Escopo (fora) — deliberadamente não implementado:**
  - Integração com IA, Business, Jurídico, Agentes (e demais Áreas funcionais).
  - Banco de dados, autenticação, API funcional.
  - Persistência de qualquer tipo.

- **Critérios de conclusão:**
  - [x] Estrutura do repositório criada, com propósito claro por diretório.
  - [x] Frontend monta sem erros de sintaxe e com todos os imports resolvidos (validado via bundle do esbuild — exit 0, sem avisos).
  - [x] CSS balanceado e organizado por componente.
  - [x] A tela reproduz o conceito aprovado, em tema escuro profissional e responsivo.
  - [x] Nenhuma funcionalidade futura antecipada.

- **Arquivos alterados (principais):**
  - Raiz: `README.md`, `package.json`, `.gitignore`, `.editorconfig`, `.prettierrc.json`, `.prettierignore`.
  - `apps/web/`: `package.json`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `public/beehive.svg`.
  - `apps/web/src/`: `main.tsx`, `App.tsx`, `vite-env.d.ts`, `styles/` (tokens, global), `theme/useTheme.ts`, `data/` (navigation, conversationContent), `components/common/Icon.tsx`, `components/layout/` (AppLayout, Sidebar, Topbar + CSS), `features/conversation/` (ConversationView + componentes + CSS).
  - `apps/api/`: `README.md`, `.gitkeep`. `packages/README.md`.
  - `docs/`: este registro.

- **Como rodar:** `npm install` na raiz e `npm run dev` (sobe `apps/web`).

- **Pendências / dívidas conhecidas:**
  - Dependências ainda não instaladas neste ambiente (validação feita por bundle isolado). O primeiro `npm install` do PO confirmará a árvore completa.
  - Fonte "Inter" referenciada nos tokens cai em fallback do sistema; incluir o webfont é um polimento futuro.
  - As Áreas além da Conversa aparecem no menu, mas ainda não têm tela.

- **Próximos passos (sugeridos):**
  - **Sprint 2:** tornar a Conversa interativa em estado "em andamento" (lista de mensagens em memória, ainda sem IA) e telas-esqueleto navegáveis das demais Áreas.
  - **Sprint 3:** introduzir a camada de orquestração (Core) no backend e a abstração de inteligência (sem amarrar provedor — P7), conectando a Conversa ao primeiro modelo.

- **Riscos observados:** nenhum risco arquitetural novo. A separação interface/conteúdo/estilo está limpa e desacoplada.

- **Sugestões (não implementadas):** ver Revisão na resposta do Sprint e as sugestões S6–S9 do `03_Development_Guide.md` (numeração de arquivos e índice).
