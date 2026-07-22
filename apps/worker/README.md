# BeeHive Cowork Nuvem — Worker

Serviço que dá "braços" ao BeeHive: executa **de verdade** terminal, arquivos, git e navegador (Playwright), sob demanda do orquestrador. Roda 24/7 na nuvem (Railway) para automações que não dependem do PC do usuário ligado.

## O que ele faz

Recebe **jobs** por HTTP e transmite o progresso por SSE. Tipos de job:

| type | payload | ação |
|---|---|---|
| `shell` | `{ command, timeoutMs? }` | roda comando no bash |
| `writeFile` | `{ path, content }` | escreve arquivo no workspace |
| `readFile` | `{ path }` | lê arquivo do workspace |
| `git` | `{ args }` | comando git (subcomandos em allowlist) |
| `browser` | `{ steps: [...] }` | automação Playwright (goto/click/fill/text/html/screenshot) |

Tudo fica confinado ao diretório `WORKSPACE_DIR` (path traversal bloqueado) e há allowlist/denylist básica de comandos.

## API

- `GET /health` → status (usado pelo healthcheck do Railway)
- `POST /jobs` → cria job. Body: `{ type, payload, cwd?, label? }`. Retorna `{ id }`
- `GET /jobs/:id` → estado atual do job (poll)
- `GET /jobs/:id/events` → stream SSE de eventos (status/stdout/stderr/result)

Autenticação: se `WORKER_TOKEN` estiver definido, envie `Authorization: Bearer <token>` em todas as rotas (menos `/health`).

## Variáveis de ambiente

| var | padrão | descrição |
|---|---|---|
| `PORT` | `4000` | porta HTTP |
| `WORKER_TOKEN` | (vazio) | token de acesso. **Defina em produção.** |
| `WORKSPACE_DIR` | `./workspace` | raiz onde os arquivos são criados |

## Rodar local

```bash
cd apps/worker
npm install
WORKER_TOKEN=troque-isto npm run dev
# worker em http://localhost:4000
```

Teste:
```bash
curl -X POST localhost:4000/jobs \
  -H 'authorization: Bearer troque-isto' \
  -H 'content-type: application/json' \
  -d '{"type":"shell","payload":{"command":"echo funcionando && node -v"}}'
```

## Deploy no Railway

1. No Railway, **New Project → Deploy from GitHub repo** → selecione `bandittbr/BeeHive`.
2. Em **Settings → Build**: use Dockerfile em `apps/worker/Dockerfile` (a imagem base já traz o Chromium do Playwright). O `apps/worker/railway.json` já aponta pra isso — basta criar o serviço com **Root Directory = `/`** e o Railway lê o `railway.json`. Se preferir, defina Root Directory = `apps/worker` e Dockerfile Path = `Dockerfile`.
3. Em **Variables**, defina:
   - `WORKER_TOKEN` = um segredo forte (o mesmo que você colará no BeeHive → Settings)
   - (opcional) `WORKSPACE_DIR` = `/app/workspace`
4. Deploy. Copie a URL pública (ex.: `https://beehive-worker-production.up.railway.app`).
5. No BeeHive (Control Center) → **Settings → Cowork Nuvem**: cole a URL e o token. A partir daí, as etapas do plano marcadas como "requer Cowork" passam a executar de verdade.

> Segurança: o worker executa comandos arbitrários por design. **Sempre** use `WORKER_TOKEN` em produção e trate a URL como sensível. Ações destrutivas óbvias (`rm -rf /`, `mkfs`, fork bomb, shutdown) são bloqueadas, mas isso não substitui rodar em ambiente isolado.
