# Contribuindo com o BeeHive

BeeHive é um ecossistema de plugins sobre um kernel mínimo e congelado. Toda contribuição que não altera o kernel é bem-vinda.

## Código de Conduta

Seja respeitoso. Discuta ideias, não pessoas.

## Como contribuir

### 1. Reportando bugs

Abra uma issue descrevendo:
- O que você esperava que acontecesse
- O que realmente aconteceu
- Como reproduzir (comando, input, erro)

### 2. Sugerindo capabilities ou workflows

Abra uma issue com:
- Descrição do workflow (entrada → steps → saída)
- Quais capabilities existentes seriam usadas
- Quais capabilities novas seriam necessárias

### 3. Criando um plugin novo

```bash
pnpm create plugin
# Siga as instruções interativas
```

O scaffolding gera toda a estrutura. Depois:

```bash
pnpm validate plugin <nome>
pnpm test --workspace plugins/<nome>
```

Veja o [Plugin Development Guide](docs/plugin-development.md).

### 4. Adicionando um exemplo

Cada exemplo em `examples/` deve:
- Ser executável com `pnpm example:<nome>`
- Usar MockAdapter para não depender de APIs externas
- Mostrar claramente entrada, steps e saída

### 5. Melhorando documentação

Pull requests para `docs/`, `CONTRIBUTING.md` e `ROADMAP.md` são muito bem-vindos.

## Regras de arquitetura

1. **Kernel congelado** — nenhuma abstração nova no kernel até que 3 plugins diferentes precisem dela
2. **Plugins importam apenas `@beehive/sdk`** — kernel nunca é exposto
3. **Capabilities são a unidade de computação** — todo trabalho executado passa por uma capability
4. **Workflows são dados** — WorkflowDefinitions em YAML/JSON, não código

## Testes

```bash
pnpm test:architecture   # 10 testes de contrato (kernel, SDK, plugins)
pnpm test:workflows      # 14+ testes de workflow com mocks
pnpm test                # testes de todos os workspaces
```

## Benchmark

```bash
pnpm run benchmark       # mede boot, runtime, memoria
```

Resultados atuais em [benchmarks/RESULTS.md](benchmarks/RESULTS.md).

## DX

Antes de abrir um PR, verifique:

- [ ] `pnpm test:architecture` passa
- [ ] `pnpm test:workflows` passa
- [ ] Nenhum arquivo do kernel foi alterado (a menos que seja estritamente necessário)
- [ ] O plugin pode ser criado via scaffolding
- [ ] O plugin passa `pnpm validate plugin <nome>` com ≥ 90%
- [ ] Exemplo em `examples/<nome>/run.ts` criado/atualizado
