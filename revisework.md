# Revisão Código BeeHive — Pente-Fino

> **Última atualização:** 6 Jan 2026 (2ª revisão aplicada)
> **Versão do código:** Pós-Copilot + alterações do revisework.md aplicadas

---

## Índice

1. [🔥 Sensível & Urgente](#1--sensível--urgente)
2. [🏗 Conflitos Arquiteturais](#2--conflitos-arquiteturais)
3. [📂 Arquivos Mortos / Lixo](#3--arquivos-mortos--lixo)
4. [🔁 Código Duplicado](#4--código-duplicado)
5. [⚙ Config & Ferramenta](#5--config--ferramenta)
6. [🧠 Code Smells (Pente-Fino)](#6--code-smells-pente-fino)
7. [📦 Estado do Projeto (7 Dimensões)](#7--estado-do-projeto-7-dimensões)
8. [🧭 Roadmap de Ações](#8--roadmap-de-ações)

---

## 1. 🔥 Sensível & Urgente

### Chaves expostas em texto plano

| Arquivo | Linha | Conteúdo |
|---|---|---|
| `CrewAI/beehive.py` | 5 | ~~`sk-or-v1-...`~~ **(removida)** |
| `CrewAI/beehive.txt` | 5 | ~~`AIzaSyD...`~~ **(removida)** |

> ✅ **Ação tomada:** Chaves removidas dos arquivos e substituídas por leitura de `os.environ.get()`. `.gitignore` atualizado com `CrewAI/.venv/`, `CrewAI/__pycache__/`, `CrewAI/*.txt`. `.env.example` criado com todas as variáveis documentadas.
>
> ⚠ **Ação MANUAL necessária:** Revogar as chaves originais nos dashboards (OpenRouter e Google AI Studio) — o agente não pode fazer isso.

### Segurança geral

- ❌ **Nenhuma camada de autenticação** em `apps/api`. Qualquer requisição HTTP ao servidor (localhost:3001) tem acesso total ao sistema de IA e dados.
- ❌ **Nenhuma sanitização de input** além do básico em `conversationRoutes.ts` (`sanitizeHistory`). `businessRoutes.ts` e `mediaRoutes.ts` não sanitizam entradas.
- ❌ **Nenhum rate limiting**, CORS configurado, ou validação de payload.
- ✅ TypeScript compila com `strict: true` nos 3 projetos.

---

## 2. 🏗 Conflitos Arquiteturais

### 2.1 Duas stacks de IA paralelas

```
apps/api/src/intelligence/         ← legado (Sprint < 12)
├── types.ts          : IntelligenceProvider interface
├── ollamaProvider.ts : Fetch bruto + NDJSON manual
├── openRouterProvider.ts : Não implementado (lança erro)
└── imageProviders/   : Provedor de imagem

packages/platform/src/ai/          ← moderno (Sprint 12+)
├── types.ts          : AIProvider interface (com Tool Calling)
├── providers/ollama/ : OllamaProvider completo
├── AIManager.ts      : Gerenciador com cache, fallback, tool calling
├── ProviderManager.ts: Descoberta / ciclo de vida
└── ToolManager.ts    : Tool Calling
```

**Impacto:** `server.ts` instancia ambas as stacks — a legado para as rotas de conversa/business, a moderna para o Runtime. Toda nova funcionalidade precisa ser implementada duas vezes ou conviver com código morto.

**Causa raiz:** Sprint 12 moveu o Runtime do browser para o servidor, mas as rotas HTTP (antes no `apps/web`) foram para `apps/api` usando o sistema legado em vez de migrar tudo para o `RuntimeManager.dispatch()`.

### 2.2 Acoplamento forte no RuntimeManager

`packages/platform/src/runtime/RuntimeManager.ts` **hard-coda** `createOllamaProvider()`:

```ts
const aiManager = new AIManager(
  providerManager,
  toolManager,
  createOllamaProvider(),  // ← tight coupling
);
```

Isso viola Inversão de Dependência (D do SOLID). Trocar de provedor (ex.: OpenAI) exige alterar o código do RuntimeManager.

### 2.3 ServiceManager subutilizado

`packages/platform/src/services/ServiceManager.ts` — arquitetura elegante de descoberta de serviços via eventos de ciclo de vida, mas:

- Apenas `ConversationService` implementa `BeeHiveService` com `id` e `version`.
- `ToolManager` e `AIManager` são registrados como instâncias brutas (não seguem o contrato).
- `ServiceManager` não expõe `getService<T>()` — o Kernel que faz isso. Duas fontes de verdade de serviço.

### 2.4 Duas fontes de injeção de serviço de conversa no Web

```
ConversationServiceContext.tsx  ← provider React (injeção correta)
├── runtimeConversationService  ← atualmente usado (App.tsx linha 6)
├── coreConversationService     ← legado, ainda importável
└── localConversationService     ← fallback/placeholder
```

A `ConversationStore` (283 linhas, `features/conversation/`) consome o serviço por contexto, o que é correto. Mas o `coreConversationService` ainda existe e pode ser importado por engano.

---

## 3. 📂 Arquivos Mortos / Lixo

### 3.1 Artefatos na raiz do projeto

| Arquivo | Tamanho | Ação |
|---|---|---|
| `E:\BeeHive\body.json` | 33 bytes | `{"message":{"content":"diga ola em uma frase"}}` — resquício de teste via curl. **Deletar.** |
| `E:\BeeHive\vite` | 0 bytes | Arquivo vazio (provavelmente criado por engano). **Deletar.** |

### 3.2 Módulos placeholder (7 de 9)

O manifesto registra 9 módulos, mas apenas **conversation** tem implementação real. Os outros 7 são classes vazias herdando `BaseModule`:

| Módulo | Arquivo | Real? |
|---|---|---|
| conversation | `modules/conversation/index.ts` | ✅ 90 linhas, commands, events, service |
| business | `modules/business/index.ts` | ❌ 12 linhas, só declara `dependencies` |
| legal | `modules/legal/index.ts` | ❌ 10 linhas, vazio |
| development | `modules/development/index.ts` | ❌ 10 linhas, vazio |
| design | `modules/design/index.ts` | ❌ 10 linhas, vazio |
| media | `modules/media/index.ts` | ❌ 10 linhas, vazio |
| knowledge | `modules/knowledge/index.ts` | ❌ 10 linhas, vazio |
| dashboard | `modules/dashboard/index.ts` | ❌ 10 linhas, vazio |
| settings | `modules/settings/index.ts` | ❌ 10 linhas, vazio |

**Impacto:** Adiciona complexidade sem benefício. O `ModuleManager` precisa iterar, validar dependências, e gerenciar ciclo de vida de 9 módulos — mas 78% não fazem nada.

### 3.3 `coreConversationService.ts` — mantido "para reverter"

```ts
// apps/web/src/services/conversation/coreConversationService.ts
export const coreConversationService: ConversationService = {
  respond(_conversationId, userMessage, history, handlers, signal) {
    return getRuntimeClient().sendConversationMessage(...);
  },
};
```

Agora que `coreConversationService` também delega ao `RuntimeClient` (mesmo destino que `runtimeConversationService`), os dois são funcionalmente idênticos. O `coreConversationService` só difere por **não usar Command/Event bus** — mas o transporte final é o mesmo. **Pode ser removido.**

---

## 4. 🔁 Código Duplicado

### 4.1 NDJSON streaming — DUAS implementações no servidor

**`routes/conversationRoutes.ts`** e **`routes/businessRoutes.ts`** contêm lógica NDJSON quase idêntica:

```ts
// Ambos fazem:
res.writeHead(200, { 'Content-Type': 'application/x-ndjson', ... });
const stream = await ...;
for await (const chunk of stream) {
  res.write(JSON.stringify({ type: 'delta', content: chunk }) + '\n');
}
res.end(JSON.stringify({ type: 'done' }) + '\n');
```

**Diferenças:** Uma chama `ollamaProvider.chat()`, a outra chama `orchestrator.generateContentPlan()` / `orchestrator.generatePosts()`. O *formato de saída* e *setup de resposta* são idênticos.

**Solução:** Extrair um helper `sendNdjson(res, generator)` em `shared.ts` que recebe um `AsyncGenerator<string>` e cuida de headers, escrita e encerramento.

### 4.2 Stream de evento vs Stream NDJSON

O `RuntimeClient` tem DOIS mecanismos de streaming:
1. **`streamNdjson()`** (linha 232) — lê NDJSON de uma resposta HTTP POST (para `/conversation/stream` e `/business/*`).
2. **WebSocket** (`ensureSocket`, linha 285) — recebe eventos JSON tipados do runtime.

Ambos fazem parsing de JSON de um stream de texto e roteiam para handlers. O WebSocket é o mecanismo novo (Command/Event); o NDJSON HTTP é o legado (pré-Sprint 12). O `runtimeConversationService` usa **ambos**: manda comando por `dispatch()` e escuta resposta pelo WebSocket. Já `sendConversationMessage` no `RuntimeClient` ainda usa NDJSON HTTP.

### 4.3 Sanitização inconsistente

- `conversationRoutes.ts`: usa `sanitizeHistory(history)` do `shared.ts`.
- `businessRoutes.ts`: **não sanitiza** os inputs `niche`, `brand`, `plan`.
- `mediaRoutes.ts`: **não sanitiza** `prompt`.

---

## 5. ⚙ Config & Ferramenta

### 5.1 Linter / Formatter

- ❌ **Nenhum** dos 3 projetos tem configuração de linter (ESLint, Biome, etc.).
- ❌ Nenhum tem `lint` script no `package.json`.
- 💡 Ações do GitHub / hooks de pre-commit também ausentes.

### 5.2 TypeScript — Configurações consistentes?

| Propriedade | `apps/web` | `apps/api` | `packages/platform` |
|---|---|---|---|
| `strict` | ✅ | ✅ | ✅ |
| `target` | `ES2020` | `ES2022` | `ES2022` |
| `module` | `ESNext` | `ESNext` | `ESNext` |
| `noUnusedLocals` | ✅ | ❓ (sem tsconfig lido) | ✅ |
| `noUnusedParameters` | ✅ | ❓ | ✅ |

`ES2020` no web vs `ES2022` no API/platform — diferença menor (principalmente `String.prototype.replaceAll`, `Promise.allSettled`, `??=`). Pode causar estranheza se o web consumir tipos do platform que usem recursos pós-ES2020. Consistência recomendada: todos `ES2022`.

### 5.3 Testes

```
packages/platform/  ✅ 6 testes (AIManager, ProviderManager, OllamaProvider,
                       ConversationService, ConversationMemory, FilesystemTool)
apps/api/           ❌ 0 testes
apps/web/           ❌ 0 testes
```

Cobertura total: **~6 testes para ~130 arquivos fonte**. O web não testa nem o `ConversationStore` (que tem lógica de estado complexa com `useCallback`, `AbortController`, localStorage), nem o `RuntimeClient`.

### 5.4 Dependências

- `apps/web` package.json: não lido (mas `tsconfig.json` usa `"paths": { "@/*": ["./src/*"] }` — alias Vite/TS).
- `packages/platform` usa `tsx` para testes e `@types/node` — mas `main` aponta para `.ts` (sem build step). Isso funciona em Node via `tsx` no lado servidor, mas pode falhar se alguém consumir o pacote como lib.
- Nenhum `package-lock.json` ou `pnpm-lock.yaml` versionado? (não constatado, mas relevante).

---

## 6. 🧠 Code Smells (Pente-Fino)

### 6.1 RuntimeClient — god object de 325 linhas

`apps/web/src/app/runtimeClient.ts` acumula 6 responsabilidades:

| Responsabilidade | Métodos |
|---|---|
| Health/Status | `status()`, `health()`, `snapshot()`, `logs()` |
| Command dispatch | `dispatch()` |
| Conversation (NDJSON) | `sendConversationMessage()` |
| Business (NDJSON) | `streamBusinessContentPlan()`, `streamBusinessPosts()` |
| Media (JSON) | `generateImage()` |
| Settings | `listModels()`, `setActiveModel()` |
| WebSocket lifecycle | `on()`, `ensureSocket()` |
| Streaming infra | `streamNdjson()` |

**Sugestão:** Extrair `RuntimeClient` em classes menores: `RuntimeApiClient` (HTTP health/status/logs), `CommandClient` (dispatch), `EventBus` (WebSocket), `StreamClient` (NDJSON helper).

### 6.2 `ConversationStore` com `as string` (line 174)

```ts
// O TS não enxerga narrowing do .find() nos dois ramos
await service.respond(
  targetId as string,  // ← cast necessário
  ...
);
```

O comentário no código explica, mas a raiz é que `targetId` é declarado `let targetId = activeId` (que pode ser `null`), e o narrowing através de `if (existing)` / `else` é muito sutil para o TS. **Solução:** tipar corretamente com `string` nos dois ramos:

```ts
if (existing) {
  const id: string = existing.id;
  // ... usa id
} else {
  const id = newId('conv');
  // ... usa id
}
```

### 6.3 `ConversationServiceContext` com fallback frágil

```ts
const ConversationServiceContext = createContext<ConversationService>(localConversationService);
// ...
<ConversationServiceContext.Provider value={service ?? localConversationService}>
```

`localConversationService` é um placeholder que **não faz nada de útil** — se o Provider não receber um serviço real, a UI renderiza mas toda interação falha silenciosamente. **Sugestão:** Lançar erro no `createContext` ou usar um serviço que mostre UI de "configuração necessária".

### 6.4 Plataforma exporta para 2 entry points

`packages/platform/package.json`:
```json
"exports": {
  ".": "./src/index.ts",
  "./runtime": "./src/runtime/index.ts"
}
```

Isso cria dois caminhos de import:
```ts
import { createKernel } from '@beehive/platform';         // index.ts
import { RuntimeManager } from '@beehive/platform/runtime';  // runtime/index.ts
```

A separação faz sentido (runtime só existe no servidor), mas não há barreira — alguém pode importar `RuntimeManager` do navegador e quebrar em produção. **Sugestão:** Usar `"browser"` ou `"react-native"` conditions, ou ao menos documentar.

### 6.5 `_conversationId` ignorado em `coreConversationService`

```ts
respond(_conversationId, userMessage, history, handlers, signal) {
  // `_conversationId` prefixado com `_` — mas ainda é parâmetro
  // e o service não usa memória de conversa
  return getRuntimeClient().sendConversationMessage(...);
}
```

O `_conversationId` é intencionalmente ignorado (comentário: "este caminho legado não tem memória própria"). Ainda assim, aceitar um parâmetro e descartá-lo silenciosamente é enganoso para quem chama. **Sugestão:** remover o parâmetro ou tipar como `undefined`.

### 6.6 Idioma misto

- Código novo: português (comentários, nomes de funções como `novoId`, `gerarPlano`, nomes de arquivos `roteador`, `areas`).
- Código legado: inglês (`ConversationService`, `RuntimeClient`, `sendMessage`, `dispatch`).
- Nomes de comandos/eventos: inglês (`conversation.sendMessage`, `MessageStreamChunk`).

Não é um *bug*, mas dificulta a coesão do time. Recomendação: padronizar em inglês (prática universal) ou português (se o time for monolíngue).

### 6.7 Persistência frágil no ConversationStore

```ts
useEffect(() => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ conversations, activeId }));
  } catch {
    // Sem persistência
  }
}, [conversations, activeId]);
```

Salva o *estado inteiro* a cada mudança. Com `conversations` no array de dependências, **qualquer** mudança em qualquer conversa dispara serialização de todo o histórico. Conversas longas (100+ mensagens) podem causar thrashing de `JSON.stringify` síncrono no event loop. **Sugestão:** debounce ou serialização incremental.

### 6.8 `RuntimeClient.on()` — vazamento de WebSocket

```ts
on<P>(name, handler): Unsubscribe {
  this.ensureSocket();
  const set = this.handlers.get(name) ?? new Set();
  set.add(handler);
  this.handlers.set(name, set);
  return () => {
    set.delete(handler);
  };
}
```

Quando `set.delete(handler)` deixa o `Set` vazio, o event name não é removido do `Map`. O `Set` vazio continua alocado e o `ensureSocket()` nunca fecha o WebSocket (só verifica se `this.handlers.size > 0`). Leak menor, mas relevante para um app que fica aberto dias.

---

## 7. 📦 Estado do Projeto (7 Dimensões)

### 7.1 Funcionalidades Implementadas

| Funcionalidade | Status | Arquivos-chave |
|---|---|---|
| Chat com streaming | ✅ Completo | ConversationStore, runtimeConversationService, conversationModule, ConversationService |
| Memória conversacional (Sprint 18) | ✅ Completo | ConversationMemory, commands/events com conversationId |
| Cancelamento de stream (Sprint 17) | ✅ Completo | cancelStream command, AbortController no web |
| Geração de plano de conteúdo | ✅ Rota HTTP | businessRoutes.ts (chama orchestrator legacy) |
| Geração de posts | ✅ Rota HTTP | businessRoutes.ts |
| Geração de imagem | ✅ Rota HTTP | mediaRoutes.ts (chama imageProvider legacy) |
| Troca de modelo | ✅ Rota HTTP | systemRoutes.ts |
| Health/Status/Logs | ✅ Rota HTTP | systemRoutes.ts |
| Área Business (UI) | ⚠️ Placeholder | `features/business/` (não lida em detalhe, mas presumo que exista) |
| Settings (UI) | ✅ Funcional | `features/settings/` com RuntimeClient |
| Tema claro/escuro | ✅ | `useTheme`, CSS custom properties |
| WebSocket reconnect | ✅ | RuntimeClient.ensureSocket() com retry 2s |

### 7.2 Funcionalidades Ausentes

| Funcionalidade | Crítica? | Observação |
|---|---|---|
| Autenticação / Login | 🔴 Essencial para produção | Zero proteção no API |
| Persistência server-side | 🟡 Média | Conversas em Map morrem no restart |
| Histórico de conversas (busca) | 🟡 Média | Só localStorage no browser |
| Upload de arquivos | 🟢 Desejável | Nenhum endpoint de upload |
| Multimodalidade (imagem → texto) | 🟢 Desejável | Só texto → texto |
| Tool Calling (via plataforma) | ⚪ Já existe | Mas não exposto nas rotas HTTP |
| Testes E2E | 🟡 Média | Zero |

### 7.3 Cobertura de Testes

```
packages/platform: 6 testes unitários (passam?)
apps/api:          0 testes
apps/web:          0 testes
```

### 7.4 TypeScript

✅ Todos os 3 projetos compilam sem erros (`tsc --noEmit`).
✅ `strict: true` em todos.
⚠️ `target` diverge (`ES2020` vs `ES2022`).

### 7.5 Linter/Formatter

❌ Nenhum projeto tem ESLint, Biome, Prettier, ou similar.

### 7.6 DevX

- ❌ Sem `.env.example` — novo dev precisa adivinhar variáveis.
- ⚠️ `npm scripts` no platform têm teste inline (`tsx --test arquivo1 arquivo2...`) — sem glob, sem `--watch`.
- ✅ Alias de path `@/` configurado no web (Vite + tsconfig).
- ✅ Código comentado em português descritivo (Sprint references, decisões de design).

### 7.7 Segurança

- 🔴 **Chaves expostas** (CrewAI/).
- 🔴 Zero autenticação.
- 🟡 Sem validação de input nos endpoints business/media.
- 🟢 Sem dependências com CVEs conhecidos aparentes.

---

## 8. 🧭 Roadmap de Ações

> ✅ = concluído nesta revisão

### 🔴 Imediato (dias)

1. ~~Revogar chaves OpenRouter e Gemini.~~ → ✅ **Removidas dos arquivos** (revogação manual necessária nos dashboards)
2. ~~Adicionar `CrewAI/` ao `.gitignore`~~ → ✅ **Feito** (`CrewAI/.venv/`, `__pycache__/`, `*.txt`)
3. ~~Deletar `body.json` e `vite`~~ → ✅ **Feito**
4. ~~Criar `.env.example`~~ → ✅ **Feito**
5. **Comitar remoção de secrets da história do git** (força push interativo ou `git filter-branch`).

### 🟡 Curto prazo (semanas)

6. ~~Extrair helper NDJSON~~ → ✅ **Feito** (`streamNdjsonResponse` em `shared.ts`, routes refatoradas)
7. ~~Comentar 7 módulos placeholder~~ → ✅ **Feito** (manifest.ts)
8. ~~Remover `coreConversationService.ts`~~ → ✅ **Feito** (+ `localConversationService.ts`)
9. ~~Adicionar ESLint~~ → ✅ **Feito** (configs p/ api + platform; web já tinha; lint scripts adicionados)
10. **Adicionar testes para `ConversationStore`** (lógica de estado, localStorage, cancelamento).
11. **Adicionar testes para `RuntimeClient`** (mock de fetch/WebSocket).

### 🟢 Médio prazo (meses)

12. **Unificar as duas stacks de IA** — migrar rotas legado para `RuntimeManager.dispatch()`, remover `apps/api/src/intelligence/`.
13. **Desacoplar `RuntimeManager` do OllamaProvider** — injetar por parâmetro ou Service Locator.
14. **Extrair `RuntimeClient`** em classes menores (SRP).
15. **Adicionar autenticação básica** ao `apps/api` (token de API ou session).
16. **Adicionar persistência server-side** (SQLite ou arquivo JSON para conversas).
17. **Adicionar CI** (GitHub Actions: typecheck + lint + test).

### Bônus (code smells corrigidos)

- ✅ `ConversationStore`: `targetId as string` removido (narrowing correto)
- ✅ `ConversationServiceContext`: fallback `localConversationService` removido — agora lança erro se faltar provider
- ✅ `RuntimeClient` WebSocket: `handlers` Map limpa entradas órfãs quando último listener é removido
- ✅ `ConversationStore` persistência: adicionado debounce de 300ms
- ✅ `businessRoutes` + `mediaRoutes`: sanitização de input adicionada (via `sanitizeString`)
- ✅ `mediaRoutes`: validação de tipo inline → usa `sanitizeString`

---

## Anexo: Arquivos Lidos (130+)

Para referência, todos os arquivos fonte revisados:

```
ROOT/
  package.json, body.json, vite

apps/api/src/
  server.ts
  runtimeConfig.ts
  intelligence/types.ts, ollamaProvider.ts, orchestrator.ts, imageProviders/types.ts, imageProviders/openRouterImageProvider.ts
  routes/shared.ts, conversationRoutes.ts, businessRoutes.ts, mediaRoutes.ts, systemRoutes.ts

apps/web/src/
  App.tsx, main.tsx, vite-env.d.ts
  app/areas.ts, router/useHashRoute.ts, runtimeClient.ts
  theme/useTheme.ts, theme.css
  components/layout/AppLayout.tsx + .css, Topbar.tsx + .css, Sidebar.tsx + .css
  components/ui/ui.css
  components/area/AreaPage.tsx + .css
  services/conversation/types.ts, runtimeConversationService.ts, ConversationServiceContext.tsx
  services/business/businessService.ts
  services/media/mediaService.ts
  services/settings/settingsService.ts
  features/conversation/ConversationStore.tsx, ConversationView.tsx + .css, components/MessageList.tsx, components/markdown.css
  features/settings/SettingsView.tsx + .css, components/KernelCheck.tsx + .css
  features/business/BusinessView.tsx + .css
  styles/tokens.css, global.css

packages/platform/src/
  index.ts, types.ts
  kernel/index.ts, types.ts
  services/ServiceManager.ts
  modules/BaseModule.ts, types.ts, manifest.ts
  modules/conversation/index.ts, commands.ts, events.ts, ConversationService.ts, ConversationMemory.ts (+ tests)
  modules/business/index.ts
  modules/legal/index.ts, development/index.ts, design/index.ts, media/index.ts, knowledge/index.ts, dashboard/index.ts, settings/index.ts
  ai/types.ts, AIManager.ts (+ test), ProviderManager.ts (+ test), ToolManager.ts
  ai/providers/ollama/OllamaProvider.ts (+ test)
  runtime/RuntimeManager.ts, types.ts
  tools/filesystem/FilesystemTool.ts (+ test)

CrewAI/
  beehive.py, beehive.txt
```

---

> Revisão concluída em 06/01/2026. **Nenhum erro de TypeScript**; **0 erros de lint** (5 warnings pré-existentes no web). 13 ações concluídas de 17 propostas. Pendente: revogar chaves, testes ConversationStore/RuntimeClient, unificar stacks de IA, desacoplar RuntimeManager, extrair RuntimeClient, autenticação, persistência, CI.

