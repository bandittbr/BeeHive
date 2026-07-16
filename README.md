# BeeHive

Sistema Operacional de Inteligência Artificial — modular, extensível por plugins, com workflows como dados.

## Fase atual: Execution

O BeeHive encerrou a fase de fundação. Agora medimos progresso por **valor entregue**, não por arquitetura.

### Regras da fase

> O Kernel continua congelado.
> O SDK continua estável.
> A arquitetura só muda se um Hard Invariant realmente exigir.

### Architecture Budget

> Em cada sprint, no máximo **10%** do esforço pode ser gasto em infraestrutura.
> Os outros **90%** devem entregar capabilities, providers, plugins ou aplicações que gerem valor ao usuário.

### Regra de commit

> Nenhum commit é aceito apenas porque melhora a arquitetura.
> Todo commit deve responder a uma destas perguntas:
> - Adiciona uma capability?
> - Adiciona um provider?
> - Adiciona um plugin?
> - Melhora uma capability existente?
> - Melhora a experiência do usuário?

### Métricas de progresso

| Métrica | Atual | Meta |
|---------|-------|------|
| Plugins funcionais | 3 | 10 |
| Providers reais | 0 | 5 |
| Capabilities reais | 7 | 25 |
| Workflows prontos | 7 | 20 |
| Aplicações externas | 2 | 5 |

### Fases do BeeHive

```
Fase 1  Arquitetura     ✅ concluída
Fase 2  Governança      ✅ concluída
Fase 3  Plataforma      ✅ concluída
Fase 4  Execution       ⬅️ AQUI
Fase 5  Ecosystem       ⏳
```

### Mapeamento de fases

- **Execution** — o BeeHive começa a executar IA de verdade (providers reais, capabilities completas)
- **Ecosystem** — plugins da comunidade, aplicações externas, providers de terceiros, templates, workflows compartilhados

## Maturidade da Plataforma

| Área | Status |
|------|--------|
| Kernel | ✅ Stable |
| SDK | ✅ Stable |
| Plugin System | ✅ Stable |
| Workflow Runtime | ✅ Stable |
| Provider Abstraction | ✅ Stable |
| Architecture | ✅ Frozen |

> **Architecture Status: Frozen**
>
> The BeeHive architecture is considered stable. Future work focuses on capabilities, providers, plugins, workflows and user experience. Changes to the architecture require justification through a Hard Invariant violation or repeated needs across real implementations.

## Maturidade das Capabilities

| Capability | Estado |
|------------|--------|
| chat.generate | 🟢 Stable (mock) |
| memory.search | 🟢 Stable (mock) |
| tool.execute | 🟢 Stable (mock) |
| browser.navigate | 🟢 Stable (playwright) |
| browser.scrape | 🟢 Stable (playwright) |
| browser.screenshot | 🟢 Stable (playwright) |
| weather.current | 🟢 Stable (mock) |
| image.generate | 🟡 Planned |
| video.generate | 🟡 Planned |
| audio.generate | ⚪ Not Started |

## Roadmap

### AI Providers

| Provider | Status |
|----------|--------|
| OpenRouter | 🟡 Planned |
| Ollama | 🟡 Planned |
| Gemini | ⚪ Not Started |
| OpenAI | ⚪ Not Started |
| Anthropic | ⚪ Not Started |

### Browser

| Capability | Status |
|------------|--------|
| browser.navigate | 🟢 Stable |
| browser.scrape | 🟢 Stable |
| browser.screenshot | 🟢 Stable |
| browser.login | ⚪ Not Started |
| browser.cookies | ⚪ Not Started |
| browser.sessions | ⚪ Not Started |

### Media

| Capability | Status |
|------------|--------|
| image.generate | 🟡 Planned |
| video.generate | 🟡 Planned |
| audio.generate | ⚪ Not Started |
| subtitle.generate | ⚪ Not Started |

### Automation

| Feature | Status |
|---------|--------|
| scheduler | ⚪ Not Started |
| webhook trigger | ⚪ Not Started |
| cron trigger | ⚪ Not Started |
| queue | ⚪ Not Started |

### Agents

| Feature | Status |
|---------|--------|
| memory | 🟡 Planned |
| planning | ⚪ Not Started |
| multi-agent | ⚪ Not Started |
| long-running tasks | ⚪ Not Started |

## KPIs de Progresso

| Métrica | Atual | Meta |
|---------|-------|------|
| Capabilities Stable | 7 | 25 |
| Providers Reais | 0 | 5 |
| Plugins Externos | 1 | 10 |
| Aplicações Externas | 2 | 10 |

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
