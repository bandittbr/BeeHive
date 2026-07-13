# BeeHive — Anchored Summary

## Deploy Status
- **Backend: ONLINE** on Railway — https://beehive-production-d934.up.railway.app
  - `/api/runtime/status` → `Running`; `/api/providers` → 10-provider catalog (HTTP 200)
- **Frontend: DEPLOYED & LIVE & PÚBLICO** on Vercel — projeto `bee-hive-web` (gabrieladv-s-projects)
  - Domínio de produção: **https://bee-hive-web-six.vercel.app/** (público, sem auth wall)
  - Commitado + pushado no `master` (commit `31c109d`); deploy `ceed3webd` (Ready).
  - Verificado: o bundle JS do domínio de produção contém o redesign completo (Dashboard, "Sistema Operacional", "Explore o BeeHive", "Runtime ativo", honeycomb) e `VITE_API_URL` = Railway.
  - Os URLs com hash (`bee-hive-<hash>-gabrieladv-s-projects.vercel.app`) aparecem atrás de "Login - Vercel" (Vercel Auth em preview) — o domínio de produção está ok.

## Objective
- Tornar o BeeHive um produto premium "top de vendas": backend já no ar no Railway; frontend precisa de design coeso de alto impacto em todas as views (Dashboard de destaque), build/typecheck saudável e deploy na Vercel.

## Key Fixes Applied (this session)
- **Backend deploy**: pnpm filter `@beehive/api`, `pnpm rebuild better-sqlite3`, `nodejs_22` (ABI 127), SQLite via `@beehive/platform` `DatabaseManager`, providers registrados após `runtime.start()`.
- **Frontend redesign (fase 1 — Shell + Conversa)**: `tokens.css` (mel/âmbar, dark+light), `global.css`, `AppLayout.css`, `Icon.tsx` (hexagon/sparkles/folder/chevron/link/film/play/globe/star/crown/bolt/+), `BeeHiveSidebar.tsx`, `ConversationView.css`, `index.html` (Inter/JetBrains Mono), `useTheme.ts` (localStorage), `shims/nodeBuiltins.ts` + `vite.config.ts` alias → `vite build` passa.
- **Typecheck Shorts corrigido**: removido import duplicado em `AgentDetailView.tsx`, imports não usados (`PipelineClip`, `ClipPreviewCard`, `STATUS_LABELS`, `activeJobs`), ícones `'link'`/`'film'` adicionados ao `IconName`; limpezas em `ProviderSelector.tsx` e `ShortsView.tsx`. `pnpm typecheck` passa.
- **Dashboard premium criado** (`features/dashboard/DashboardView.tsx` + `.css`): hero com marca hexágono, headline com gradiente âmbar, trust signals, status do sistema (big-pickle ativo), grade de áreas (Conversa/Projetos/Negócios/Cortes/Providers/Agentes) — definido como tela inicial (`activeView` default = `dashboard`).
- **Coerência de tema nas views de negócios**: reescrito `AIProvidersSettings.css` para usar tokens da colmeia (âmbar) e remover bloco `prefers-color-scheme` legado; adicionados tokens `--danger`/`--success`/`--warning` e substituídas cores hardcoded em `affiliates.css`, `BusinessView.css`, `ConversationView.css`, `AgentDetailView.css`.

## Build / Deploy Config
- `nixpacks.toml`: `nodejs_22`, `pnpm install`, `pip --user --break-system-packages`.
- Vercel (apps/web) precisa de env `VITE_API_URL=https://beehive-production-d934.up.railway.app`.

## Remaining Work
- [x] Commit/push do frontend (feito: `31c109d` e polish `e14606e` no master).
- [x] Deploy produção Vercel com o redesign (domínio `bee-hive-web-six.vercel.app`, público).
- [x] `VITE_API_URL` setado corretamente no Vercel (era vazio).
- [x] **Polish (passo 3)**: removidos todos os emojis soltos (Shorts, Negócios, Afiliados, ProviderSelector, PipelineJobCard, ClipPreviewCard) e substituídos pelo sistema de ícones de linha; corrigidas as abas de Negócios que usavam emoji como `icon` (quebravam no `Icon`).
- [x] **Backend gratuito-por-padrão (decisão do usuário)**: o app NÃO usa chave paga do dono. `config.aiProvider` agora defaulta para `'llmrouter'`, que sempre inclui OpenCode Zen (modelos free: big-pickle, hy3, nemotron etc., sem chave). Chaves placeholder são ignoradas (`cleanKey`). Verificado ao vivo: `POST /api/conversation/respond` retorna resposta do modelo grátis ("BEEHIVE FREE OK").
- [x] **Arquitetura BYOK para pago**: quem quiser modelo pago coloca a PRÓPRIA chave na tela "AI Providers" (OpenAI/Anthropic/Gemini/Groq...). Nenhuma chave paga foi setada no Railway (placeholder irrelevante, ignorado).
- [ ] **Passo 2 (domínio)**: adiado pelo usuário ("espera terminar o app"); quando quiser, add o domínio no Vercel + DNS.

## Relevant Files
- `apps/web/src/features/dashboard/DashboardView.tsx` / `.css` — vitrine premium (tela inicial)
- `apps/web/src/styles/tokens.css` — tokens mel/âmbar + `--danger`/`--success`/`--warning`
- `apps/web/src/components/common/Icon.tsx` — ícones novos
- `apps/web/src/components/layout/BeeHiveSidebar.tsx` / `AppLayout.css` — shell
- `apps/web/src/features/conversation/ConversationView.css` — chat
- `apps/web/src/features/settings/components/AIProvidersSettings.css` — refeito p/ tokens
- `apps/web/src/features/business/affiliates/affiliates.css`, `BusinessView.css` — cores tokenizadas
- `apps/web/src/App.tsx` — dashboard como default
- `apps/web/src/shims/nodeBuiltins.ts`, `vite.config.ts` — build browser
- `nixpacks.toml`, `railway.json` — backend deploy
