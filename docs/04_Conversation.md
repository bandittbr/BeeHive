# 04 — Conversa (Núcleo)

> **Natureza:** evolutiva. A Conversa é a interface principal e a primeira Área a ser construída de verdade (decisão do PO). Honra P1 (conversa primeiro) e P2 (objetivos sobre tarefas).

---

## Papel
A Conversa é a porta de entrada universal. O usuário pede qualquer coisa em linguagem natural; o BeeHive interpreta, decide quem age e devolve o resultado — abrindo ou atualizando a Área correspondente quando fizer sentido.

## Fluxo conceitual
1. **Entrada** — usuário escreve em linguagem natural.
2. **Interpretação de intenção** — o orquestrador classifica: qual Área? qual ação? o que falta?
3. **Roteamento** — encaminha para a Área/Agente certo, pede esclarecimento, ou sugere um caminho ("posso criar isso no Business?").
4. **Execução** — o agente realiza o trabalho com suas ferramentas.
5. **Resposta + ação na tela** — devolve texto e, quando útil, abre/atualiza a Área correspondente.

## Exemplo
> Usuário: *"Cria um negócio de café especial e começa a planejar o Instagram."*
> Conversa → intenção **Business: novo projeto** → cria o Projeto "Café Especial" → aciona agente de estratégia → devolve rascunho de plano + abre a Área Business no projeto recém-criado.

## MVP (Fase 1)
- Conversa funcional ligada à inteligência local.
- Classificador de intenção simples (poucas categorias).
- Capacidade de chamar 1–2 ferramentas reais (ex.: criar projeto, gerar texto).
- Histórico persistido.

## Princípios aplicados
- Tudo no sistema deve ser alcançável por aqui (P1).
- A Conversa orienta o usuário a objetivos, não o obriga a operar tarefas (P2).
- A Conversa não executa: ela **roteia**. Quem executa são os agentes (P4).
