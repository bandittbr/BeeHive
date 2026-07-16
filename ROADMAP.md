# BeeHive OS — Roadmap

> **Regra única:** Nenhuma abstração nova no Kernel até que **três plugins diferentes** precisem dela.
>
> A partir deste ponto, todo commit deve responder: *"Isso permite ao BeeHive fazer algo novo para o usuário?"*

---

## Sprint 1 — Browser Plugin ✅

**3 capabilities:** `browser.navigate`, `browser.scrape`, `browser.screenshot`
**Definition of Done:** 10/10 | **Architecture Score:** 100% | **Kernel changes:** 0

---

## Sprint 2 — Workflow DSL ✅

Workflow é **dado**, não código. WorkflowBuilder fluente para criar WorkflowDefinitions.
Workflow Runtime interpreta steps com suporte a condition, foreach, parallel, retry, timeout.
17/17 testes | E2E funcional | Template resolution operante

---

## Sprint 3 — Workflow Studio ✅

CLI interativo: `pnpm workflow:studio`
Comandos: `list`, `run`, `inspect`, `instances`, `events`
Eventos de ciclo de vida: started, step:started, step:completed, completed, paused, resumed, cancelled

---

## Sprint 4 — Validação e Ecossistema ✅

| Ação | Status |
|------|--------|
| Benchmarks (boot, runtime, memória) | ✅ |
| DX Scorecard (arquivos, linhas, tempo) | ✅ |
| CONTRIBUTING.md | ✅ |
| Plugin Development Guide | ✅ |
| SDK Tutorial | ✅ |
| MockAdapter para testes sem API externa | ✅ |
| `examples/` vitrine (5 workflows executáveis) | ✅ |
| `pnpm test:workflows` (14/14) | ✅ |

### Status atual

```
Benchmark               min     avg
kernel.boot             7ms    331ms (1a fria)
workflow.simple         0ms    1ms
workflow.3steps         0ms    0ms
memory.heapUsed         45MB
memory.rss              169MB

DX
plugins/browser         14 files, 461 lines (referencia)
plugins/foundation      9 files, 198 lines
core source             95 files, 3468 lines
pnpm test:workflows     3.0s (7 workflows, 14 assertions)
```

---

## Sprint 5 — Content Automation Workflow

> Objetivo: Provar que o BeeHive orquestra **múltiplas modalidades** (texto, imagem, vídeo)
> em um único workflow sem tocar no Kernel.

### Workflow

```
Tema
  ↓  chat.generate — Pesquisa
  ↓  chat.generate — Roteiro
  ↓  image.generate — Imagens do vídeo
  ↓  video.generate — Montagem final
  ↓  Artifact(video)
```

### Marcos

| Marco | O que entrega | Status |
|-------|---------------|--------|
| M1 | `image.generate` — capability genérica (prompt → imagem) | ⏳ |
| M2 | `video.generate` — capability genérica (cenas → vídeo) | ⏳ |
| M3 | Workflow executável fim-a-fim com mocks | ⏳ |
| M4 | Adapter real para pelo menos uma capability | ⏳ |
| M5 | `pnpm example:content-video` — um comando | ⏳ |

### Regra

> Esta Sprint termina quando existir um workflow multimodal executável por qualquer usuário.

---

## Sprint 6 — Adapters Reais

| Capability | Adapter alvo | Prioridade |
|------------|-------------|------------|
| `chat.generate` | OpenRouter / Gemini API | Alta |
| `image.generate` | Stability AI / Replicate | Alta |
| `browser.scrape` | Playwright (já existe) | ✅ |
| `video.generate` | FFmpeg + TTS engine | Média |

---

## Sprint 7+ — Agent Runtime, Publisher, Expansão

```
Agente → Planeja → WorkflowDefinition → WorkflowRuntime → Capabilities
```

Tudo rastreável, reproduzível, editável depois.

---

## Métricas de Sucesso

| Métrica | Meta | Status |
|---------|------|--------|
| Kernel boot (mediana) | < 50ms | ✅ 8ms |
| Kernel changes por plugin | 0 | ✅ 0 |
| Testes de arquitetura | 100% | ✅ 10/10 |
| Browser Plugin | 100% | ✅ 100% |
| WorkflowBuilder | funcional | ✅ 17/17 |
| Workflow Runtime | funcional | ✅ implementado |
| Workflow Tests | 14+ | ✅ 14/14 |
| Examples | 5+ executáveis | ✅ 5 |
| Plugin creation time | < 30 min | ✅ < 5 min |
| Benchmark | documentado | ✅ benchmarks/ |
| DX Scorecard | documentado | ✅ benchmarks/ |
| Product Metrics | documentado | ✅ benchmarks/ |
| Contributing guide | publicado | ✅ CONTRIBUTING.md |
| Plugin guide | publicado | ✅ docs/plugin-development.md |
| SDK tutorial | publicado | ✅ docs/sdk-tutorial.md |
| Fase 2 (Arquitetura) | completa | ✅ |
| Fase 3 (Produto) | iniciada | ⬅️ |
| Content Automation WF | executável fim-a-fim | ⏳ Sprint 5 |

---

## Visão de Longo Prazo

O BeeHive é um **runtime unificado** onde:

- **n8n** → Workflow Runtime
- **Flowise** → Pipelines de IA
- **ComfyUI** → Geração de imagem/vídeo
- **OpenHands** → Agent Runtime

Tudo sob o mesmo Kernel. Tudo composto por capabilities. Tudo extensível por plugins.
