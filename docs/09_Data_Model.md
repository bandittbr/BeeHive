# 09 — Modelo de Dados (Conceitual)

> **Natureza:** evolutiva. Descreve as **entidades conceituais** e suas relações — não a implementação (tabelas, esquemas e tecnologia ficam em `02_Technology_Stack.md`).

---

## Entidades centrais

### Projeto / Negócio
A unidade de valor. Contém marca, identidade visual, contas de redes, estratégia de conteúdo, produtos, marketplaces, afiliados, métricas, finanças e os agentes designados.

### Agente
Trabalhador especializado. Possui: tipo (conteúdo, edição, publicação, vendas, análise…), **estado** (ligado / pausado / desligado), configuração, logs e métricas de desempenho. Sempre vinculado a um Projeto.

### Tarefa
Unidade de trabalho executada por um agente. Possui: objetivo, status, resultado, custo (esforço/tempo) e indicação de **necessidade de aprovação humana**.

## Entidades de apoio
- **Conversa / Mensagem** — o histórico das interações.
- **Conhecimento** — documentos e base de referência consultável.
- **Aprovação** — uma ação sensível aguardando decisão humana (a fila da Central).

## Relações

```
Administrador
     │ define objetivos
     ▼
  Projeto ─── contém ──► Agente ─── executa ──► Tarefa
     ▲                                            │
     │                                            │ pode exigir
     │                                            ▼
     └──── métricas/resultados ◄──── Aprovação (Central)

  Conversa/Mensagem ──► registra intenções que geram Projetos e Tarefas
  Conhecimento ──► consultado por Agentes para executar com qualidade
```

## Princípios aplicados
- O modelo coloca o **Projeto no centro** (P3).
- O **estado do agente** é cidadão de primeira classe (P9).
- A **aprovação** é uma entidade explícita, não um detalhe (P10).
- Toda tarefa carrega rastro auditável (P11).
