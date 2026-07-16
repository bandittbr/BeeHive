# BeeHive Benchmarks

## Performance

| Métrica | min | avg (5 iterações) |
|---------|-----|-------------------|
| Kernel boot (cold) | 7ms | 331ms |
| Kernel boot (warm) | 6ms | 11ms |
| Workflow 1 step (mock) | 0ms | 1ms |
| Workflow 3 steps (mock) | 0ms | 0ms |
| Capability resolution | <0.01ms | <0.01ms |
| Memory (heap) | 45MB | — |
| Memory (rss) | 169MB | — |

## DX

| Métrica | Valor |
|---------|-------|
| Core source | 95 files, 3468 lines |
| Browser plugin (referência) | 14 files, 461 lines |
| Foundation plugin | 9 files, 198 lines |
| 100 workflows via Builder | 4ms |
| Exemplo hello-workflow | 3.3s |
| `pnpm test:workflows` | 3.0s (14/14) |

## Comparativo

```
2026-07-16: Linha de base estabelecida
```

Para re-executar:
```bash
pnpm benchmark      # performance
pnpm benchmark:dx   # DX scorecard
```
