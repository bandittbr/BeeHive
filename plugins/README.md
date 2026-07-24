# BeeHive Plugins

## 6 Novos Módulos

### 1. AI Manager (`plugins/ai-manager/`)
**Porta:** `3095` · **Package:** `@beehive/plugin-ai-manager`

Gateway unificado de IA. Todos os plugins devem passar por ele em vez de chamar OpenAI/Anthropic/Google diretamente.

**Capabilities:**
- `ai.complete` — chamada completa (não-streaming)
- `ai.stream` — chamada com streaming
- `ai.models.list` — lista modelos disponíveis

**Uso standalone:**
```ts
import { createAIManager } from '@beehive/plugin-ai-manager';
const ai = await createAIManager();
ai.registerProvider('openai', { name: 'openai', models: ['gpt-4'], complete: async (req) => {...} });
await ai.start();
// API: http://localhost:3095/api/ai
```

**Uso como plugin do kernel:**
```ts
// O PluginRegistry descobre automaticamente via plugins/ai-manager/src/plugin.ts
// capabilities registradas: ai.complete, ai.stream, ai.models.list
```

**API REST:**
- `GET /api/ai/health` — health check
- `POST /api/ai/complete` — `{ model, messages, temperature, maxTokens }`
- `GET /api/ai/models` — lista modelos

---

### 2. Memory (`plugins/memory/`)
**Porta:** `3096` · **Package:** `@beehive/plugin-memory`

Memória persistente por projeto. Armazena produtos, campanhas, avatares, prompts, resultados em disco.

**Capabilities:**
- `memory.store` — armazena entrada (`projectId`, `type`, `key`, `value`, `tags`)
- `memory.search` — busca entradas (`projectId`, `type`, `tags`, `limit`)
- `memory.get` — obtém entrada por ID
- `memory.delete` — remove entrada

**Uso standalone:**
```ts
import { createMemory } from '@beehive/plugin-memory';
const mem = await createMemory();
await mem.store({ projectId: 'proj-1', type: 'product', key: 'sku-123', value: { name: 'Produto X' } });
const results = await mem.query({ projectId: 'proj-1', type: 'product' });
await mem.start();
// API: http://localhost:3096/api/memory
```

**API REST:**
- `POST /api/memory/store` — `{ projectId, type, key, value, tags }`
- `GET /api/memory/search?projectId=X&type=product&limit=50`
- `GET /api/memory/:entryId`
- `DELETE /api/memory/:entryId`

---

### 3. Knowledge Base (`plugins/knowledge-base/`)
**Porta:** `3097` · **Package:** `@beehive/plugin-knowledge-base`

RAG (Retrieval-Augmented Generation) com índice invertido e busca full-text. Indexa OCR, STT, scripts, produtos, PDFs.

**Capabilities:**
- `knowledge.index` — indexa documento (`source`, `category`, `title`, `content`, `metadata`)
- `knowledge.search` — busca por relevância (`query`, `limit`)
- `knowledge.stats` — estatísticas da base

**Uso standalone:**
```ts
import { createKnowledgeBase } from '@beehive/plugin-knowledge-base';
const kb = await createKnowledgeBase();
await kb.index({ source: 'ocr', category: 'video', title: 'Vídeo 1', content: 'texto extraído...' });
const results = await kb.search('texto relevante');
await kb.start();
// API: http://localhost:3097/api/knowledge
```

**API REST:**
- `POST /api/knowledge/index` — `{ source, category, title, content, metadata }`
- `GET /api/knowledge/search?q=consulta&limit=10`
- `GET /api/knowledge/stats`

---

### 4. Auth Manager (`plugins/auth-manager/`)
**Porta:** `3098` · **Package:** `@beehive/plugin-auth-manager`

Autenticação e autorização com API keys, sessões e RBAC.

**Capabilities:**
- `auth.authenticate` — autentica por API key
- `auth.validate` — valida sessão
- `auth.key.generate` — gera nova API key

**Uso standalone:**
```ts
import { createAuthManager } from '@beehive/plugin-auth-manager';
const auth = await createAuthManager();
const apiKey = auth.generateApiKey('user-1', ['ai:chat', 'memory:read']);
const session = await auth.authenticate(apiKey);
await auth.start();
// API: http://localhost:3098/api/auth
```

**API REST:**
- `POST /api/auth/authenticate` — `{ apiKey }`
- `POST /api/auth/keys` — `{ userId, permissions }`
- `POST /api/auth/validate` — `{ sessionId }`

---

### 5. Marketplace (`plugins/marketplace/`)
**Porta:** `3099` · **Package:** `@beehive/plugin-marketplace`

Loja de plugins. Escaneia o diretório `plugins/` e lista todos os plugins disponíveis com suas capabilities.

**Capabilities:**
- `marketplace.search` — busca plugins no catálogo
- `marketplace.install` — instala plugin
- `marketplace.uninstall` — desinstala plugin
- `marketplace.installed` — lista instalados

**Uso standalone:**
```ts
import { createMarketplace } from '@beehive/plugin-marketplace';
const store = await createMarketplace();
const plugins = store.search('ai');
await store.start();
// API: http://localhost:3099/api/marketplace
```

**API REST:**
- `GET /api/marketplace/search?q=ai`
- `GET /api/marketplace/installed`

---

### 6. Module Loader (`plugins/module-loader/`)
**Porta:** `3100` · **Package:** `@beehive/plugin-module-loader`

Scanner de diretórios. Descobre plugins que tenham `manifest.yaml` e carrega seus manifests.

**Capabilities:**
- `modules.scan` — escaneia diretório por plugins
- `modules.load` — carrega plugin por nome

**Uso standalone:**
```ts
import { createModuleLoader } from '@beehive/plugin-module-loader';
const loader = new ModuleLoaderModule();
const plugins = await loader.scan('./plugins');
const manifest = await loader.loadManifest('ai-manager', './plugins');
await loader.start();
// API: http://localhost:3100/api/modules
```

**API REST:**
- `POST /api/modules/scan` — `{ directory }`
- `POST /api/modules/load` — `{ name, directory }`

---

## Integração com o Kernel

O kernel descobre plugins automaticamente via `PluginRegistry.scan()`:

```ts
import { Kernel } from '../kernel/Kernel';
const kernel = new Kernel();
const report = await kernel.boot();
// PluginRegistry escaneia plugins/*/src/manifest.yaml
// Para cada um, importa plugin.ts e chama activate(ctx)
// As capabilities são registradas no CapabilityRegistry
```

Para usar as capabilities de qualquer lugar:
```ts
const cap = kernel.capabilities.resolve('ai.complete');
const result = await cap.execute({ model: 'gpt-4', messages: [...] }, executionCtx);
```

## Arquitetura

```
Kernel (intocado)
├── Kernel.ts          → boot(), shutdown(), health()
├── EventBus/          → publish/subscribe
├── CapabilityRegistry → resolve capabilities
├── PluginRegistry     → descobre e ativa plugins
├── WorkflowRuntime    → executa workflows
└── Container/         → DI

Plugins (16)
├── foundation/        → chat.generate, memory.search, tool.execute
├── browser/           → browser.navigate, browser.scrape, browser.screenshot
├── weather/           → weather.current
├── ai-manager/        → ai.complete, ai.stream, ai.models.list       ← NOVO
├── memory/            → memory.store, memory.search, memory.get      ← NOVO
├── knowledge-base/    → knowledge.index, knowledge.search            ← NOVO
├── auth-manager/      → auth.authenticate, auth.validate             ← NOVO
├── marketplace/       → marketplace.search, marketplace.install      ← NOVO
├── module-loader/     → modules.scan, modules.load                   ← NOVO
├── influencer-downloader/  → download de vídeos
├── avatar-studio/     → face swap, lip sync
├── product-intelligence/   → OCR, STT, detecção de produtos
├── event-bus/         → barramento de eventos
├── job-manager/       → fila de jobs
└── assets/            → gerenciamento de assets
```

## Invariantes Respeitados

| Invariante | Status |
|---|---|
| INV-1: Kernel não conhece Providers | ✅ Kernel intacto |
| INV-2: Plugins não importam kernel | ✅ Só `@beehive/sdk` |
| INV-3: Providers são intercambiáveis | ✅ Via `ctx.providers` |
| INV-4: Core sem domínio | ✅ Zero lógica de negócio |
| INV-5: SDK é API pública | ✅ `@beehive/sdk` apenas |
| INV-6: Capability ≠ Implementação | ✅ Capability roteia para provider |