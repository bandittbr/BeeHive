# Sprint 4 — Business v1 (Projeto + Agente Estrategista)

- **Objetivo:** dar o primeiro passo do coração da visão — criar **Projetos** de negócio e um primeiro **agente** que gera um plano de conteúdo com a IA local. Realiza o Marco 3 do Roadmap.

- **Escopo (dentro):**
  - Área **Business** com tela real: lista de Projetos, criação (nome, nicho, marca, descrição), detalhe e exclusão.
  - **Projeto** como unidade central (P3), persistido no navegador (localStorage).
  - **Agente estrategista de conteúdo** no backend: gera um plano (posicionamento, pilares, ideias de posts, frequência) em **streaming**, renderizado em Markdown ao vivo, com botão parar.

- **Escopo (fora):** publicação em redes, marketplaces, métricas, finanças, múltiplos agentes autônomos — próximos passos.

- **Arquitetura aplicada:**
  - O agente é um "executor especializado" (`agents/contentStrategist`) que só monta o contexto; a inteligência vem pela abstração (P7). Novo endpoint `POST /api/business/content-plan` (NDJSON streaming, mesmo padrão da Conversa, com cancelamento por `res.on('close')`).
  - Frontend: `businessService` (porta de streaming), `useBusiness` (Projetos + persistência + geração), `BusinessView` + componentes, reusando o kit e o `MarkdownMessage`.
  - Projeto no centro; o agente trabalha em segundo plano e entrega resultado ao Projeto (P3/P4).

- **Critérios de conclusão:**
  - [x] Criar/listar/abrir/apagar Projetos, persistidos.
  - [x] Gerar plano de conteúdo por Projeto, em streaming + Markdown, com parar.
  - [x] Validação: bundle do backend OK (esbuild, exit 0); 6 arquivos do frontend OK; CSS balanceado; contratos revisados.

- **Arquivos (principais):**
  - Backend: `agents/contentStrategist.ts`; `server.ts` (endpoint).
  - Frontend: `services/business/businessService.ts`; `features/business/useBusiness.ts`, `BusinessView.tsx` (+ CSS), `components/{CreateProjectModal,ProjectCard,ProjectDetail}.tsx`; `app/areas.tsx` (rota).

- **Pendências / dívidas conhecidas:**
  - Geração roda dentro da tela Business; ao trocar de Área durante a geração, ela é interrompida (estado não elevado a provider). Aceitável no v1.
  - Sem editar Projeto depois de criado (só criar/apagar) e sem editar/salvar variações do plano.
  - Depende do backend reiniciado (novo endpoint) e do Ollama.

- **Próximos passos (sugeridos):**
  - Editar Projeto e salvar múltiplos artefatos (planos, legendas, imagens).
  - Mais agentes (redator de legendas, gerador de imagem via Mídia).
  - Elevar o estado de Projetos a um provider global (geração continua ao navegar).

- **Riscos observados:** nenhum novo. Reusa o padrão de streaming já validado.

---

## Adendo — Agente redator de posts

Segundo agente do Business: transforma o plano em posts prontos.

- **Backend:** `agents/postWriter` (formato + legenda + hashtags, alinhado ao nicho/marca e ao plano gerado). Endpoint `POST /api/business/posts` (streaming NDJSON, mesmo padrão).
- **Frontend:** `businessService` refatorado com um leitor NDJSON compartilhado (`streamNdjson`) usado por plano e posts. Projeto ganhou o campo `posts`; `useBusiness` passou a controlar geração por **tipo** (`{ id, kind: 'plan' | 'posts' }`). O detalhe do Projeto virou duas seções (Plano e Posts), cada uma com gerar/parar e resultado ao vivo em Markdown.
- **Visão:** primeiro passo do "time de agentes" do influencer (estrategista → redator). Próximas peças: imagem (via nuvem), conexões de contas (esqueleto), calendário/aprovação — nesta ordem, com publicação real só após aprovações + servidor (Fase 3).
- **Validação:** bundle do backend OK (exit 0); 4 arquivos do frontend OK (esbuild); contratos revisados.

---

## Adendo — Geração de imagem (Mídia, via nuvem gratuita)

Terceira peça do pipeline: imagem para os posts, sem depender da GPU local.

- **Decisão:** imagem local é inviável na máquina do PO (GTX 1650, 4 GB). Usamos um provedor **gratuito na nuvem** (Pollinations — sem chave, gera por URL), atrás de uma **abstração `ImageProvider`** (P7), substituível. Registrada em `02_Technology_Stack.md`.
- **Backend:** `media/imageProvider.ts` + endpoint `POST /api/media/image { prompt, seed }` → `{ url }`.
- **Frontend:** `services/media/mediaService.ts`; Projeto ganhou `imagePrompt`/`imageUrl`; nova seção **Imagem** no detalhe (`ProjectImage`) com descrição, gerar/gerar-de-novo (seed aleatório) e carregamento (a geração ocorre ao carregar a URL).
- **Pipeline agora:** estrategista → redator → imagem. Faltam (nesta ordem): conexões de contas (esqueleto), calendário/aprovação, e publicação real (Fase 3, após aprovações das plataformas + servidor).
- **Validação:** bundle do backend OK; `mediaService.ts` e `ProjectImage.tsx` OK; CSS balanceado; fiação confirmada no host.
- **Nota:** Pollinations é serviço gratuito público — pode variar em velocidade/disponibilidade; a abstração permite trocar por Cloudflare Workers AI / Hugging Face depois.
