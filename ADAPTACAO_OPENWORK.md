# Adaptação OpenWork → BeeHive — Status Real (21/07/2026)

> Baseado em análise do código de `apps/control-center` e do openwork (branch `dev`).
> Regra mantida: **kernel congelado** — nada do openwork toca `kernel/` ou `packages/platform`. A integração entra como camada de runtime/provider, não substitui a arquitetura.

---

## 1. ✅ O QUE JÁ FOI FEITO (portado do openwork)

### UI / Componentes (a maior parte já está no repo)
| Item | Onde | Status |
|---|---|---|
| UI kit completo (~50 componentes shadcn-style) | `src/components/ui/` | ✅ Copiado |
| Renderizadores de tools (bash, edit, read/write, glob, grep, webfetch, websearch, todowrite, skill, apply-patch, question, mcp-tool) | `src/components/tools/` | ✅ Copiado e importado no MessageList |
| Composer com Lexical (menções, comandos, toolbar) | `src/components/chat/Composer.tsx` | ✅ Ligado no input do chat |
| Input estilo OpenWork (bolha única, anexos, model picker por provider, reasoning effort) | `ChatInputArea` em `App.tsx` + `PipelineRunner` | ✅ Feito |
| MessageList com suporte a tool parts + streaming | `src/components/chat/MessageList.tsx` | ✅ Copiado |
| Modal de permissões (allow once / always / deny) | `permission-approval-modal.tsx` + `permissionStore` | ✅ UI pronta |
| Settings shell com abas (AI, Aparência, Preferências, Ambiente, Extensões) | `src/components/settings/` | ✅ Ligado na área Settings |
| Painel MCP + cliente MCP real (SDK oficial, StreamableHTTP, OAuth) | `McpSettingsPanel` + `services/mcp-client.ts` | ✅ Feito |
| Markdown com Shiki, mermaid, artifacts renderer | `components/markdown/`, `ArtifactRenderer` | ✅ Copiado |
| Stores (app, mcp, permission, provider) | `src/stores/` | ✅ Feito |
| `opencode.jsonc` na raiz | raiz do repo | ✅ Início da adoção |

### Backend
- ✅ Chat principal responde de verdade via backend Railway (`beehiveApi.ts` → `POST /api/conversation/respond`).

---

## 2. ❌ O QUE FALTA (o coração do openwork ainda não existe)

### Crítico — runtime de execução
1. **Integração com opencode server** — não há nenhum uso de `@opencode-ai/sdk`. É isso que faz o openwork "acessar o computador" (rodar bash, editar arquivos, usar skills). Hoje o BeeHive só troca texto com o Railway.
2. **Host mode / Client mode** — openwork sobe `opencode serve` local ou conecta a um servidor por URL. O BeeHive (web, Vercel) **não pode** acessar o computador do usuário diretamente do browser. Caminho recomendado: **client mode** — um agente local (reusar `openwork-orchestrator`: `npm i -g openwork-orchestrator`) rodando na máquina, e o Control Center conecta via URL (`Add worker → Connect remote`).
3. **Sessions reais** — criar/listar sessões e enviar prompts via SDK (hoje conversas são mock).
4. **Streaming SSE real** (`/event`) — o "streaming" atual é **fake**: `beehiveApi.ts` recebe a resposta inteira e simula chunks com `setTimeout`.
5. **Permissions ligadas ao runtime** — o modal existe, mas nada chama `requestPermission` a partir de eventos reais do servidor. Hoje nunca abre.
6. **Tool parts reais** — o MessageList sabe renderizar bash/edit/grep etc., mas as mensagens do backend são só texto. Nenhuma tool part chega até ele.

### Importante — funcionalidades openwork ausentes
7. **Execution plan / timeline de todos** (render dos todos do opencode).
8. **Skills manager** — listar/importar skills em `.opencode/skills/`.
9. **Plugins via `opencode.json`** — ler/escrever config de plugins pela UI (aba Skills do openwork).
10. **Templates** — salvar e reexecutar workflows.
11. **Debug exports** (relatório de runtime + logs).

### Dívida técnica criada pela adaptação (a outra IA deixou quebrado)
12. **Rotas de API mortas**: `src/app/api/**/route.ts` usam `next/server` + Prisma **dentro de um app Vite**. Next não é nem dependência. Em produção, `/api/*` cai no rewrite do `vercel.json` para `index.html` → `useConversations`/`useMessages` quebram silenciosamente. Decidir: migrar para funções serverless do Vercel (`/api` na raiz) ou mover para o backend Railway. **Hoje é código morto.**
13. **Serviços mock**: `chat.service.ts`, `project.service.ts` são `setTimeout` + Zustand (nada persiste no servidor). `ProjectChat` tem mensagens hardcoded e resposta fake.
14. **Modelos hardcoded**: `modelOptions` fixo no `ChatInputArea` (GPT-4o, Claude 3.5…) em vez de vir do `providerStore`/Settings.
15. **Duplicação de input**: `ChatInputArea` duplicado em `App.tsx` e `PipelineRunner.tsx` — extrair componente único.

---

## 3. 🎨 DESIGN — bugs confirmados no código

> **✅ ATUALIZAÇÃO 21/07/2026 — todos os itens 3.1–3.4 abaixo foram CORRIGIDOS**, mais:
> - Imports duplicados no `App.tsx` (Loader2, X, FilePlus, ChevronRight, Settings, Zap, Terminal 2x) — **quebravam o build**; removidos.
> - Erro de sintaxe JSX no `PipelineRunner.tsx` — quebrava o build; depois constatado que o arquivo era uma cópia morta do App.tsx inteiro (importava a si mesmo) → **deletado** (recuperável no git).
> - `useMessages` não expunha `setMessages` → envio no chat principal crashava em runtime; corrigido.
> - Mapeamento de mensagens usava `m.time` (inexistente — o hook usa `createdAt`); corrigido.
> - `tsconfig.json` sem alias `@/*` (o Vite tinha, o tsc não); adicionado.
> - Tipos `Project.secrets`, `Agent.color/task/pipeline` adicionados; união do `projectView` incluiu `secrets`; props do `ChatInputArea` tipadas como `Dispatch<SetStateAction>`; `EvaluationRunner` recebia obrigatório `project` e era chamado sem — corrigido com fallback.
> - App.tsx: de ~45 erros de typecheck para 0 reais. Restam ~430 erros no projeto, concentrados nos componentes copiados do openwork (`execution.service`, `MessageList`, stores) — não bloqueiam o build do Vite, mas são a próxima limpeza.

### 3.1 Aba Projetos → Cowork sem chat (o pior)
`ProjectView` (App.tsx ~linhas 708–732) **não renderiza nada** quando `activeView === 'cowork'` — não existe branch para `cowork` no `project-main`. A tab abre vazia. O componente `ProjectChat` existe (linha 750) mas nunca é montado — e é mock.
**Fix:** montar na aba Cowork um chat real reutilizando `MessageList` + `ChatInputArea` + `PermissionApprovalModal`, conectado ao runtime (item 2 acima). É exatamente o "Cowork do Claude" que você quer.

### 3.2 Menu lateral invertido
- `Settings` está no `nav-group` do topo (linhas 135–139).
- `Projetos Recentes` está no `sidebar-footer` (linhas 141–154).
**Fix:** trocar — Projetos Recentes sobe para o corpo da sidebar (abaixo de Chat/Projetos), Settings desce para o rodapé, junto ao usuário (padrão Claude/openwork).

### 3.3 Lugar de digitar no chat errado
`App.css` linha 152: `.home-chat-layout { grid-template-columns: 1fr 0; }` — a coluna da `conversation-sidebar` tem **largura 0** (fica espremida/invisível) e o input fica no fluxo do conteúdo, não ancorado.
**Fix:** input fixo no rodapé (`position: sticky; bottom: 0`), centralizado (max-width ~800px) como no openwork/Claude; sidebar de conversas com largura real (ex.: 280px colapsável) ou removida do grid.

### 3.4 Menores
- `handleNewProject` usa `prompt()` nativo do browser → trocar por Dialog do UI kit.
- Botão aninhado em botão na sidebar (`<button class="nav-row"><button class="nav-row-main">`) — HTML inválido, quebra acessibilidade e pode causar double-fire de clique.
- Quick action "Nova conversa" no hero não faz nada (`onClick → undefined`).

---

## 4. 🗺 ORDEM RECOMENDADA DE EXECUÇÃO

1. **Design fixes 3.1–3.4** (rápido, 1 sessão) — inclusive montar o ProjectChat na aba Cowork já com os componentes portados, mesmo antes do runtime real.
2. **Limpar dívida**: deletar/migrar rotas `next/server` mortas; unificar ChatInputArea; modelos vindos do providerStore.
3. **Runtime (o pulo do gato)**: adotar client mode — campo "Conectar worker (URL)" em Settings; integrar `@opencode-ai/sdk/v2/client` (sessions, prompt, SSE `/event`, permissions, todos). O agente local é o `openwork-orchestrator` rodando na máquina do usuário. O kernel BeeHive permanece congelado; o opencode entra como provider externo.
4. **Streaming real** via SSE substituindo o chunking fake do `beehiveApi`.
5. **Permissions + tool parts** ligadas aos eventos do servidor (o modal e os renderizadores já existem — só falta o fio).
6. **Persistência real** de conversas/projetos (Prisma via serverless ou Railway).
7. **Skills manager, plugins, templates, execution plan** — nessa ordem.

---

## 5. Observação sobre a pasta local

Não tenho acesso a `C:\Users\Gabriel\Downloads\openwork-dev` (só a `E:\BeeHive`). Esta análise usou o repo oficial `different-ai/openwork` (branch dev, mesma origem do seu zip). Se quiser diff arquivo a arquivo, copie a pasta para dentro de `E:\BeeHive\` (ex.: `E:\BeeHive\_openwork-ref\`) e eu comparo direto.
