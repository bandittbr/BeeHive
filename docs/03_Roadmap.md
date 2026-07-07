# 03 — Roadmap

> **Natureza:** evolutiva. Define *quando* e *em que ordem* o BeeHive cresce. A estratégia em 4 fases é da visão do Product Owner.

---

## Estratégia em 4 fases

Cada fase é entregável e usável por si só. A regra de ouro: **nenhuma decisão de uma fase pode impedir a seguinte.**

### Fase 1 — Tudo Local (custo: R$ 0)
Desenvolvimento e operação 100% na máquina do administrador. O objetivo é provar o núcleo Conversa + 1 ou 2 áreas. Resultado: um BeeHive funcional, privado, sem custo, dependente do PC ligado.

### Fase 2 — Dashboard Online (custo: ~R$ 0)
O processamento continua local, mas a interface fica acessível pela internet (hospedagem gratuita + acesso seguro ao cérebro local). Resultado: BeeHive acessível de qualquer lugar.

### Fase 3 — Agentes em Servidor (custo: baixo)
Os agentes passam a rodar 24h em um servidor próprio (VPS simples), sem depender do PC. Resultado: o primeiro momento em que algo realmente "vive sozinho".

### Fase 4 — Escala (custo: variável, já com receita)
Multi-projeto e multi-cliente, agentes ativos 24h, infraestrutura dimensionada conforme a operação. Resultado: o BeeHive como produto/operação.

---

## Marcos incrementais

### Marco 0 — Fundação (atual)
- [x] Visão, fases e áreas definidas.
- [x] Documentação de fundação reorganizada (Constituição + documentos).
- [ ] Definir o design do Dashboard (imagem a ser enviada pelo PO).
- [ ] Definir ambiente de inteligência inicial.
- [ ] Definir estrutura do repositório.

### Marco 1 — Núcleo Conversa (Fase 1)
- [ ] Conversa funcional ligada à inteligência local.
- [ ] Interpretação de intenção + roteamento básico.
- [ ] Persistência de histórico.
- [ ] Primeira ferramenta real (ex.: "criar Projeto").

### Marco 2 — Esqueleto da Dashboard
- [ ] Layout com as Áreas (a partir da imagem do PO).
- [ ] Área Agentes com ligar/desligar/pausar.
- [ ] Configurações (escolha de inteligência).

### Marco 3 — Primeira Área completa: Business (mínimo)
- [ ] Criar Projeto com marca e nicho.
- [ ] Agente estrategista + redator gerando um plano de conteúdo.
- [ ] Geração de uma imagem e uma legenda.

### Marco 4 — Online (Fase 2)
- [ ] Dashboard hospedada.
- [ ] Cérebro local exposto com segurança.

### Marco 5+ — Autonomia (Fase 3) e Escala (Fase 4)
- [ ] Agentes em servidor, 24h, com limites e aprovações.
- [ ] Publicação real respeitando regras das plataformas.
- [ ] Multi-projeto / multi-cliente.

---

## Próximos passos imediatos
1. **PO:** enviar a imagem do Dashboard.
2. **Arquitetura:** transformar a imagem em especificação de telas/navegação (alimenta `07_Dashboard.md`).
3. **Arquitetura:** definir ambiente da Fase 1 e estrutura do repositório.
4. **Construção:** iniciar o Marco 1 — o núcleo Conversa.
