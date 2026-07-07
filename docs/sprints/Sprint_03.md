# Sprint 3 — Inteligência Local (Ollama)

- **Objetivo:** dar "cérebro" ao BeeHive. Construir o **Core** no backend com uma **abstração de inteligência** substituível e conectar a Conversa a um modelo **local e gratuito via Ollama**, usando a porta de serviço já preparada no Sprint 2 — sem refatorar a interface.

- **Escopo (dentro):**
  - Backend `apps/api` (Core): orquestrador da Conversa, abstração `IntelligenceProvider`, adaptador Ollama, servidor HTTP.
  - Endpoint `POST /api/conversation/respond` e `GET /api/health`.
  - Frontend: `coreConversationService` (fala com o Core) substituindo o serviço local, via troca no Provider — **a UI não mudou**.
  - Proxy do Vite (`/api` → backend) e scripts para rodar web + api juntos.
  - Tratamento de erro: se Ollama/servidor estiverem fora, a Conversa mostra uma mensagem de sistema (sem quebrar).

- **Escopo (fora) — não implementado:**
  - Business, Agentes e demais Áreas funcionais; banco de dados; autenticação; persistência de conversas; streaming de respostas.

- **Critérios de conclusão:**
  - [x] O Core monta o contexto (system + histórico + nova mensagem) e chama a inteligência por abstração.
  - [x] A Conversa recebe respostas reais do modelo local.
  - [x] Trocar/!desligar o provedor não exige mudar a interface (P7) nem o Core (só o adaptador).
  - [x] Validação: bundle do backend **exit 0**; bundle do frontend **exit 0**; teste unitário do orquestrador (provider falso) **5/5 asserções**.

- **Arquitetura aplicada:**
  - **Abstração de inteligência (P7):** todo o sistema fala com `IntelligenceProvider`; só `ollamaProvider.ts` conhece o Ollama. Trocar de provedor = novo adaptador.
  - **Core desacoplado (P6):** o orquestrador recebe o provider por injeção — por isso é testável sem Ollama.
  - **Porta de serviço (Sprint 2) cumpriu o papel:** conectar o Core foi trocar a implementação no Provider; nenhum componente de tela mudou.

- **Decisões técnicas (registradas em `02_Technology_Stack.md`):**
  - Backend: **Express + TypeScript + tsx** (execução em dev). Simples e onipresente.
  - Chamada ao Ollama via **fetch nativo** (Node 18+), sem cliente dedicado.
  - **Vite proxy** para `/api` (evita CORS em dev) + `concurrently` para subir web+api com um comando.
  - Modelo padrão **llama3.2** (configurável por `.env`).

- **Arquivos (principais):**
  - Novos: `apps/api/` completo (`config.ts`, `intelligence/{types,ollamaProvider}.ts`, `core/{systemPrompt,conversationOrchestrator}.ts`, `server.ts`, `.env.example`, `package.json`, `tsconfig.json`), `apps/web/src/services/conversation/coreConversationService.ts`.
  - Modificados: raiz `package.json` (scripts + `concurrently`), `apps/web/vite.config.ts` (proxy), `apps/web/src/App.tsx` (usa o serviço do Core), `ConversationView.css` (estilo de mensagem de sistema).

- **Pré-requisitos para rodar:** Ollama instalado e em execução + `ollama pull llama3.2`. Detalhes no `README.md` e em `apps/api/README.md`.

- **Pendências / dívidas conhecidas:**
  - Sem streaming: a resposta aparece de uma vez (modelos maiores podem demorar alguns segundos — o indicador "digitando" cobre isso).
  - Conversa não é persistida (some ao recarregar) — persistência é tema de um sprint futuro.
  - `npm install` ainda não rodado neste ambiente; validação por bundle isolado + teste unitário do Core.

- **Próximos passos (sugeridos):**
  - **Streaming** de respostas (SSE) para UX mais fluida.
  - **Persistência** de conversas (primeiro banco — entra na Fase de dados).
  - Começar a primeira Área de negócio (provável Business mínimo), reusando Core e kit.

- **Riscos observados:** dependência externa (Ollama precisa estar rodando) — mitigada com mensagem de sistema clara e endpoint `/api/health`. Nenhum risco arquitetural novo.

---

## Adendo — Botão parar/enviar (cancelamento)

Enquanto o modelo responde, a seta de enviar vira um **botão de parar**; ao clicar (ou ao terminar), a resposta é interrompida e a seta volta ao normal.

- **Como:** `AbortController` no `useConversation`; o `AbortSignal` atravessa a porta `ConversationService.respond(..., signal?)` até o `fetch`. Cancelar é abortar o sinal.
- **UX:** o `MessageComposer` alterna o botão conforme `isResponding`; cancelamento pelo usuário não gera mensagem de erro (descarta a resposta em silêncio).
- **Escopo:** cancela do lado do cliente (a UI volta na hora). Cancelar a geração também no servidor/Ollama depende de streaming — fica para o sprint de streaming.
- **Validação:** checagem de sintaxe (esbuild) dos arquivos alterados, OK; contratos entre hook ↔ porta ↔ composer revisados.

---

## Adendo — Conversas persistentes e múltiplas

Corrige dois problemas: a conversa resetava ao trocar de Área, e não havia persistência nem várias conversas.

- **Estado elevado:** a lógica saiu de dentro da tela (`useConversation`) para um `ConversationStore` no topo do app (acima das Áreas). Trocar de menu **não reseta** mais nada.
- **Persistência:** as conversas são salvas no navegador (`localStorage`), sobrevivendo a recarregar a página.
- **Múltiplas conversas:** "Nova" arquiva a atual e abre uma nova; o Histórico (painel direito) lista todas, clicáveis para reabrir; cada uma tem botão de apagar (com confirmação). Resetar só acontece criando outra conversa, e a anterior fica no histórico até ser apagada.
- **Arquivos:** novo `ConversationStore.tsx`; `useConversation.ts` vira re-export; `ConversationView.tsx`, `HistoryPanel.tsx`, `App.tsx` (envolve o app no Provider) e CSS do histórico atualizados.
- **Validação:** `ConversationStore.tsx` (lógica) passou na checagem de sintaxe; contratos store ↔ view ↔ histórico revisados.
- **Pendência:** no mobile o painel de histórico fica oculto (<1180px) — falta um acesso ao histórico em telas estreitas (melhoria futura).

---

## Adendo — Aviso de conflito (uma geração por vez)

Como o Ollama processa uma requisição por vez (e a VRAM não comporta paralelo), o sistema assume **uma geração ativa por vez**, mas de forma clara.

- **Rastreamento por conversa:** o store passou de um booleano global para `respondingId` (qual conversa está gerando). O botão "parar" aparece só na conversa que está respondendo; nas outras, a seta é de enviar normal.
- **Aviso de conflito:** se outra conversa está gerando e o usuário tenta enviar, abre um modal — **"Começar aqui"** (pausa a outra e envia esta) ou **"Esperar"** (mantém a outra; a mensagem digitada permanece no campo).
- **Corrida evitada:** ao "Começar aqui", a limpeza do estado de geração só ocorre se ainda for a mesma geração (guarda no `finally`).
- **Composer controlado:** o texto passou para a `ConversationView` para poder ser preservado no "Esperar".
- **Validação:** sintaxe de `MessageComposer.tsx` e `ConversationView.tsx` OK (esbuild); edições do store balanceadas; contratos revisados.

---

## Adendo — Seletor de modelo nas Configurações

Permite trocar o modelo de inteligência pela interface, sem editar o `.env`.

- **Backend:** modelo agora é mutável em runtime (`runtimeConfig`); o adaptador Ollama lê `runtime.model` a cada chamada. Novos endpoints: `GET /api/models` (lista os modelos instalados via `ollama /api/tags` + o ativo) e `POST /api/settings/model` (troca o ativo). A troca vale até reiniciar o servidor; o padrão fixo continua no `.env`.
- **Frontend:** a Área **Configurações** ganhou tela real (`SettingsView`) — lista os modelos, destaca o "Em uso", troca com um clique, com estados de carregando / erro (Ollama fora) / vazio (nenhum modelo). Roteada em `app/areas.tsx`.
- **Arquitetura:** mantém P7 — a interface fala com `settingsService` (porta), não com o Ollama. Reusa o kit (Panel, Alert, Badge, Loading, EmptyState, Button).
- **Validação:** bundle do backend OK (esbuild, exit 0); `SettingsView.tsx` e `settingsService.ts` OK; contratos revisados.

---

## Adendo — Streaming de respostas

A resposta agora aparece **ao vivo**, token a token, e o "parar" cancela de verdade no servidor.

- **Ollama em stream:** o adaptador ganhou `chatStream` (gerador assíncrono lendo NDJSON do Ollama com `stream: true`); o orquestrador ganhou `respondStream`. Ambos atrás da mesma abstração (P7).
- **Transporte:** novo endpoint `POST /api/conversation/stream` que emite NDJSON (`{type:'delta'|'done'|'error'}`). Ao desconectar (parar), `req.on('close')` aborta a geração no Ollama.
- **Porta de serviço:** `ConversationService.respond` passou a receber `handlers` (`onDelta`/`onError`) e não retornar mensagens — a UI monta a resposta incremental. `localConversationService` virou no-op.
- **UI ao vivo:** o store cria um placeholder do assistente e o preenche a cada `onDelta`; placeholder vazio (cancelado antes do 1º token) é removido; erro vira mensagem de sistema. O `MessageList` mostra os "três pontinhos" até o primeiro token e depois o texto crescendo.
- **Validação:** bundle do backend OK (exit 0); `coreConversationService.ts`, `MessageList.tsx` e o bloco editado do store OK (esbuild); contratos store ↔ porta ↔ UI revisados.
- **Correção:** o cancelamento do stream usava `req.on('close')`, que dispara cedo demais em POST (ao terminar de ler o corpo) e abortava toda geração na hora — respostas voltavam vazias. Trocado por `res.on('close')` com guarda `!res.writableEnded` (só aborta se o cliente desconectar antes do fim).

---

## Adendo — Render de Markdown na Conversa

As respostas do assistente agora são renderizadas como Markdown (GFM), não mais texto cru.

- **Biblioteca:** `react-markdown` + `remark-gfm` (seguro por padrão — não interpreta HTML cru). Decisão registrada em `02_Technology_Stack.md`.
- **Componente `MarkdownMessage`:** títulos, listas, negrito, citações, tabelas, links (abrem em nova aba com rel seguro) e **blocos de código com botão "Copiar"**.
- **Aplicação:** só nas mensagens do assistente; usuário e mensagens de sistema seguem texto puro (`white-space: pre-wrap`). Funciona durante o streaming (re-render a cada token, tolerando Markdown incompleto).
- **Dependência nova:** exige `npm install` antes de rodar.
- **Validação:** sintaxe de `MarkdownMessage.tsx` e `MessageList.tsx` OK; `markdown.css` balanceado; contratos revisados.
- **Pendência:** sem realce de sintaxe (highlight) nos blocos de código ainda — o código aparece mono-espaçado, sem cores. Melhoria futura.
