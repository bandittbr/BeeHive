# Arquitetura Conceitual do BeeHive

> **Natureza:** evolutiva, porém estrutural. Descreve **como o BeeHive funciona conceitualmente** — independente de qualquer tecnologia. Nenhuma linguagem, framework, banco, API ou ferramenta concreta aparece aqui; essas decisões vivem em `02_Technology_Stack.md` e podem mudar sem alterar este documento.
>
> Este documento é regido pela Constituição (`00_BeeHive_Constitution.md`) e cita seus princípios (P1–P15).

---

## 1. Objetivo da Arquitetura

A arquitetura do BeeHive existe para resolver uma tensão central: **o sistema precisa fazer muita coisa (e cada vez mais), mas sem nunca virar uma massa rígida e impossível de evoluir.**

Seu propósito é, portanto, triplo:

1. **Dar forma à filosofia.** Traduzir os princípios da Constituição (Conversa primeiro, objetivos sobre tarefas, Projeto no centro, agentes em segundo plano) em uma estrutura de componentes coerente.
2. **Permitir crescimento ilimitado em superfície, com núcleo estável.** Adicionar Áreas, Agentes, Ferramentas e Projetos deve ser um ato de *encaixe*, nunca de *cirurgia* no centro do sistema.
3. **Proteger o sistema do tempo.** Tudo que é técnico mudará — provedores de inteligência, telas, formas de armazenar dados. A arquitetura assume isso desde o primeiro dia e isola o que muda do que permanece (P8).

A regra mestra que governa todas as decisões abaixo:

> **Nenhuma decisão de hoje pode impedir a evolução de amanhã.**

---

## 2. Princípios Arquitetônicos

Os princípios abaixo são as leis que toda decisão estrutural deve respeitar. Cada um se ancora nos princípios da Constituição.

### 2.1 Modularidade *(↔ P5)*
O sistema é um conjunto de partes independentes. Cada Área, Agente e Ferramenta é um módulo que pode ser **adicionado, ligado, desligado ou removido** sem quebrar o resto. O todo é a soma de partes substituíveis, não um bloco único.

### 2.2 Desacoplamento *(↔ P6)*
Um componente nunca conhece as entranhas de outro. Eles se comunicam por **contratos estáveis** (o "o quê"), nunca por dependência da implementação interna (o "como"). Trocar o interior de um componente não obriga a tocar em nenhum outro.

### 2.3 Baixo Acoplamento
Decorre do desacoplamento, mas merece destaque: as ligações entre componentes devem ser **as mínimas necessárias**. Quanto menos um módulo precisa saber sobre os outros para funcionar, mais saudável o sistema. O ideal é que cada parte dependa de **abstrações**, não de partes concretas.

### 2.4 Alta Coesão
O complemento do baixo acoplamento: cada componente deve ter **uma responsabilidade clara e bem delimitada**. Tudo que pertence a um propósito vive junto; o que não pertence, fica de fora. Uma Área cuida do seu domínio; um Agente cuida da sua especialidade; o Core cuida de coordenar — e nada além disso.

### 2.5 Independência de Provedor de Inteligência *(↔ P7)*
O "cérebro" que raciocina e gera é tratado como um **recurso plugável**, jamais como o centro do sistema. Toda inteligência é acessada por trás de uma abstração única. Trocar, somar ou rotear entre provedores é uma troca de implementação, não uma reforma estrutural. **O BeeHive nunca é refém de um único cérebro.**

### 2.6 Extensibilidade
O sistema é projetado para receber o que **ainda não existe**. Novas Áreas, novos tipos de Agente, novas Ferramentas e novos tipos de Projeto devem entrar por **pontos de extensão previstos**, sem alterar o núcleo. A arquitetura assume que não conhece todas as funcionalidades futuras — e se prepara para acolhê-las.

### 2.7 Escalabilidade
A estrutura deve suportar crescimento em **duas dimensões** sem reescrita: crescimento de *capacidade* (mais Projetos, mais Agentes operando ao mesmo tempo, mais volume de trabalho) e crescimento de *escopo* (mais domínios cobertos). A separação em componentes independentes é o que torna isso possível: cada parte pode ganhar escala isoladamente.

### 2.8 Observabilidade *(↔ P11)*
Nada acontece em silêncio. Toda ação relevante — uma intenção interpretada, um Agente acionado, uma Tarefa concluída, uma Aprovação pendente — deixa **rastro legível**. O sistema precisa ser capaz de responder, a qualquer momento, "o que está acontecendo, quem fez o quê e por quê". Sem isso, autonomia vira caixa-preta.

### 2.9 Segurança e Governança *(↔ P9, P10)*
O controle humano é parte da arquitetura, não um adendo. Existem **limites** (de escopo, frequência e gasto) para cada Agente; ações sensíveis passam por **aprovação humana**; e há sempre um meio de **interromper** — individualmente ou globalmente (kill switch). A autonomia opera dentro de cercas explícitas.

### 2.10 Persistência
O sistema tem memória. Projetos, histórico de Conversa, estado dos Agentes, resultados e conhecimento **sobrevivem ao tempo e a reinícios**. O que foi aprendido ou produzido não se perde. A persistência é tratada como uma camada própria, separada de quem a consome.

### 2.11 Honestidade Arquitetônica *(↔ P15)*
A arquitetura reconhece os limites do mundo real (regras de plataformas externas, custos, confiabilidade de fontes). Ela não promete autonomia mágica: desenha **pontos de supervisão** exatamente onde a realidade exige.

---

## 3. Componentes Conceituais

Cada componente abaixo é definido por suas **responsabilidades** (o que lhe cabe) e seus **limites** (o que NÃO lhe cabe). Os limites são tão importantes quanto as responsabilidades — são eles que garantem alta coesão e baixo acoplamento.

### BeeHive
**O quê:** o sistema operacional de IA como um todo — o ambiente que abriga tudo.
**Responsabilidades:** ser a fronteira do sistema; reunir Core, Áreas, Projetos, Agentes, Ferramentas e Memória sob uma identidade coerente.
**Limites:** o BeeHive é o *conjunto*, não executa nada por si só. Ele não é uma camada que "faz" — é o nome do todo.

### Core (Núcleo)
**O quê:** o coração lógico do sistema — o orquestrador central. É onde mora a inteligência de coordenação.
**Responsabilidades:** interpretar a intenção vinda da Conversa; decidir qual Área, qual Projeto e quais Agentes devem agir; coordenar a execução; aplicar regras de governança (limites, aprovações); registrar o que acontece (observabilidade); mediar o acesso à Inteligência e à Memória.
**Limites:** o Core **coordena, não executa o trabalho final**. Ele não desenha imagens, não escreve peças jurídicas, não publica posts — ele decide *quem* faz e *garante* que seja feito dentro das regras. O Core também **não é a interface**: não desenha telas.

> O Core contém a função que a Constituição chama de **Orquestração**. Pense no Core como o "kernel" do sistema operacional: pequeno, estável, central, e responsável por dar ordem ao resto.

### Conversa
**O quê:** a interface principal e universal do sistema (P1).
**Responsabilidades:** receber pedidos em linguagem natural; apresentar respostas e resultados; ser o ponto de entrada de qualquer objetivo; orientar o usuário rumo a Projetos e Áreas.
**Limites:** a Conversa **não decide e não executa** — ela traduz o desejo humano em uma intenção e a entrega ao Core. Ela é uma porta, não um motor.

### Área
**O quê:** um grande domínio funcional do sistema (Business, Jurídico, Mídia…), visível ao usuário.
**Responsabilidades:** organizar um campo de atuação; oferecer as capacidades daquele domínio; reunir os Agentes e Ferramentas pertinentes a ele.
**Limites:** uma Área **não conhece o interior de outra Área** (desacoplamento). Ela não coordena o sistema (isso é do Core) nem é a interface (isso é da Conversa). Ligar ou desligar uma Área não pode afetar as demais.

### Projeto
**O quê:** a **unidade central de valor** do BeeHive (P3). Um negócio ou iniciativa com identidade e resultados próprios.
**Responsabilidades:** ser o contexto dentro do qual todo trabalho acontece; agregar identidade, conhecimento, Agentes designados, Tarefas, resultados e métricas; dar sentido e fronteira ao que é produzido.
**Limites:** o Projeto é um **contexto, não um executor**. Ele não "faz" — ele *contém* e *dá propósito*. Um Projeto não interfere em outro Projeto.

### Agente
**O quê:** um executor especializado — uma "abelha" que faz um tipo de trabalho bem (P4).
**Responsabilidades:** cumprir Tarefas dentro de sua especialidade; usar Ferramentas; operar dentro dos limites definidos; relatar o que fez.
**Limites:** o Agente **não é a interface** e **não se auto-coordena com outros Agentes livremente** — quem coordena é o Core. Ele atua em segundo plano, sempre vinculado a um Projeto, e sempre pode ser ligado, pausado ou desligado.

### Ferramenta
**O quê:** uma capacidade concreta e bem definida que um Agente pode usar para agir sobre o mundo ou sobre os dados (ex.: "gerar uma imagem", "publicar um conteúdo", "consultar uma fonte", "salvar um arquivo").
**Responsabilidades:** executar **uma** ação específica de forma previsível, quando invocada por um Agente; expor claramente o que faz e o que precisa para funcionar.
**Limites:** a Ferramenta **não decide quando deve ser usada** (isso é do Agente/Core) e **não guarda estado do Projeto**. Ela é um "músculo", não um "cérebro". Ferramentas são o principal ponto de extensão da capacidade do sistema.

### Workflow
**O quê:** uma sequência ordenada de Tarefas que, juntas, cumprem um objetivo maior (ex.: o ciclo "pensar pauta → escrever texto → gerar imagem → montar vídeo → agendar publicação").
**Responsabilidades:** descrever **a ordem e as dependências** entre Tarefas; permitir que objetivos compostos sejam executados de forma repetível e observável; tornar processos recorrentes em algo que o sistema sabe conduzir.
**Limites:** o Workflow **descreve, não executa** — quem executa cada passo são os Agentes via Ferramentas. Ele é um "roteiro", coordenado pelo Core.

> Relação com **Tarefa** (definida em `09_Data_Model.md`): a Tarefa é a unidade atômica de trabalho; o Workflow é o encadeamento de várias Tarefas rumo a um objetivo.

### Memória
**O quê:** a camada de **persistência e conhecimento** do sistema — tudo que precisa sobreviver ao tempo.
**Responsabilidades:** guardar e devolver, de forma confiável, o estado dos Projetos, o histórico de Conversa, o estado dos Agentes, os resultados e o conhecimento de referência; servir de "longo prazo" do BeeHive.
**Limites:** a Memória **não raciocina e não decide** — ela apenas guarda e recupera. É consumida pelo Core e pelos Agentes, mas não os comanda.

> Distinção importante: **Memória** é o substrato de persistência (interno, técnico-conceitual). A Área **Conhecimento** é a janela *visível ao usuário* sobre parte dessa memória (documentos, base de referência). Uma é infraestrutura; a outra é domínio funcional. *(Ver Sugestão S3 na Revisão.)*

### Dashboard
**O quê:** a superfície de **visão geral e acompanhamento** — onde o humano vê Projetos, resultados, métricas e o estado dos Agentes.
**Responsabilidades:** apresentar o estado do sistema de forma legível; dar ao Administrador o panorama necessário para decidir; servir de moldura de navegação entre as Áreas.
**Limites:** o Dashboard **apresenta, não decide nem executa**. Como a Conversa, é interface — não contém regra de negócio.

### Central
**O quê:** o ponto de **governança ativa** — a fila de exceções, notificações e **aprovações humanas** (P10).
**Responsabilidades:** reunir tudo que requer atenção ou decisão do Administrador; segurar ações sensíveis até que sejam aprovadas; ser o canal por onde a supervisão humana entra no fluxo autônomo.
**Limites:** a Central **não executa a ação** — ela a *autoriza ou barra*. É o "freio e a campainha" do sistema.

### Usuário
**O quê:** quem interage com o BeeHive.
**Responsabilidades:** expressar objetivos; consumir resultados.
**Limites:** o Usuário comum opera dentro do que lhe é permitido; não necessariamente detém poderes de governança (isso é do Administrador).

### Administrador
**O quê:** quem dirige o BeeHive — o Product Owner, a "Rainha" da colmeia.
**Responsabilidades:** definir objetivos e prioridades; aprovar decisões estratégicas e ações sensíveis; resolver exceções; controlar Agentes (ligar/pausar/desligar); deter a palavra final (P12).
**Limites:** o Administrador **define a direção, não executa o trabalho braçal** — esse é exatamente o ponto da existência do BeeHive.

---

## 4. Fluxo Geral

O caminho que um pedido percorre, do desejo humano ao resultado acompanhável:

```
        Usuário / Administrador
                  │  (expressa um objetivo em linguagem natural)
                  ▼
              CONVERSA                  ← interface; traduz desejo em intenção
                  │
                  ▼
                CORE                     ← interpreta intenção, decide e coordena
                  │  ┌──────────────► consulta INTELIGÊNCIA (raciocínio/geração)
                  │  └──────────────► consulta MEMÓRIA (contexto/conhecimento)
                  ▼
                ÁREA                     ← domínio escolhido para o pedido
                  │
                  ▼
               PROJETO                   ← contexto onde tudo acontece
                  │
                  ▼
               AGENTES                   ← executores especializados
                  │   (organizados, quando preciso, por um WORKFLOW)
                  ▼
             FERRAMENTAS                 ← ações concretas sobre dados/mundo
                  │
                  ▼
              RESULTADO                  ← produzido e persistido na MEMÓRIA
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
   DASHBOARD            CENTRAL (se houver
   (acompanhar)         ação sensível → aprovação)
```

**Narrativa do fluxo:**

1. O **Usuário** expressa um objetivo pela **Conversa**.
2. A **Conversa** entrega esse pedido como uma *intenção* ao **Core** — sem julgá-lo nem executá-lo.
3. O **Core** interpreta a intenção (apoiando-se na **Inteligência** para raciocinar e na **Memória** para recuperar contexto), e decide: qual **Área**, qual **Projeto**, quais **Agentes**.
4. A ação acontece **dentro de um Projeto** — nunca solta no vácuo (P3).
5. Os **Agentes** designados executam suas **Tarefas**, usando **Ferramentas**. Quando o objetivo é composto, o **Core** conduz um **Workflow** que ordena as Tarefas.
6. O **Resultado** é produzido e gravado na **Memória** (persistência + observabilidade).
7. O resultado aparece para acompanhamento no **Dashboard**. Se algum passo envolveu uma ação sensível, ele passa antes pela **Central**, aguardando **aprovação humana**.

> **Proposta de refinamento ao fluxo do enunciado:** o fluxo linear original (Usuário → … → Resultado → Dashboard) é correto, mas incompleto em dois pontos que esta versão torna explícitos: (a) o Core consulta **Inteligência e Memória lateralmente** (não são etapas em fila, são serviços de apoio); e (b) o resultado tem **dois destinos** — o Dashboard (acompanhar) e, condicionalmente, a Central (aprovar). Isso reflete melhor a governança (P10) e o desacoplamento (P6).

---

## 5. Comunicação entre Componentes

A saúde de longo prazo do BeeHive depende de **quem pode falar com quem** — e, sobretudo, de **quem nunca deve depender diretamente de quem**.

### Papéis por natureza

- **Interfaces (apresentam):** Conversa, Dashboard. Capturam intenção e exibem resultados. Não contêm regra de negócio.
- **Orquestrador (coordena):** Core. O único componente que decide o fluxo. É o ponto de passagem obrigatório entre interface e execução.
- **Executores (fazem):** Agentes (via Ferramentas). Realizam o trabalho, sempre comandados pelo Core, sempre dentro de um Projeto.
- **Contextos (contêm):** Área e Projeto. Dão domínio e fronteira; não executam.
- **Persistência/Conhecimento (guardam):** Memória. Apenas armazena e devolve.
- **Governança (autoriza/observa):** Central. Segura ações sensíveis e canaliza a decisão humana.
- **Recurso plugável (serve):** Inteligência. Consultada sob demanda, sempre por abstração.

### Regras de comunicação

1. **Tudo passa pelo Core.** Interfaces falam com o Core; o Core fala com Áreas/Projetos/Agentes. As interfaces **nunca** acionam Agentes ou Ferramentas diretamente.
2. **Agentes não conversam livremente entre si.** Quando precisam colaborar, é o Core (via Workflow) que medeia. Isso evita uma teia de dependências incontrolável.
3. **Áreas não dependem de Áreas.** Nenhuma Área conhece o interior de outra. Se duas precisam cooperar, a mediação é do Core.
4. **Ninguém depende do provedor de Inteligência diretamente.** Todo acesso ao "cérebro" passa pela abstração (P7). Trocar o provedor não afeta nenhum componente de negócio.
5. **Ferramentas são folhas.** Elas são chamadas, nunca chamam de volta a lógica do sistema. Não guardam estado de Projeto.
6. **A Memória é consumida, não obedecida.** Componentes leem e gravam na Memória, mas a Memória não dispara ações.
7. **Ações sensíveis não escapam da Central.** Qualquer efeito de impacto (publicar, gastar, enviar) atravessa a Central antes de se concretizar.

> O princípio sintetizador: **dependa de abstrações e do Core, nunca de implementações concretas alheias.** É isso que mantém baixo acoplamento e alta coesão ao longo dos anos.

---

## 6. Projetos

O **Projeto é a unidade central do BeeHive** (P3). Esta é uma escolha arquitetônica deliberada, não apenas conceitual.

**Toda operação acontece dentro de um Projeto.** Não existe trabalho "solto": gerar uma imagem, redigir uma peça, publicar um conteúdo, analisar uma métrica — tudo pertence a algum Projeto, mesmo que seja um Projeto simples e efêmero. Isso traz três ganhos estruturais:

1. **Contexto.** O Projeto fornece aos Agentes e à Inteligência o pano de fundo (identidade, histórico, objetivos) que torna o trabalho relevante.
2. **Fronteira.** O Projeto isola o que é seu. Um Projeto não interfere em outro; recursos, conhecimento e Agentes têm escopo. Isso é essencial para escalar a multi-projeto e multi-cliente (Fase 4 do Roadmap).
3. **Sentido.** Resultados e métricas se acumulam *em algum lugar* — o Projeto — permitindo acompanhamento e decisão.

O Projeto é um **contêiner de contexto e propósito**, não um executor. Ele agrega: identidade, conhecimento próprio, Agentes designados, Tarefas/Workflows, resultados e métricas. Seu detalhamento e ciclo de vida estão em `08_Projects.md`.

> Consequência arquitetônica: como tudo vive dentro de Projetos, **o isolamento entre Projetos é um requisito de primeira classe** — não um detalhe de implementação.

---

## 7. Áreas

Uma **Área** é um grande domínio do sistema — um campo de atuação com suas próprias capacidades, Agentes e Ferramentas. As Áreas são a forma como o BeeHive organiza sua amplitude sem virar caos.

Áreas iniciais previstas:

- **Conversa** — a interface principal e universal.
- **Business** — criação e administração de negócios digitais.
- **Jurídico** — legislação, jurisprudência, teses, doutrinas, redação de peças.
- **Desenvolvimento** — criação de projetos, de um arquivo a um sistema.
- **Design** — identidade visual, marca, peças gráficas.
- **Mídia** — imagens, vídeos, áudio, arquivos.
- **Conhecimento** — base de referência consultável do sistema.
- **Agentes** — catálogo e controle dos executores.
- **Dashboard** — visão geral e acompanhamento.
- **Central** — governança, aprovações e exceções.
- **Configurações** — preferências, integrações, escolha de Inteligência, segurança.

**Propriedades arquitetônicas das Áreas:**

- São **modulares** (P5): podem ser ligadas/desligadas individualmente.
- São **desacopladas** (P6): nenhuma conhece o interior de outra.
- São **coesas**: cada uma cuida de um único domínio.
- São **extensíveis**: novas Áreas entram por encaixe, sem tocar no Core.

> Nota: algumas "Áreas" da lista (Conversa, Dashboard, Agentes, Central, Configurações) são, por natureza, mais **transversais** (atravessam o sistema) do que **domínios de negócio** (como Business, Jurídico, Mídia). Ambas convivem na mesma barra de navegação por decisão de produto, mas têm naturezas distintas. *(Ver Sugestão S1 na Revisão.)*

---

## 8. Agentes

Um **Agente** é um executor especializado — uma "abelha" que domina um tipo de trabalho. Os Agentes são onde o trabalho de fato acontece, e por isso a arquitetura os trata com cuidado.

**Princípios que governam os Agentes:**

- **Invisíveis por padrão (P4).** O Agente não é a interface do sistema. Ele trabalha em segundo plano; o foco do humano é o Projeto e seus resultados, não o Agente. Aparecem, no máximo, como avatares discretos e indicadores de estado.
- **Especializados (alta coesão).** Cada Agente faz uma coisa bem (estrategista, redator, designer, editor, publicador, analista…). A especialização mantém cada um simples e substituível.
- **Coordenados, não autônomos entre si.** Agentes não formam uma teia livre de chamadas mútuas. O Core os orquestra (via Workflow quando necessário), evitando acoplamento descontrolado.
- **Controláveis (P9).** Todo Agente pode ser ligado, pausado ou desligado individualmente; há um kill switch global.
- **Cercados (P10).** Operam dentro de limites de escopo, frequência e gasto; ações sensíveis exigem aprovação via Central.
- **Observáveis (P11).** Tudo que um Agente faz deixa rastro legível.
- **Vinculados a um Projeto.** Um Agente nunca atua no vácuo; sempre serve a um Projeto.

Os Agentes usam **Ferramentas** para agir e podem ser encadeados em **Workflows** para cumprir objetivos compostos. Seu detalhamento está em `06_Agents.md`.

---

## 9. Filosofia de Funcionamento

Como o BeeHive "pensa", em uma frase: **o humano dá a direção, o sistema encontra o caminho.**

Os pilares dessa filosofia (todos ancorados na Constituição):

- **O Usuário define objetivos; o BeeHive define a execução.** O humano diz *o que* quer alcançar; o sistema decide *como* — qual Área, qual Workflow, quais Agentes e Ferramentas (P2).
- **O Usuário trabalha com Projetos.** A relação do humano com o sistema é mediada por Projetos e seus resultados, não por engrenagens internas (P3).
- **Agentes são invisíveis sempre que possível.** Quanto melhor o sistema funciona, menos o humano precisa pensar em Agentes (P4).
- **A Conversa é a principal interface.** Falar é a forma natural e universal de comandar o BeeHive; telas são atalhos, nunca o único caminho (P1).
- **Autonomia com cercas.** O sistema busca operar sozinho ao máximo, mas sempre dentro de limites e com pontos de supervisão humana onde a realidade exige (P9, P10, P15).
- **Permanência através da mudança.** O que é técnico pode ser trocado a qualquer momento; o que é conceitual (esta arquitetura) permanece (P8).

---

## 10. Escalabilidade

A arquitetura foi desenhada para crescer **sem reformar o centro**. Cada eixo de crescimento tem um ponto de extensão próprio:

| Quero adicionar… | Onde encaixa | O que NÃO muda |
|------------------|--------------|----------------|
| **Uma nova Área** | Registra-se como mais um domínio modular, visível ao Core e à navegação. | O Core, as demais Áreas, os Projetos existentes. |
| **Um novo tipo de Agente** | Declara sua especialidade e as Ferramentas que usa; passa a ser orquestrável pelo Core. | Os outros Agentes, as Áreas, a Conversa. |
| **Uma nova Ferramenta** | Expõe a capacidade que oferece; Agentes passam a poder usá-la. | Tudo o mais — Ferramentas são folhas plugáveis. |
| **Um novo Projeto** | Nasce como mais um contêiner de contexto isolado. | Os demais Projetos (isolamento garantido). |
| **Um novo provedor de Inteligência** | Entra por trás da abstração única de inteligência. | Nenhum componente de negócio (P7). |
| **Mais volume (capacidade)** | Cada componente independente pode escalar isoladamente. | A estrutura lógica. |

O que torna tudo isso possível são os mesmos princípios da Seção 2 trabalhando juntos: **modularidade** (partes encaixáveis), **desacoplamento + baixo acoplamento** (encaixar não quebra o resto), **alta coesão** (cada parte tem escopo claro), **extensibilidade** (pontos de extensão previstos) e **independência de inteligência** (o cérebro nunca é o gargalo estrutural).

> Em resumo: o BeeHive cresce como uma **colmeia** — célula a célula, sem precisar reconstruir a colmeia inteira a cada novo favo.

---

# Revisão Arquitetônica

Análise crítica da própria arquitetura — feita no espírito de "pensar como um arquiteto responsável por um sistema que viverá por muitos anos". Nada aqui altera os outros documentos automaticamente; inconsistências viram **sugestões justificadas** (P12).

## Por que estas decisões foram tomadas

- **Um Core central e pequeno (em vez de orquestração distribuída entre Áreas):** concentrar a coordenação em um único ponto torna o comportamento do sistema *previsível e observável*. O risco (o Core virar um gargalo/"deus") é consciente e mitigado mantendo o Core enxuto — ele coordena, não executa.
- **Tudo dentro de Projetos:** garante contexto, isolamento e sentido, e prepara o terreno para multi-cliente sem reescrita.
- **Inteligência como recurso plugável:** é a decisão que mais protege o projeto do tempo. Provedores de IA mudam rápido; amarrar-se a um seria hipotecar o futuro.
- **Agentes coordenados pelo Core (sem teia livre):** evita o pior pesadelo de sistemas multiagente — dependências cruzadas incontroláveis e comportamento emergente difícil de auditar.

## Possíveis problemas futuros (riscos arquitetônicos)

1. **O Core como ponto único de sobrecarga.** Se concentrar coordenação *e* lógica demais, o Core pode virar um gargalo de desempenho e de manutenção (o "objeto-deus"). **Mitigação conceitual:** manter no Core apenas coordenação, governança e roteamento; tudo que é trabalho real fica nos Agentes/Ferramentas.
2. **Orquestração de Workflows complexos.** À medida que objetivos compostos crescem (ex.: operar um influencer ponta a ponta), os Workflows podem ficar intrincados, com falhas parciais, repetições e estados inconsistentes. **Mitigação:** tratar Workflow como conceito de primeira classe (já feito), com passos observáveis e recuperáveis.
3. **Fronteira ambígua entre Memória e a Área Conhecimento.** Há risco de confusão conceitual entre "persistência interna" e "domínio de conhecimento do usuário". *(Ver S3.)*
4. **Áreas transversais vs. Áreas de domínio na mesma lista.** Misturar naturezas diferentes na mesma navegação pode, com o tempo, borrar responsabilidades. *(Ver S1.)*
5. **Autonomia × Governança em escala.** Quanto mais autônomo o sistema, maior o volume de aprovações e exceções na Central — que pode virar um funil humano. **Mitigação:** permitir *políticas* de aprovação (o que é pré-autorizado vs. o que exige decisão), preservando o controle sem afogar o Administrador.
6. **Isolamento de Projetos como requisito crítico.** Se o isolamento falhar, multi-cliente fica inviável e há risco de vazamento entre contextos. Deve ser tratado como invariante inegociável desde cedo.
7. **Consistência da memória de longo prazo.** Com muitos Agentes lendo e gravando, manter a Memória coerente (sem versões conflitantes do "estado do Projeto") será um desafio recorrente.

## Sugestões (não aplicadas — dependem do Product Owner)

- **S1 — Distinguir "Áreas de Domínio" de "Áreas/Funções Transversais".** Conversa, Dashboard, Agentes, Central e Configurações são transversais (servem a todo o sistema), enquanto Business, Jurídico, Design, Mídia, Conhecimento e Desenvolvimento são domínios de trabalho. *Justificativa:* deixar a distinção explícita (sem mudar a navegação) protege a clareza de responsabilidades a longo prazo. *Impacto:* poderia ser uma nota em `00`/`07`.
- **S2 — Promover "Workflow" e "Ferramenta" ao vocabulário oficial.** Ambos são usados aqui e na prática (ex.: o "time de agentes" do influencer é um Workflow), mas não constam no Glossário da Constituição nem no `09_Data_Model.md`. *Justificativa:* alinhar o vocabulário evita divergência futura. *Impacto:* acrescentar Workflow e Ferramenta ao Glossário (`00`) e ao Modelo de Dados (`09`).
- **S3 — Esclarecer Memória × Conhecimento.** Definir, em `00` e `09`, que **Memória** é o substrato de persistência e **Conhecimento** é a Área visível que consulta parte dela. *Justificativa:* evita o risco nº 3 acima.
- **S4 — Introduzir o conceito de "Política de Autonomia".** Um nível, por Agente ou por Projeto, que define o que é pré-autorizado e o que exige aprovação humana. *Justificativa:* resolve o risco nº 5 (Central como funil) sem ferir a governança (P10). *Observação:* é uma *ideia de mecanismo de controle*, derivada dos princípios existentes — **não** uma funcionalidade nova de produto; só entra se o PO aprovar.
- **S5 — Alinhar a contagem de camadas.** A Constituição descreve "quatro camadas"; esta arquitetura detalha cinco componentes estruturais (Interface, Core/Orquestração, Inteligência, Agentes&Ferramentas, Memória). *Justificativa:* não é contradição (a Constituição agrupa Inteligência e Agentes como um nível conceitual), mas vale uma nota harmonizando a linguagem para evitar leitura de inconsistência.

> Todas as sugestões acima respeitam P12: são propostas, não decisões. A visão do Product Owner prevalece.
