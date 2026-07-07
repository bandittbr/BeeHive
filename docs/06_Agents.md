# 06 — Agentes

> **Natureza:** evolutiva. Define o sistema de agentes, seus estados, controle e segurança. Honra P4, P9, P10 e P11.

---

## O que é um agente
Um trabalhador de inteligência especializado que executa tarefas para cumprir objetivos. Está sempre vinculado a um Projeto e atua **em segundo plano** — o foco da tela é o Projeto, não ele (P4).

## Estados (controle total — P9)
- **Ligado** — opera dentro de suas regras e orçamento.
- **Pausado** — mantém estado e memória, mas não executa nada novo.
- **Desligado** — inativo; não consome recursos.

Cada agente pode ser ligado, pausado ou desligado **individualmente**, e existe um **kill switch global** para parar tudo de uma vez.

## Segurança desde o início
- **Limites** por agente: frequência, gasto, escopo.
- **Aprovação humana** (P10) para ações sensíveis: publicar, gastar, enviar, contratar.
- **Auditabilidade** (P11): todo agente registra o que fez e por quê.
- **Parada de emergência** sempre disponível.

## Tipos de agente (exemplos, conforme a visão do PO)
Estrategista, redator, designer, editor de vídeo, publicador, analista de métricas, vendas. A lista cresce conforme as Áreas amadurecem — sempre a partir da visão do Product Owner (P12).

## Relação com o orquestrador
O orquestrador (ver `01_Architecture.md`) aciona agentes de forma desacoplada: cada agente declara o que faz e quais ferramentas usa, e é chamado sem acoplamento rígido.
