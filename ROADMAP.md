# BeeHive OS — Roadmap

> **Regra única:** Nenhuma abstração nova entra no Kernel até que **três plugins diferentes** precisem dela.
>
> A partir deste ponto, todo commit deve responder: *"Isso permite ao BeeHive fazer algo novo para o usuário?"*

---

## Sprint 1 — Browser Plugin ?

**3 capabilities:** `browser.navigate`, `browser.scrape`, `browser.screenshot`
**Definition of Done:** 10/10
**Architecture Score:** 100%
**Kernel changes:** 0

---

## Sprint 2 — Workflow DSL

> **Objetivo:** Provar que qualquer capability pode ser encadeada com qualquer outra apenas através de um WorkflowDefinition, sem código específico.

### Workflow é dado, não código

```yaml
# workflow-summarize.yaml
steps:
  - capability: browser.scrape
    input:
      url: "{{input.url}}"
    output: page

  - capability: chat.generate
    input:
      message: "Resuma: {{page.markdown}}"
    output: summary
```

### WorkflowBuilder

```typescript
WorkflowBuilder.create("summarize", "Summarize")
  .step("scrape", "browser.scrape", { url: "{{input.url}}" }, "page")
  .step("chat", "chat.generate", { message: "{{page.markdown}}" }, "summary")
  .build()
```

### Controles de fluxo (como dados)

- **Condition:** `if: "{{page.length > 5000}}"`
- **Loop:** `foreach: "{{input.urls}}"`
- **Parallel:** execução concorrente de branches
- **Retry:** `retry: { attempts: 3, delay: 5 }`
- **Timeout:** `timeout: 30`

### Scheduler desacoplado

Scheduler apenas emite `WorkflowRequested`. WorkflowRuntime escuta.

### Sprint 2 Demo

```yaml
browser.scrape ? chat.generate ? Artifact(markdown)
```

---

## Sprint 3 — Workflow Studio

> Uma tela (CLI/terminal) que lista workflows, executa, mostra steps, artifacts e eventos.

### Capacidades
- Listar todos os workflows registrados
- Executar um workflow
- Mostrar cada step em tempo real
- Mostrar cada Artifact produzido
- Mostrar a árvore de eventos

---

## Sprint 4 — Content Plugin

### Cadeia completa

```
Tema ? Roteiro (chat.generate) ? Imagem ? Vídeo ? Publisher
```

---

## Sprint 5 — Agent Runtime

> Agente sempre produz um WorkflowDefinition. Nunca chama capabilities diretamente.

```
Agente ? Planeja ? WorkflowDefinition ? WorkflowRuntime ? Capabilities
```

**Vantagem:** Tudo rastreável, reproduzível, editável depois.

---

## Sprinte 6+ — Publisher, Research, Marketing, Finance

---

## Métricas de Sucesso

| Métrica | Meta | Status |
|---------|------|--------|
| Tempo para criar plugin novo | < 30 min | ? < 5 min (scaffolding) |
| Alterações no Kernel | 0 | ? 0 |
| Testes de arquitetura | 100% | ? 10/10 |
| Browser Plugin | 100% | ? 100% |
| WorkflowBuilder | funcional | ? 17/17 testes |
| Workflow Runtime | funcional | ? implementado |
| Content Plugin | imagem + vídeo | ? |
| Agent Runtime | autônomo 3+ caps | ? |

---

## Visão de Longo Prazo

O BeeHive é um **runtime unificado** onde:

- **n8n** ? Workflow Runtime
- **Flowise** ? Pipelines de IA
- **ComfyUI** ? Geração de imagem/vídeo
- **OpenHands** ? Agent Runtime

Tudo sob o mesmo Kernel. Tudo composto por capabilities. Tudo extensível por plugins.
