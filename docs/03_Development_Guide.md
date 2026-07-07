# Guia de Desenvolvimento do BeeHive

> **Natureza:** contrato operacional, vivo. Este documento é o **acordo definitivo entre a IA e o Product Owner** sobre *como* o BeeHive será construído. Ele não explica o que o BeeHive é (isso vive na Constituição `00` e nos documentos de arquitetura) — ele define o **método de trabalho** a partir de agora.
>
> Regido pela Constituição (`00_BeeHive_Constitution.md`) e pela Arquitetura Conceitual (`01_Architecture.md`). Em qualquer conflito, a **visão do Product Owner prevalece** (P12).
>
> ⚠️ **Nota de numeração:** este documento foi nomeado `03_Development_Guide.md` por decisão do Product Owner. Já existe um `03_Roadmap.md`. A duplicidade de prefixo está registrada como **Sugestão S6** na Revisão, mas nenhum arquivo existente foi alterado.

---

## 1. Objetivo

A partir deste documento, **o BeeHive entra oficialmente na fase de desenvolvimento.** A fase de planejamento está encerrada.

O que isso significa, na prática:

- **Código vem primeiro.** Toda nova funcionalidade deve ser **implementada em código** antes de gerar qualquer documentação adicional sobre ela. Documenta-se o que existe, não o que se imagina.
- **A documentação acompanha, não substitui.** Documentar deixa de ser a entrega principal e passa a ser o registro do que foi construído. Documentação nunca é desculpa para não escrever software.
- **A base já está pronta.** A visão (`00`), a arquitetura conceitual (`01`), a stack candidata (`02`), o roadmap (`03_Roadmap`), as áreas e o modelo de dados já foram definidos. Não vamos re-planejar — vamos construir sobre essa base.

> Em uma frase: **a partir de agora, o produto é o código. A documentação é a sombra que o acompanha.**

---

## 2. Fluxo Obrigatório de Trabalho

Toda IA (e todo colaborador) que for desenvolver no BeeHive **deve seguir rigorosamente** este fluxo, em ordem, para qualquer alteração — pequena ou grande:

1. **Ler a documentação existente.** Começar sempre pela `docs/`. Nenhuma linha de código antes de entender o contexto.
2. **Entender o estado atual do projeto.** O que já existe, o que funciona, o que está pendente. Olhar o registro do último Sprint.
3. **Identificar impactos da alteração.** O que essa mudança toca? Que componentes, contratos ou Áreas podem ser afetados? Há risco de quebrar algo?
4. **Criar um plano curto de implementação.** Poucas linhas: o que será feito, em que ordem, e por quê. Plano enxuto, não tese.
5. **Implementar.** Escrever o código, seguindo a Filosofia (Seção 3) e respeitando a arquitetura existente.
6. **Corrigir erros.** Fazer funcionar de verdade. Nada é "concluído" enquanto há erro conhecido.
7. **Testar.** Verificar que a funcionalidade faz o que deveria — e que não quebrou o que já existia.
8. **Atualizar somente a documentação necessária.** Só o que mudou de verdade. Sem inflar documentos.
9. **Registrar alterações relevantes.** Anotar no registro do Sprint o que foi feito, o que mudou e o que ficou pendente.

> **Nenhum passo pode ser pulado.** Pular "ler" gera retrabalho; pular "testar" gera dívida; pular "registrar" apaga a memória do projeto. O fluxo é inegociável.

```
Ler docs → Entender estado → Identificar impactos → Planejar (curto)
   → Implementar → Corrigir → Testar → Atualizar docs → Registrar
```

---

## 3. Filosofia de Desenvolvimento

Os princípios abaixo guiam cada decisão de código. Eles são a tradução, para o dia a dia da implementação, dos princípios arquitetônicos da Constituição e do `01`.

### Sobre o escopo
- **Pequenas entregas.** Construir em incrementos pequenos, funcionais e verificáveis (↔ P13). Uma entrega grande é muitas entregas pequenas que ninguém separou.
- **Evitar complexidade desnecessária.** A solução mais simples que resolve o problema vence. Complexidade só se justifica por necessidade real, nunca por elegância especulativa.
- **Nunca implementar funcionalidades não solicitadas.** Só entra no sistema o que veio da visão do Product Owner (↔ P12). Boas ideias viram *sugestões*, não código surpresa.
- **Sempre preservar a arquitetura existente.** O código novo se encaixa na estrutura definida no `01`; não a contorna nem a corrói.

### Sobre a forma do código
- **Componentes pequenos e reutilizáveis.** Peças pequenas, com uma responsabilidade clara, que podem ser combinadas. Evitar "peças-canivete" que fazem de tudo.
- **Código limpo.** Sem gambiarra, sem código morto, sem duplicação evitável. O que não serve, sai.
- **Código legível.** Escreve-se para humanos lerem. Nomes claros, intenção explícita. Um código que precisa de decifração é um custo futuro.
- **Modularidade (↔ P5).** Cada parte liga/desliga e evolui isoladamente.
- **Desacoplamento (↔ P6).** Depender de contratos/abstrações, nunca de implementações alheias. Especialmente: **toda inteligência passa pela abstração** (↔ P7).
- **Alta coesão.** Cada módulo cuida de uma coisa e a faz bem.

### Sobre as qualidades de longo prazo
- **Escalabilidade.** O que se escreve hoje deve aguentar crescer em volume e escopo amanhã, sem reescrita (↔ Seção 10 do `01`).
- **Testabilidade.** O código nasce pensando em como será verificado. O que é difícil de testar costuma estar mal desenhado.
- **Segurança (↔ P9, P10).** Limites, permissões e pontos de aprovação humana fazem parte do design, não são remendos posteriores. Ações sensíveis sempre passam pela governança.
- **Performance.** Buscar eficiência razoável, sem otimização prematura. Medir antes de otimizar; nunca sacrificar legibilidade por ganhos imaginários.
- **Observabilidade (↔ P11).** O que o sistema faz deixa rastro legível desde a primeira linha.

> Hierarquia em caso de tensão entre princípios: **funcionar > claro > simples > rápido.** Um código que não funciona não tem virtude nenhuma; um código rápido e ilegível é uma dívida disfarçada de feature.

---

## 4. Regras para a IA

Estas são obrigações de conduta de qualquer IA que desenvolva o BeeHive:

- **Pensar antes de programar.** Raciocinar sobre o problema e o impacto antes de escrever a primeira linha. Pressa não é método.
- **Explicar decisões arquiteturais importantes.** Quando uma escolha afeta a estrutura do sistema, ela é exposta ao Product Owner com seu porquê — não enterrada no código.
- **Nunca alterar a visão do projeto sem autorização.** A visão (Constituição) é soberana. Mudá-la exige decisão explícita do PO (↔ P12).
- **Nunca remover funcionalidades sem autorização.** Retirar algo que existe é uma decisão do PO, nunca da IA.
- **Nunca fazer grandes refatorações automaticamente.** Refatoração ampla é proposta e aprovada antes de acontecer. A IA não reescreve o sistema "de surpresa".
- **Sempre informar riscos.** Se uma mudança tem efeito colateral, custo, ou ponto frágil, isso é dito *antes*, com clareza e sem dramatizar.
- **Sempre sugerir melhorias separadamente da implementação.** Implementação entrega o que foi pedido; melhorias vão para uma seção/lista de **Sugestões** à parte, para o PO decidir. As duas coisas nunca se misturam.

> Princípio-mãe destas regras: **a IA é executora e conselheira, não dona do produto.** Ela constrói com excelência o que foi decidido e aconselha sobre o resto — sem ultrapassar a autoridade do Product Owner.

---

## 5. Estrutura do Desenvolvimento — Sprints

O BeeHive será desenvolvido por **Sprints**: ciclos curtos, focados e fechados, cada um entregando algo funcional. Sprints concretizam o princípio das "pequenas entregas" e se alinham aos **Marcos** do `03_Roadmap.md`.

Cada Sprint **deve obrigatoriamente registrar**:

- **Objetivo** — a frase única que diz o que este Sprint entrega.
- **Escopo** — o que está dentro e, explicitamente, o que está fora (para evitar inflar a entrega).
- **Critérios de conclusão** — como saber, sem ambiguidade, que o Sprint terminou (o que deve funcionar e estar testado).
- **Arquivos alterados** — a lista do que foi criado ou modificado, para rastreabilidade.
- **Pendências** — o que ficou incompleto, adiado ou conhecido como dívida.
- **Próximos passos** — o que naturalmente vem depois, alimentando o Sprint seguinte.

### Modelo de registro de Sprint

```
## Sprint N — <título curto>
- Objetivo:
- Escopo (dentro / fora):
- Critérios de conclusão:
- Arquivos alterados:
- Pendências:
- Próximos passos:
- Riscos observados:
- Sugestões (não implementadas):
```

> Sugestão de organização (não obrigatória até ser necessária): manter os registros em `docs/sprints/` ou em um único `docs/CHANGELOG.md`. Decisão fica para o momento em que o primeiro Spric for fechado — coerente com a Regra de Ouro (não criar documento antes de precisar).

### Relação Sprint ↔ Roadmap
Os Sprints **realizam** os Marcos do Roadmap. Tipicamente, o primeiro Sprint ataca o **Marco 1 — Núcleo Conversa** (a primeira Área a ser construída de verdade, conforme decisão do PO).

---

## 6. Regra de Ouro

> **A partir deste documento, o foco principal passa a ser escrever software.**

Consequências diretas:

1. **O desenvolvimento sempre tem prioridade sobre a documentação.** Diante da escolha entre avançar o código ou polir um documento, o código vence.
2. **Novos documentos só nascem quando realmente necessários** para explicar partes específicas do sistema. Não se cria documentação preventiva, decorativa ou redundante.
3. **A documentação existente é mantida enxuta e verdadeira.** Atualiza-se o que mudou; não se infla o que não mudou.

A medida de progresso do BeeHive, daqui para frente, é **software funcionando** — não páginas escritas.

---

# Revisão Crítica

Análise honesta deste guia e da documentação existente. Conforme as regras do projeto, **nenhum documento existente foi alterado**; problemas viram sugestões justificadas (P12).

## Pontos fortes do método proposto
- O fluxo obrigatório (Seção 2) combate os três erros mais comuns de desenvolvimento assistido por IA: começar sem ler o contexto, não testar, e não registrar o que foi feito.
- A separação rígida entre **implementação** e **sugestões** (Seção 4) protege a soberania do Product Owner sobre o escopo.
- A Regra de Ouro corrige um risco real do projeto: até aqui produzimos muita documentação; este guia reorienta a energia para o código.

## Riscos do próprio método (autocrítica)
1. **"Testar" sem critério vira teatro.** Marcar testes como feitos sem rigor é pior que não testar. *Mitigação:* os Critérios de Conclusão de cada Sprint devem ser verificáveis, não vagos.
2. **Sprints podem inchar.** A tentação de "só mais uma coisinha" corrói as pequenas entregas. *Mitigação:* o campo "Escopo (fora)" existe exatamente para conter isso.
3. **Registro de Sprint pode ser esquecido sob pressão de entregar.** *Mitigação:* o passo 9 do fluxo é inegociável; um Sprint sem registro é um Sprint incompleto.
4. **A Regra de Ouro pode ser usada como desculpa para não documentar o necessário.** "Código primeiro" não é "nunca documentar". *Mitigação:* o passo 8 do fluxo garante a documentação mínima do que mudou.

## Sugestões sobre a documentação existente (não aplicadas)

- **S6 — Resolver a colisão de numeração `03`.** Existem agora `03_Roadmap.md` e `03_Development_Guide.md`. *Justificativa:* dois arquivos com o mesmo prefixo confundem o índice e a ordem de leitura. *Opções:* (a) renumerar este guia para um número livre (ex.: `13_Development_Guide.md`); (b) renumerar o Roadmap; ou (c) manter como está e apenas anotar no `README.md`. **Recomendação:** opção (a), por ser a de menor impacto. *Nada foi alterado — aguardando decisão do PO.*
- **S7 — Atualizar o `README.md` (índice).** Ele ainda não lista este guia nem o `12_Risks_and_Constraints.md` com a numeração final, e descreve o `01` como "camadas/desacoplamento" quando ele já é a Arquitetura Conceitual completa. *Justificativa:* manter o índice fiel à realidade.
- **S8 — Reaproveitar as sugestões anteriores ainda abertas.** As sugestões S1–S5 da Arquitetura (`01`) seguem pendentes de decisão — em especial **S2** (oficializar "Workflow" e "Ferramenta" no Glossário e no Modelo de Dados) e **S3** (esclarecer Memória × Conhecimento), que são as mais baratas e que mais ajudam o desenvolvimento a começar com vocabulário único.
- **S9 — Definir o local de registro dos Sprints antes do Sprint 1.** Escolher entre `docs/sprints/` ou `docs/CHANGELOG.md` para não improvisar no meio do caminho.

> Todas as sugestões respeitam P12: são propostas, não decisões.

---

## Encerramento

Este documento **encerra oficialmente a fase de planejamento do BeeHive** e **marca o início da implementação**.

A partir daqui, o trabalho é construir — em pequenas entregas, dentro da arquitetura definida, com a Conversa como primeira Área, e com a documentação seguindo o código como sua sombra fiel.

> Próximo ato sugerido: abrir o **Sprint 1 — Núcleo Conversa** (Marco 1 do Roadmap), começando pelo fluxo da Seção 2, passo 1. A decisão de iniciar é do Product Owner.
