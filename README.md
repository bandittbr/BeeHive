# BeeHive

Sistema Operacional de Inteligência Artificial — modular, extensível por plugins, com workflows como dados.

## Fase atual: Produto

O BeeHive passou por três fases:

1. **Ideia** — "Reunir vários projetos de IA em um só lugar"
2. **Arquitetura** — Kernel congelado + SDK + plugins + workflows como dados ✅
3. **Produto** — Workflows que resolvem problemas reais ⬅️ **AQUI**

## Maturidade da Plataforma

| Área | Status |
|------|--------|
| Kernel | ✅ Stable |
| SDK | ✅ Stable |
| Plugin System | ✅ Stable |
| Workflow Runtime | ✅ Stable |
| Provider Abstraction | ✅ Stable |
| Real Providers | 🚧 In Progress |
| Agent Runtime | ⏳ Planned |

## Regra

> Toda Sprint deve terminar com um **workflow novo que um usuário consiga executar.**

Não importa se é pequeno. Não importa se usa mocks. O importante é que exista uma nova capacidade observável.

## Estrutura

```
BeeHive/
├── kernel/              # Kernel congelado (não mexer sem 3 plugins pedirem)
├── plugins/             # Plugins (browser, foundation, ...)
├── packages/
│   ├── sdk/             # @beehive/sdk — única dependência para plugins
│   └── shared/          # @beehive/shared — tipos e contratos
├── examples/            # Workflows executáveis (vitrine)
│   ├── hello-workflow/
│   ├── summarize-website/
│   ├── youtube-script/
│   ├── daily-news/
│   └── research-company/
├── case-studies/        # Casos de uso externos (exemplos de aplicações)
├── tools/               # CLI tools
├── runtime/             # Runtime Services (ProviderRegistry, ProviderRouter)
├── tests/               # Tests organized by responsibility
│   ├── architecture/    # Invariants (kernel-boundaries, provider-swap)
│   ├── plugins/         # Plugin-specific tests
│   ├── workflows/       # Workflow integration tests
│   └── providers/       # Provider-specific tests
├── benchmarks/          # Métricas de performance e DX
└── docs/                # Documentação
```

## Começando

```bash
pnpm install
pnpm test:architecture       # 10/10 testes de contrato
pnpm test:kernel-boundaries  # 4/4 invariants verificados
pnpm test:provider-swap      # 10/10 prova de abstração
pnpm test:workflows          # 14/14 testes de workflow com mocks
pnpm example:hello           # Executa o workflow mais simples
pnpm workflow:studio         # CLI interativo
pnpm doctor                  # System Doctor completo
```

## Documentação

- [Plugin Development Guide](docs/plugin-development.md) — Como criar um plugin do zero
- [SDK Tutorial](docs/sdk-tutorial.md) — Todos os builders e tipos
- [Capability Store](docs/capability-store.md) — Capabilities do ecossistema
- [Benchmarks](benchmarks/index.md) — Performance e DX
- [Arquitetura](ARCHITECTURE.md) — Documento mestre
- [Invariantes](ARCHITECTURE_INVARIANTS.md) — Regras que nunca podem ser quebradas
- [Roadmap](ROADMAP.md) — Próximos sprints

## Benchmarks atuais

| Métrica | Valor |
|---------|-------|
| Kernel boot (mediana) | 8ms |
| Workflow 1 step | 1ms |
| Workflow 3 steps | 0ms |
| Memória (heap) | 45MB |
| Core source | 95 files, 3468 lines |
| Plugin browser | 14 files, 461 lines |
| Workflow tests | 14/14 |

## Licença

MIT
