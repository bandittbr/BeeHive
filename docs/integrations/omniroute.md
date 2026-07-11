# Integração com OmniRoute (gateway de IA)

O BeeHive fala com modelos de IA através de um "AI Layer" com provedores
substituíveis (`packages/platform/src/ai`). Em vez do BeeHive gerenciar
sozinho o fallback entre provedores (modo `llmrouter`), o modo recomendado
para produção é apontar o BeeHive para o **OmniRoute** — um gateway de IA
open source já pronto para isso.

Repositório upstream: https://github.com/diegosouzapw/OmniRoute
(MIT license — "OmniRoute: The Free AI Gateway"). Ele expõe um endpoint
único, compatível com a API da OpenAI, e faz failover automático entre
177 provedores (Groq, OpenRouter, Gemini, etc.), com 50+ opções gratuitas.

## Por que não vendorizar o código no repo do BeeHive

O OmniRoute é um projeto grande (~190MB, testes, docs, CI próprios) com seu
próprio ciclo de release. Copiá-lo para dentro do repo do BeeHive duplicaria
código de terceiros e complicaria updates. Por isso ele é tratado como um
**serviço externo**, deployado a partir do próprio repositório upstream,
e conectado ao BeeHive só por HTTP (uma URL + uma API key). Isso segue a
filosofia de modularidade do projeto: cada peça funciona de forma
independente.

(Tentamos inicialmente um git submodule em `services/omniroute`, mas o
mount local do projeto não suporta certas operações de arquivo do git
aninhado — por isso a pasta `services/omniroute/` está no `.gitignore` e
não é usada. A integração é 100% via variável de ambiente.)

## Como funciona no código

Em `apps/api/src/config.ts`, se a env var `OMNIROUTE_URL` estiver definida,
ela vira o `baseUrl` padrão do modo `openai` (a menos que `OPENAI_BASE_URL`
seja definido explicitamente — este último sempre tem prioridade):

```
config.openai.baseUrl = OPENAI_BASE_URL ?? `${OMNIROUTE_URL}/v1`
```

O provedor `createOpenAIProvider` (`apps/api/src/intelligence/openaiProvider.ts`)
já suporta qualquer endpoint compatível com a API de Chat da OpenAI — não foi
necessário nenhum código novo para "falar" com o OmniRoute.

## Deploy do OmniRoute (Railway)

1. No Railway, **New Project → Deploy from GitHub repo**.
2. Repositório: `diegosouzapw/OmniRoute` (branch `main`).
3. Build: Dockerfile do próprio repo, target `runner-base` (imagem enxuta,
   ~500MB, sem Chromium — suficiente pros provedores padrão).
   Em Settings → Build, defina o build arg/target `runner-base` se o
   Railway não detectar automaticamente.
4. Variáveis mínimas (Settings → Variables):
   - `PORT=20128`
   - `DASHBOARD_PORT=20128`
   - `DATA_DIR=/app/data` (Railway monta um volume — adicione um Volume em
     Settings → Volumes apontando pra `/app/data`, senão os dados somem a
     cada redeploy)
5. Gere um domínio público (Settings → Networking → Generate Domain).
6. Acesse o dashboard na URL gerada, vá em **Providers** e conecte pelo
   menos um provedor gratuito (ex.: Kiro AI ou OpenCode Free — não pedem
   cadastro).
7. Em **Endpoints**, copie a API Key gerada.

## Conectar o BeeHive ao OmniRoute

No serviço `apps/api` do Railway (ou no `.env` local), configure:

```
AI_PROVIDER=openai
OMNIROUTE_URL=https://SEU-OMNIROUTE.up.railway.app
OPENAI_API_KEY=<chave copiada no passo 7>
OPENAI_MODEL=auto
```

`OPENAI_MODEL=auto` deixa o próprio OmniRoute escolher o melhor modelo
disponível (roteamento inteligente). Pra fixar um modelo específico, troque
por ex. `OPENAI_MODEL=groq/llama-3.1-70b`.

## Verificação

```bash
curl https://SEU-OMNIROUTE.up.railway.app/v1/models \
  -H "Authorization: Bearer SUA_CHAVE"
```

Deve listar os modelos conectados. Depois, o healthcheck do BeeHive
(`GET /api/runtime/status` no `apps/api`) deve reportar o provedor `openai`
(exibido como `omniroute:<modelo>`) ativo.
