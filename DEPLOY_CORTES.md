# Reestruturação do Módulo Cortes — BeeHive

## Status: ✅ Deploy Backend Concluído | ⚠️ Frontend Aguardando Otimização

---

## ✅ Backend (Railway)

**API de Cortes está funcionando:** https://beehive-production-d895.up.railway.app/api/cortes/channels

### Rotas Implementadas:

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/cortes/channels | Listar canais |
| POST | /api/cortes/channels | Criar canal |
| PATCH | /api/cortes/channels/:id | Atualizar canal |
| DELETE | /api/cortes/channels/:id | Remover canal |
| GET | /api/cortes/social-accounts | Listar contas sociais |
| POST | /api/cortes/social-accounts | Cadastrar conta social |
| DELETE | /api/cortes/social-accounts/:id | Remover conta social |
| GET | /api/cortes/projects | Listar projetos |
| GET | /api/cortes/projects/:id | Detalhes do projeto |
| POST | /api/cortes/projects | Criar projeto |
| PATCH | /api/cortes/projects/:id | Atualizar projeto |
| DELETE | /api/cortes/projects/:id | Remover projeto |
| POST | /api/cortes/generate | Gerar cortes (motor Python) |
| GET | /api/cortes/settings | Configurações |
| POST | /api/cortes/settings | Salvar configurações |

### Persistência:
- Dados salvos em arquivos JSON na pasta `apps/worker/workspace/data/cortes/`
- Motor de geração: `AI-Youtube-Shorts-Generator` (Python)

---

## ⚠️ Frontend (Vercel)

**Status:** Deploy falhando por limite de tamanho (219MB > 100MB)

### Problema:
O projeto BeeHive ultrapassa o limite de 100MB do Vercel devido a:
- node_modules grandes
- Arquivos de build acumulados
- Recursos multimídia

### Solução Necessária:
1. Limpar arquivos não essenciais
2. Excluir node_modules do deploy (usar .vercelignore)
3. Otimizar assets
4. Considerar usar CDN para vídeos/imagens

---

## 📁 Estrutura Criada

```
E:\BeeHive\
├── prisma\
│   └── schema.prisma (adicionado CorteChannel, CorteSocialAccount, CorteProject, CorteClip, CorteSettings)
├── apps\
│   ├── worker\
│   │   ├── src\
│   │   │   ├── cortes-api.ts (API REST para cortes)
│   │   │   └── index.ts (atualizado com rotas de cortes)
│   │   ├── prisma\
│   │   │   └── schema.prisma (copia do schema principal)
│   │   └── package.json (adicionado prisma + @prisma/client)
│   └── control-center\
│       └── src\
│           ├── components\cortes\
│           │   ├── CortesView.tsx
│           │   ├── ProjetosView.tsx
│           │   ├── NewProjectForm.tsx
│           │   ├── ProjectDetail.tsx
│           │   ├── ChannelsManager.tsx
│           │   └── CorteSettings.tsx
│           ├── services\
│           │   └── cortes-api.ts
│           ├── types\
│           │   └── cortes.ts
│           ├── stores\
│           │   └── appStore.ts (adicionado estado de cortes)
│           └── App.tsx (atualizado com import do CortesView)
└── .gitignore (atualizado para ignorar AI-Youtube-Shorts-Generator/)
```

---

## 🔧 Próximos Passos para Completar o Deploy

### Para o Vercel:
```bash
cd E:\BeeHive
echo "node_modules/" > .vercelignore
echo ".git/" >> .vercelignore
echo "*.log" >> .vercelignore
npx vercel --prod
```

### Se ainda assim ultrapassar o limite:
1. Mover o worker para uma função serverless separada
2. Usar um volume persistente no Railway para dados
3. Considerar migração do frontend para outra plataforma (Netlify, Cloudflare Pages)

---

## 🎯 Como Testar Localmente

```bash
# Worker (backend)
cd E:\BeeHive\apps\worker
pnpm run dev

# Control Center (frontend)
cd E:\BeeHive\apps\control-center
pnpm run dev
```

Acesse: http://localhost:5173/negocios

---

## 📋 Commits Realizados

1. `eb6ee0d` - feat(cortes): reestruturação completa do módulo
2. `61392ca` - feat(worker): adicionar API de cortes ao worker backend  
3. `eeae4ba` - fix(worker): adicionar Prisma ao worker e corrigir build
4. `4f40733` - fix(worker): usar filesystem para cortar API (sem Prisma)

---

## 🔗 Links Úteis

- **Backend API:** https://beehive-production-d895.up.railway.app/api/cortes/channels
- **Frontend (ainda antigo):** https://beehiveos.vercel.app
- **Railway Dashboard:** https://railway.com/project/4fc5e8ce-7306-45c2-8a37-6ced56457470
- **GitHub:** https://github.com/bandittbr/BeeHive/tree/master
