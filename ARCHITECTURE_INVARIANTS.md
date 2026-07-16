# Architecture Invariants

> Regras que **nunca** podem ser quebradas.
>
> Quando alguém perguntar "posso colocar essa lógica no Kernel?",
> a resposta é: "Não. Quebra o Invariant 1."

---

## INV-1: Kernel nunca conhece Providers

O Kernel é o sistema nervoso. Não é a loja de integrações.

**Proibido:**
- Kernel importa `runtime/provider-registry`
- Kernel referencia `IProvider`, `ProviderRouter`, `ProviderRegistry`
- Kernel depende de `providers/` ou `runtime/`

**Teste:** `tests/architecture/kernel-boundaries.test.ts`

---

## INV-2: Plugins nunca importam Kernel

Plugins são unidades autônomas. Eles importam apenas `@beehive/sdk` e `@beehive/shared`.

**Proibido:**
- Importar `../kernel` ou `../../kernel`
- Referenciar classes do Kernel (`Kernel`, `CapabilityRegistry`, etc.)

**Teste:** `tests/architecture.test.ts` (Test 3)

---

## INV-3: SDK é a única API pública

Tudo que um plugin ou app externo precisa está em `@beehive/sdk`.

**Proibido:**
- Plugin importar biblioteca que não esteja no SDK
- Plugin importar `@beehive/shared` diretamente (exceto tipos)
- App externa importar `packages/sdk/src/` (apenas `@beehive/sdk`)

**Teste:** `tests/architecture/kernel-boundaries.test.ts` (INV-3)

---

## INV-4: Providers podem ser trocados sem alterar Workflow, Plugin ou Application

A mesma capability + o mesmo workflow + a mesma aplicação conseguem trocar o motor de execução sem saber que houve troca.

**Proibido:**
- ProviderRouter modificar Kernel
- ProviderRouter modificar WorkflowRuntime
- ProviderRouter modificar Plugin

**Teste:** `tests/architecture/provider-swap.test.ts`

---

## INV-5: Core não contém conhecimento de domínio

Domínio pertence a aplicações externas, nunca ao Kernel.

**Proibido:**
- Regras de negócio no Kernel
- Workflows específicos de indústria no Kernel
- Termos de domínio ("pedido", "produto", "aula", "afiliado") no Kernel

**Teste:** `ARCHITECTURE.md` seção 15 (Domain Isolation Rule)

---

## INV-6: Plugin Lifecycle ≠ Provider Lifecycle

Plugin tem install, activate, deactivate, readiness, health.
Provider tem configure, readiness, health.

**Proibido:**
- Provider ter activate/deactivate
- Plugin ter configure
- Duplicar PluginLifecycle em Provider

---

## INV-7: Capability ≠ Implementação

A capability declara **o que** faz. O provider declara **como** faz.

**Proibido:**
- Capability hardcode a implementação ("Resposta simulada para: ...")
- Capability saber qual provider está usando
- Provider saber qual capability chamou

**Teste:** `tests/architecture/provider-swap.test.ts`

---

## INV-8: Readiness ≠ Health

São conceitos diferentes:

- **Readiness**: "Está preparado para funcionar?" — verifica ambiente (binários, runtime, dependências)
- **Health**: "Está funcionando agora?" — executa diagnóstico ao vivo (latência, erros)

Um plugin pode estar:
- registered ✅
- ready ✅
- health ❌

**Teste:** `tools/health.ts` (separação de colunas Readiness vs Health)

---

## Como usar

Quando uma nova decisão arquitetural surgir:

1. Liste os invariants relevantes
2. Pergunte: "Isso quebra algum invariant?"
3. Se sim — refatore antes de prosseguir
4. Se não — adicione um teste que garanta o invariant

> Um invariant quebrado é mais grave que um bug funcional.
> Bug funcional corrige-se. Invariant quebrado corrompe a plataforma.
