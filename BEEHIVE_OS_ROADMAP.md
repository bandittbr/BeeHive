# BeeHive OS — Roadmap Mestre (Visão → Execução)

> Objetivo: um sistema operacional de produtividade por IA. Um único chat (cérebro) que entende a intenção, planeja, delega a agentes especializados e executa no ambiente Cowork (nuvem 24/7 + agente local) e nos módulos de negócio.
> **Regra de ouro:** construir **um fluxo por vez, 100% real**. Nunca adicionar mais mock. O kernel permanece congelado; tudo novo entra como módulo/serviço.

Decisões tomadas (21/07/2026): runtime **híbrido** (worker nuvem + agente local) · primeiro fluxo **Chat cérebro + orquestrador**.

---

## Estado atual (honesto)

| Camada | Estado | Observação |
|---|---|---|
| UI (Control Center) | 🟢 ~80% | Sidebar, chat, projetos, negócios, settings, MCP, pipelines (visual) |
| Chat responde de verdade | 🟢 | via backend Railway `/api/conversation/respond` (sem streaming nativo) |
| Kernel / EventBus / Capability | 🟢 congelado | `kernel/` — base sólida, não mexer |
| Providers multi-LLM | 🟡 | `runtime/provider-*.ts` + settings; falta roteamento automático por custo/tarefa |
| **Orquestrador (cérebro)** | 🟢 Fase 1 | planner + progresso ao vivo no chat (esta entrega) |
| Cowork runtime (executa de verdade) | 🔴 | UI existe, execução é mock; falta worker nuvem + agente local |
| Agentes especializados | 🟡 | contrato definido no orquestrador; execução real pendente |
| Negócios: postagem automática | 🔴 | cadastro de conta existe (UI); geração/agendamento/postagem não |
| Scraping + CRM + contato | 🔴 | não existe |
| Persistência real (multi-device) | 🔴 | conversas/projetos em localStorage/mock |
| Scheduler / filas 24/7 | 🔴 | há `scheduler.service` mock; falta worker real |

---

## Arquitetura-alvo

```
┌─────────────────────────────────────────────┐
│                    CONTROL CENTER (Vercel)               │
│   Chat único · Dashboard · Projetos · Negócios · Settings│
└───────────────┬──────────────────────────────┘
                │  (WebSocket + REST)
┌───────────────▼──────────────────────────────┐
│              ORQUESTRADOR / CÉREBRO  (API)               │
│  intenção → plano → delega → progresso ao vivo → resposta│
│  Memory · Router de modelos · Permissions · Scheduler    │
└───┬────────────────────────┬────────────────────────┬───┘
    │                       │                         │
┌───▼────────┐     ┌────────▼─────────┐     ┌─────────▼────────┐
│ AGENTES    │     │ COWORK NUVEM     │     │ AGENTE LOCAL     │
│ Content,   │     │ (Railway 24/7):  │     │ (PC do usuário): │
│ Image,     │     │ browser/Playwright│     │ opencode/openwork│
│ Video,     │     │ terminal, git,   │     │ controla mouse,  │
│ Research,  │     │ docker, filas,   │     │ teclado, apps,   │
│ Marketing… │     │ postagens sociais│     │ VS Code, arquivos│
└────────────┘     └──────────────────┘     └──────────────────┘
                            │
                   ┌────────▼────────┐
                   │  BANCO (Postgres)│  contatos/CRM, contas sociais
                   │  + Vector (memória)│  agendamentos, métricas, logs
                   └─────────────────┘
```

Runtime híbrido:
- **Cowork Nuvem** (Railway): tudo que precisa rodar 24/7 sem o PC ligado — postar 3 vídeos/dia, scraping agendado, deploys, filas.
- **Agente Local** (reusa `openwork-dev/` já presente no repo): controla o computador do usuário de verdade (VS Code, apps nativos, login manual). Conecta por URL, opt-in.

---

## Fases (cada fase entrega algo funcionando)

### FASE 1 — Chat cérebro + orquestrador  ← ENTREGUE (base)
Fundação. Sem isso, nada se conecta.
- [x] Planner: recebe 1 comando, classifica intenção, quebra em etapas (via LLM, saída JSON).
- [x] UI de progresso ao vivo no chat (checklist de etapas com status).
- [x] Execução sequencial: etapas de texto respondidas pelo LLM; etapas de ferramenta marcadas “requer Cowork/agente” (ligadas na Fase 2+).
- [ ] Memória de contexto entre etapas e entre conversas (curto prazo: store; médio: vector DB).
- [ ] Router de modelos: escolhe provider por custo/velocidade/qualidade/disponibilidade.

### FASE 2 — Cowork Nuvem (execução real 24/7)
- Worker Railway com fila (BullMQ/Redis), Playwright, terminal, git, docker, node, python.
- Contrato de “ferramenta”: o orquestrador despacha jobs; worker executa e devolve eventos (SSE/WS).
- Permissões: aprovar/negar ação sensível (o modal já existe no front).
- Primeiro caso de ponta a ponta: “crie uma landing page e faça deploy na Vercel”.

### FASE 3 — Agente Local (controla o computador)
- Integrar `openwork-dev` (opencode SDK) como runtime “client mode”: campo “Conectar worker (URL)” em Settings.
- Sessions reais, streaming SSE `/event`, tool parts reais no MessageList (componentes já portados).
- Caso de ponta a ponta: “abra o VS Code, corrija o bug X, rode os testes”.

### FASE 4 — Negócios: postagem automática (gera receita)
- Modelo de dados: Conta de negócio (ex.: “Chris Cortes Comédia”), tipo (Cortes/Criador/Afiliados), redes vinculadas, horários.
- Cofre de credenciais (criptografia AES-GCM já existe em `lib/crypto.ts`) para tokens/cookies/API keys por rede.
- Pipeline por tipo:
  - **Cortes**: baixar vídeo → detectar melhores momentos → cortar → legenda → thumbnail → agendar → postar.
  - **Criador**: tendências → roteiro → título/descrição/hashtags → imagens/vídeo IA → agendar → postar.
  - **Afiliados**: produto → conteúdo com link → postar → acompanhar cliques/vendas.
- Agentes: Content, Image, Video, Social Media, Analytics, SEO.
- Scheduler real (Fila na nuvem) + registro de métricas + loop de aprendizado (o que performa melhor).

### FASE 5 — Scraping + CRM + vendas
- Scraper (Google Maps e outros) → normaliza → grava contatos no Postgres.
- Módulos CRM/Leads: pipeline de contato, mensagens personalizadas por empresa, follow-up.
- Sales/Marketing Agent: aborda, conversa, oferta conforme perfil da empresa.

### FASE 6 — Dashboard + Analytics + Marketplace de módulos
- Dashboard: tarefas em andamento, agentes ativos, tokens, memória, automações, publicações, vendas, campanhas, notificações, logs, desempenho.
- Módulos instaláveis/removíveis independentemente (o sistema de plugins do kernel já suporta a base).

---

## Princípios inegociáveis
1. **Nada de mock novo.** Se não dá pra executar de verdade agora, marca como “requer Fase N” e não finge que funciona.
2. **Kernel congelado.** Novidades entram como módulo/serviço, não alteram `kernel/`.
3. **Segurança primeiro.** Credenciais sempre cifradas; ações sensíveis passam por permissão.
4. **Multi-provider sempre.** Nenhuma dependência de um único modelo.
5. **Um fluxo por vez, ponta a ponta.** Melhor 1 coisa 100% do que 10 pela metade.

---

## Próximo passo imediato
Fase 2 — subir o worker de nuvem (Railway) para a primeira execução real de ponta a ponta (landing page + deploy), ligando as etapas hoje marcadas como “requer runtime”.
