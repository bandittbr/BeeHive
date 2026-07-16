# Product Metrics

Métricas que medem se o BeeHive está resolvendo problemas reais.

## Baseline

Estabelecida em 2026-07-16 com mocks.

| Métrica | Meta | Atual | Nota |
|---------|------|-------|------|
| Workflow execution time | < 60s | < 1s (mock) | Real dependerá de APIs externas |
| Workflow success rate | > 95% | 100% (14/14) | Todos com mock |
| Cost per execution | < R$ 0,10 | R$ 0,00 (mock) | Depende do provider LLM |
| Time saved per workflow | > 30 min | — | A medir com usuários |
| Manual interventions | 0 | 0 | Workflows são determinísticos |
| Plugins criados | — | 2 (browser, foundation) | |
| Workflows executáveis | — | 5 (hello, summarize, youtube, news, research) | |
| Examples rodando | — | 5 | |

## Como medir

```bash
pnpm benchmark              # performance
pnpm benchmark:dx           # DX
pnpm test:workflows         # taxa de sucesso dos workflows
pnpm example:hello          # tempo de execucao real
```

## Painel de produto (ideal)

Quando o BeeHive tiver um backend persistente:

- Workflows executados (total/dia)
- Taxa de sucesso por workflow
- Custo médio por execução
- Tempo médio de execução
- Usuários ativos
- Plugins instalados

## Próxima métrica a capturar

Tempo de execução real (não mock) do workflow `youtube-script` com um LLM real (OpenRouter/Gemini).
