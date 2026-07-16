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

## Sprint 4 — Validação e Ecossistema (atual)

> O gargalo deixou de ser técnico. Agora é: **quem vai usar isso?**

### Foco

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
| Validar com usuários reais | ⏳ |
| Workflow campeão (OAB Short ou Shopee) | ⏳ |
| Demo vídeos (30-60s) | ⏳ |

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

## Sprint 5 — Workflows de Valor

> Objetivo: "Um usuário consegue criar um ativo digital em um único comando."

### Candidatos a workflow campeão

1. **Short OAB** — Tema → Roteiro (chat.generate) → Imagens → Vídeo → Legendas → Hashtags
2. **Shopee Affiliate** — Produto → Pesquisa → Roteiro → Vídeo → Thumbnail → Descrição → Publicação
3. **Daily Briefing** — Notícias de 3 categorias → Resumo → Briefing formatado

### Critério de seleção

O primeiro workflow que fizer alguém dizer **"eu pagaria por isso"** define o Sprint 5.

---

## Sprint 6+ — Agent Runtime, Publisher, Expansão

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
| Benchmark | documentado | ✅ benchmarks/RESULTS.md |
| DX Scorecard | documentado | ✅ benchmarks/DX.md |
| Contributing guide | publicado | ✅ CONTRIBUTING.md |
| Plugin guide | publicado | ✅ docs/plugin-development.md |
| SDK tutorial | publicado | ✅ docs/sdk-tutorial.md |
| Validação externa | N users | ⏳ |
| Workflow campeão | 1 resolvendo problema real | ⏳ |

---

## Visão de Longo Prazo

O BeeHive é um **runtime unificado** onde:

- **n8n** → Workflow Runtime
- **Flowise** → Pipelines de IA
- **ComfyUI** → Geração de imagem/vídeo
- **OpenHands** → Agent Runtime

Tudo sob o mesmo Kernel. Tudo composto por capabilities. Tudo extensível por plugins.
