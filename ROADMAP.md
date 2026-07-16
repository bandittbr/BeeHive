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

## Sprint 5 — Ecosystem Validation

> Objetivo: Provar que **terceiros conseguem criar aplicações e plugins** sobre o BeeHive
> sem modificar a plataforma.

### Entregas

| Entrega | Descrição | Status |
|---------|-----------|--------|
| E1 | External app fora do monorepo (`examples/integrations/hello-world-app/`) | ✅ |
| E2 | External plugin fora do monorepo (`examples/integrations/external-weather-plugin/`) | ✅ |
| E3 | SDK publicado como dependência (`@beehive/sdk`) | ✅ (workspace) |
| E4 | Documentação da Developer Surface | ✅ |
| E5 | Guia "Build your first BeeHive app" | ✅ |
| E6 | Plugin `weather.current` descoberto automaticamente | ✅ |
| E7 | Aplicação executa workflows sem importar Kernel | ✅ |

### Regra

> Esta Sprint termina quando um terceiro puder criar uma aplicação BeeHive apenas com `npm install @beehive/sdk`.

---

## Sprint 6A — Plugin Reliability ✅

> Objetivo: Todo plugin deve saber reportar sua própria saúde. Pronto, degradado ou indisponível — com diagnóstico e cura.

### Entregas

| Entrega | Descrição | Status |
|---------|-----------|--------|
| R1 | `CapabilityReadiness` — ready / degraded / unavailable | ✅ |
| R2 | `readiness()` no SDK (Capability class) | ✅ |
| R3 | Browser Plugin v1.1: health check próprio | ✅ |
| R4 | manifest.yaml com `requirements:` (runtime, dependencies, setup) | ✅ |
| R5 | `pnpm browser:setup` — instala Chromium | ✅ |
| R6 | `pnpm plugin doctor` — diagnóstico de plugin | ✅ |
| R7 | Health Dashboard v2 — readiness + repair suggestions | ✅ |
| R8 | Nenhuma alteração no Kernel | ✅ |

### Aprendizado

> O erro de Chromium ausente foi tratado **dentro do plugin**.
> O Kernel nunca soube que existia um problema.
> O restante do BeeHive (6/7 capabilities) continuou funcionando.
> Esse é o comportamento esperado de um sistema operacional.

---

## Sprint 6 — Real Capability Providers

> Objetivo: Trocar mocks por implementações reais **sem mudar nada acima**.
>
> Prova de ouro: workflow, app, SDK e Kernel permanecem idênticos.

### Estrutura de Providers

```
providers/
 ├── ai/
 │    ├── openai           → chat.generate
 │    ├── ollama           → chat.generate
 │    └── anthropic        → chat.generate
 │
 ├── browser/
 │    └── playwright       → browser.scrape (já existe)
 │
 └── storage/
      ├── filesystem
      └── s3
```

### Entregas

| Entrega | Descrição | Status |
|---------|-----------|--------|
| P1 | Provider Registry — estrutura para múltiplos motores por capability | ⏳ |
| P2 | `chat.generate` com provider real (OpenRouter/Gemini API) | ⏳ |
| P3 | `pnpm test:workflows` continua 14/14 com providers reais | ⏳ |
| P4 | Nenhuma alteração em Kernel, SDK, ou workflows existentes | ⏳ |
| P5 | Capability Health Dashboard | ⏳ |

### Regra

> Esta Sprint termina quando um workflow executado com mocks produz o mesmo resultado com providers reais,
> sem que nenhuma linha de código acima do provider tenha sido alterada.

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
| Examples (generic) | 5+ executáveis | ✅ 5 |
| Examples (integrations) | 2+ (app + plugin externos) | ✅ hello-world-app + weather-plugin |
| External app sem importar Kernel | funcional | ✅ hello-world-app |
| External plugin descoberto | funcional | ✅ weather.current |
| Ecosystem Proof | validado | ✅ Sprint 5 |
| Capability Readiness | ready/degraded/unavailable | ✅ Sprint 6A |
| Plugin Doctor | diagnostico | ✅ Sprint 6A |
| Health Dashboard v2 | readiness + repair | ✅ Sprint 6A |
| Browser Plugin v1.1 | health check + setup | ✅ Sprint 6A |
| Plugin creation time | < 30 min | ✅ < 5 min |
| Public API documentada | public-api.md, sdk-reference.md, compatibility.md | ✅ |
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
