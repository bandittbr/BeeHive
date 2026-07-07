# Sprint 2 — Aplicação Funcional

- **Objetivo:** transformar o BeeHive de um layout estático em uma aplicação funcional (navegação, base de todas as Áreas, Conversa como chat local e um kit de componentes), mantendo a arquitetura definida. **Sem IA, banco, autenticação ou API.**

- **Escopo (dentro):**
  - Navegação funcional: roteamento interno por hash, sidebar navegável, seleção visual da Área ativa.
  - Base das 11 Áreas: cada uma com página inicial (título, descrição, estado, espaço para evoluir).
  - Conversa como chat: envio local, histórico em memória, rolagem automática, horário, botão limpar (com confirmação), sugestões clicáveis.
  - Kit de componentes reutilizáveis: Button, Card, Input, Modal, Menu, Panel, Table, Alert, Badge, Loading, EmptyState.
  - UX: animações discretas, transições, hover, estado de carregamento (typing), responsividade completa.
  - Abstração de serviço de Conversa (porta para o Core no Sprint 3).

- **Escopo (fora) — não implementado:**
  - IA / Ollama / APIs externas; Business, Agentes e demais Áreas funcionais; banco de dados; autenticação; persistência.
  - Ao enviar uma mensagem, ela apenas aparece na conversa (nenhuma resposta automática).

- **Critérios de conclusão:**
  - [x] Navegação entre as 11 Áreas funciona e reflete na URL (hash), com Área ativa destacada.
  - [x] Cada Área tem página inicial coerente.
  - [x] Conversa envia mensagens localmente, com histórico em memória, autoscroll, horário e limpar.
  - [x] Kit com os 11 componentes pedidos, seguindo a identidade visual.
  - [x] Build valida: bundle do grafo completo via esbuild **exit 0** (sintaxe + todos os imports).
  - [x] Nenhuma funcionalidade fora do escopo.

- **Decisões técnicas (registradas em `02_Technology_Stack.md`):**
  - **Roteamento interno por hash, sem biblioteca de rotas.** Para um app de Área única, evita dependência, dá URLs compartilháveis e suporte ao "voltar".
  - **Registro central de Áreas (`app/areas.tsx`) como fonte única de verdade.** Menu e roteamento derivam dele — nunca divergem.
  - **Abstração `ConversationService` + Provider (injeção de dependência).** A interface fala com uma "porta", não com uma implementação. O Core entra no Sprint 3 trocando o serviço no Provider, sem refatorar a UI (P6/P7).
  - **Kit de componentes em CSS por tokens, num único `ui.css`.** Consistência e zero dependência de UI lib.

- **Arquivos alterados (principais):**
  - Novos: `components/ui/*` (11 componentes + `ui.css` + barrel), `components/area/AreaPage.*`, `app/areas.tsx`, `app/router/useHashRoute.ts`, `services/conversation/*` (types, local, context), `features/conversation/useConversation.ts`, `features/conversation/components/MessageList.tsx`.
  - Modificados: `App.tsx`, `main.tsx`, `data/navigation.ts`, `components/common/Icon.tsx` (novos ícones), `features/conversation/ConversationView.*`, `MessageComposer.tsx`, `QuickSuggestions.tsx`, `HistoryPanel.tsx`.

- **Pendências / dívidas conhecidas:**
  - O kit traz `Table` e `Menu` prontos, ainda sem uso intensivo nas telas (serão usados quando as Áreas ganharem conteúdo).
  - Dependências não instaladas neste ambiente; validação por bundle isolado (esbuild). O primeiro `npm install` confirmará a árvore completa.
  - **Observação de ambiente:** o mount do sandbox serviu cópias desatualizadas de arquivos reescritos várias vezes; a validação foi feita reconstruindo-os a partir do conteúdo correto e confirmando a integridade dos arquivos no host (E:\\BeeHive) via leitura direta. Não afeta o projeto entregue.

- **Próximos passos (Sprint 3, sugerido):**
  - Introduzir o **Core** no backend (orquestração) e a **abstração de inteligência** (sem amarrar provedor — P7).
  - Conectar a Conversa ao Core trocando o serviço no Provider (a UI não muda).

- **Riscos observados:** nenhum risco arquitetural novo. A separação interface ↔ serviço está pronta para o Core.
