# 07 — Dashboard / Interface

> **Natureza:** evolutiva. Especificação de telas e navegação, derivada da **imagem de referência aprovada pelo Product Owner** (jun/2026). Honra P1 (conversa primeiro), P3 (Projeto no centro) e P4 (agentes em segundo plano).
>
> 🎨 Tema visual: dark mode, acento amarelo/âmbar, identidade de colmeia (hexágonos + abelha). Sugestão: salvar a imagem de referência em `docs/assets/dashboard_reference.png`.

---

## 1. Leitura da interface aprovada

A tela inicial **é a Conversa**. Ela ocupa o centro, com a navegação de Áreas à esquerda e o painel de Projetos/métricas à direita. Isto valida a Constituição na prática: o usuário entra falando, vê seus Projetos e os agentes ficam discretos.

A interface tem **quatro regiões**:

```
┌────────────┬─────────────────────────────────────┬──────────────────┐
│            │  TOPO: saudação + busca/notif/tema   │                  │
│  SIDEBAR   ├─────────────────────────────────────┤  PAINEL DIREITO  │
│  (Áreas)   │                                     │  - Projetos      │
│            │  CENTRO = CONVERSA                   │  - Resumo geral  │
│            │  (hero, ações, input, atalhos)       │  - Agentes       │
│  rodapé:   │                                     │                  │
│  usuário   │                                     │                  │
└────────────┴─────────────────────────────────────┴──────────────────┘
```

---

## 2. Sidebar — navegação das Áreas (esquerda)

Topo: logo **BeeHive** + assinatura "Sistema Operacional de IA".

Lista de Áreas, na ordem da interface (a Área ativa fica destacada em amarelo — na referência, **Conversa**):

1. Conversa  →  `04_Conversation.md`
2. Business  →  `05_Business.md`
3. Jurídico  →  `11_Legal.md`
4. Desenvolvimento  →  `10_Development.md`
5. Design  →  (catalogada em `01_Architecture.md`)
6. Mídia  →  (catalogada em `01_Architecture.md`)
7. Conhecimento  →  (catalogada em `01_Architecture.md`)
8. Agentes  →  `06_Agents.md`
9. Dashboard  →  este documento
10. Central  →  (catalogada em `01_Architecture.md`)
11. Configurações  →  (catalogada em `01_Architecture.md`)

Rodapé da sidebar: **perfil do Administrador** + plano ("Ultimate" com coroa). Ponto de acesso a conta/assinatura.

> Observação de arquitetura: cada item liga/desliga de forma modular (P5). "Dashboard" é uma Área da lista **e** o nome geral da moldura — neste documento, tratamos das duas leituras.

---

## 3. Topo (barra superior)

- **Saudação contextual:** "Olá, Administrador 👋 / Como posso ajudar você hoje?" — reforça o tom de Conversa.
- **Busca global** (ícone de lupa) — buscar Projetos, conversas, agentes, conhecimento.
- **Notificações** (sino, com contador) — ligado à **Central** (aprovações/exceções, P10).
- **Alternância de tema** (sol/lua) — claro/escuro.

---

## 4. Centro — a Conversa (tela inicial)

A região central é a Área Conversa em estado de "boas-vindas". Componentes, de cima para baixo:

**a) Hero**
- Ilustração da abelha/colmeia.
- Título "Bem-vindo ao BeeHive".
- Slogan "Converse. Crie. Automatize. Cresça."

**b) Cartões de ação rápida (4)** — atalhos para as intenções mais comuns, cada um abrindo a Área correspondente:
- **Criar um novo Projeto Business** → Business (`05`).
- **Analisar um documento jurídico** → Jurídico (`11`).
- **Criar conteúdo para redes sociais** → Mídia/Business.
- **Desenvolver um sistema ou app** → Desenvolvimento (`10`).

**c) Campo de mensagem** — o coração da Conversa:
- Placeholder "Digite sua mensagem...".
- Botões: **+ Anexar**, **Comandos**, **Agentes**, **microfone** (voz), **enviar**.
- "Comandos" e "Agentes" são acessos diretos a comandos pré-definidos e à escolha de qual agente acionar.

**d) Sugestões rápidas** (chips) — exemplos que ensinam o usuário a pedir por objetivos:
- "Criar um influencer de nicho", "Analisar jurisprudência", "Gerar vídeo para TikTok", "Pesquisar doutrina".

**e) Atalhos** (faixa inferior, ícones) — ações operacionais frequentes:
- Novo Projeto · Criar Agente · Importar Dados · Gerar Relatório · Base de Conhecimento · Automação · Integrações · Configurar.

---

## 5. Painel direito — Projetos e resultados

Coloca o **Projeto no centro da atenção** (P3) e os agentes como infraestrutura (P4).

**a) Projetos em andamento** (com "Ver todos") — lista de Projetos com tipo e receita/variação. Exemplos da referência: PetLife, FitHouse, Tech Deals, Café Premium (todos do tipo Business, com receita e % de variação). Cada item leva ao Projeto (`08_Projects.md`).

**b) Resumo geral** (filtro de período, ex.: "Este mês") — métricas-chave:
- Receita total · Vendas · Novos seguidores · Conteúdos publicados · Agentes ativos · Tarefas concluídas.
- Cada uma com indicador de tendência.

**c) Agentes ativos** (com "Ver todos") — avatares dos agentes em operação + contador ("18 agentes operando agora"). Discreto, em segundo plano — confirma P4. Acesso à Área Agentes (`06`).

---

## 6. Princípios confirmados pela interface

| Princípio | Como a tela cumpre |
|-----------|--------------------|
| P1 — Conversa primeiro | A tela inicial é a própria Conversa, central e dominante. |
| P2 — Objetivos sobre tarefas | Cartões e chips falam em objetivos ("Criar um influencer de nicho"), não em passos técnicos. |
| P3 — Projeto no centro | O painel direito é todo sobre Projetos e seus resultados. |
| P4 — Agentes em segundo plano | Agentes aparecem como avatares pequenos e um contador, nunca como protagonistas. |
| P5 — Modularidade | A sidebar liga cada Área de forma independente. |
| P9 — Controle | A Área Agentes (sidebar e painel) concentra ligar/pausar/desligar. |
| P10 — Supervisão | O sino de notificações conecta à Central (aprovações/exceções). |

---

## 7. Estados de tela a especificar (próximos passos)

A referência mostra o **estado inicial (boas-vindas)**. Faltam especificar, em iterações futuras:
- Conversa **em andamento** (histórico de mensagens, respostas com ações).
- Tela de um **Projeto** aberto (dentro de Business).
- Tela da Área **Agentes** (lista + controles de estado).
- Tela da **Central** (fila de aprovações).
- **Configurações** (escolha de inteligência, integrações, segurança).

> Estes estados serão desenhados conforme o Roadmap (`03`), começando pelo Marco 1 (Conversa em andamento) e Marco 2 (esqueleto navegável das Áreas).
