# Architecture Invariants

> Regras que protegem a integridade do BeeHive ao longo dos anos.
>
> Quando alguém perguntar "posso colocar essa lógica no Kernel?",
> a resposta é: "Não. Quebra o Invariant X."

---

## Hard Invariants — Nunca podem ser quebrados

### INV-1: Kernel nunca conhece Providers

O Kernel é o sistema nervoso. Não é a loja de integrações.

**Proibido:**
- Kernel importa `runtime/provider-registry`
- Kernel referencia `IProvider`, `ProviderRouter`, `ProviderRegistry`
- Kernel depende de `providers/` ou `runtime/`

**Teste:** `tests/architecture/kernel-boundaries.test.ts`

---

### INV-2: Plugins não importam implementações internas do Kernel

Plugins são unidades autônomas. Importam `@beehive/sdk`, `@beehive/shared` (tipos) e suas próprias dependências declaradas no package.json.

**Proibido:**
- Importar classes do Kernel (`Kernel`, `CapabilityRegistry`, `EventBus`, etc.)
- Importar de `../kernel` ou `../../kernel`

**Permitido:**
- Dependências externas declaradas no package.json (playwright, ffmpeg, sqlite, etc.)
- Interfaces e tipos de `@beehive/shared`

**Teste:** `tests/architecture/kernel-boundaries.test.ts` (INV-2)

---

### INV-3: Providers podem ser trocados sem alterar Workflow, Plugin ou Application

A mesma capability + o mesmo workflow + a mesma aplicação conseguem trocar o motor de execução sem saber que houve troca.

**Proibido:**
- ProviderRouter modificar Kernel
- ProviderRouter modificar WorkflowRuntime
- ProviderRouter modificar Plugin

**Teste:** `tests/architecture/provider-swap.test.ts`

---

### INV-4: Core não contém conhecimento de domínio

Domínio pertence a aplicações externas, nunca ao Kernel.

**Proibido:**
- Regras de negócio no Kernel
- Workflows específicos de indústria no Kernel
- Termos de domínio ("pedido", "produto", "aula", "afiliado") no Kernel

**Teste:** `ARCHITECTURE.md` seção 15 (Domain Isolation Rule)

---

### INV-5: SDK é a única API pública

Tudo que um plugin ou app externo precisa está em `@beehive/sdk`.

**Proibido:**
- App externa importar `packages/sdk/src/` (apenas `@beehive/sdk`)
- Plugin importar classes do Kernel

---

### INV-6: Capability ≠ Implementação

A capability declara **o que** faz. O provider declara **como** faz.

**Proibido:**
- Capability hardcode a implementação ("Resposta simulada para: ...")
- Capability saber qual provider está usando
- Provider saber qual capability chamou

---

## Soft Invariants — Objetivos de design

Estes são ideais. Podem ter exceções documentadas.
Se uma exceção é necessária, registre-a com motivo e data.

### INV-S1: ProviderRouter deve depender de ICapabilityRegistry, não de CapabilityRegistry

Hoje o ProviderRouter importa a classe concreta. Isso funciona, mas idealmente deveria depender apenas da interface.

**Status:** melhoria futura

---

### INV-S2: Plugins preferem dependências locais

Plugins podem importar bibliotecas externas (playwright, ffmpeg, etc.) desde que declaradas no package.json.
Mas preferem manter o mínimo de dependências possível.

---

### INV-S3: Health checks devem existir

Cada capability e provider deve ter um health check.
Mas a profundidade do health check pode variar conforme a necessidade.

---

### INV-S4: Readiness ≠ Health

São conceitos diferentes:

- **Readiness**: "Está preparado para funcionar?" — verifica ambiente (binários, runtime, dependências)
- **Health**: "Está funcionando agora?" — executa diagnóstico ao vivo (latência, erros)

Um plugin pode estar:
- registered ✅
- ready ✅
- health ❌

---

## Como usar

Quando uma nova decisão arquitetural surgir:

1. Liste os **hard invariants** relevantes
2. Pergunte: "Isso quebra algum hard invariant?"
3. Se sim — pare. Refatore antes de prosseguir.
4. Se não — avance.
5. Se precisar de uma exceção a um **soft invariant**, documente o motivo.

### Regra de ouro para novas abstrações

> **Nenhuma abstração nova entra sem que dois plugins reais tenham precisado dela.**

Isso é mais forte que a regra antiga dos "3 plugins".
Se só um plugin precisa, a abstração é prematura.
Espere o segundo caso de uso real.

> Um hard invariant quebrado é mais grave que um bug funcional.
> Bug funcional corrige-se. Invariant quebrado corrompe a plataforma.
