# Reestruturação do Módulo Cortes — BeeHive

## Resumo da Implementação

A área de **Negócios > Cortes** foi completamente reformulada como um sistema profissional de gerenciamento e produção automática de cortes de vídeo.

---

## Estrutura Criada

### Base de Dados (Prisma)
```sql
- CorteChannel      → Canais com categoria e descrição
- CorteSocialAccount → Contas de redes sociais (YouTube, Instagram, etc.)
- CorteProject       → Projetos de cortes com status e configurações
- CorteClip          → Cortes individuais com título, legenda, hashtags
- CorteSettings      → Configurações globais de legendas e vídeo
```

### Componentes React (Frontend)

| Arquivo | Função |
|---------|--------|
| `CortesView.tsx` | Página mestre com navegação por abas |
| `ProjetosView.tsx` | Lista de projetos com busca e cards |
| `NewProjectForm.tsx` | Formulário para criar novo projeto |
| `ProjectDetail.tsx` | Visualização detalhada + geração de cortes |
| `ChannelsManager.tsx` | Gerenciamento de canais e redes sociais |
| `CorteSettings.tsx` | Configurações de legendas, cores e vídeo |

### API Routes (Next.js)
```
GET    /api/cortes/channels
POST   /api/cortes/channels
PATCH  /api/cortes/channels/:id
DELETE /api/cortes/channels/:id

GET    /api/cortes/social-accounts
POST   /api/cortes/social-accounts
DELETE /api/cortes/social-accounts/:id

GET    /api/cortes/projects
GET    /api/cortes/projects/:id
POST   /api/cortes/projects
PATCH  /api/cortes/projects/:id
DELETE /api/cortes/projects/:id

POST   /api/cortes/generate  ← Integra com AI-Youtube-Shorts-Generator

GET    /api/cortes/settings
POST   /api/cortes/settings
```

---

## Navegação Atualizada

**Antes:**
```
Negócios
├── Conteúdo Digital
├── Leads
├── Modelos Virtuais
├── Canal Dark
├── Criador de Conteúdo
└── Afiliados
```

**Depois:**
```
Negócios
├── Cortes
│   ├── Projetos
│   ├── Canais & Redes
│   └── Configurações
└── Leads
```

Os itens removidos (**Modelos Virtuais, Canal Dark, Criador de Conteúdo, Afiliados**) permanecem no código original, apenas não aparecem mais na navegação.

---

## Integração com Motor Existente

O gerador localizado em `E:\BeeHive\AI-Youtube-Shorts-Generator` é chamado via subprocess:

```typescript
// Exemplo de chamada no backend
const result = execSync(
  `python "main.py" "${url}" --num-clips ${numClips} --aspect-ratio ${format}`,
  { cwd: generatorPath }
);
```

---

## Como Testar

1. Iniciar o desenvolvimento:
   ```bash
   cd E:\BeeHive
   npm run dev:web
   ```

2. Acessar: `http://localhost:5173/negocios`

3. O fluxo completo:
   - Criar um canal → Cadastrar rede social → Criar projeto → Gerar cortes

---

## Arquivos Criados/Modificados

### Novos arquivos (10):
- `prisma/migrations/20260801_add_cortes_tables/migration.sql`
- `apps/control-center/src/types/cortes.ts`
- `apps/control-center/src/services/cortes-api.ts`
- `apps/control-center/src/components/cortes/CortesView.tsx`
- `apps/control-center/src/components/cortes/ProjetosView.tsx`
- `apps/control-center/src/components/cortes/NewProjectForm.tsx`
- `apps/control-center/src/components/cortes/ProjectDetail.tsx`
- `apps/control-center/src/components/cortes/ChannelsManager.tsx`
- `apps/control-center/src/components/cortes/CorteSettings.tsx`
- `apps/control-center/src/components/cortes/cortes.css`

### Arquivos modificados (4):
- `prisma/schema.prisma` → Adicionados modelos Corte*
- `apps/control-center/src/stores/appStore.ts` → Adicionado estado de cortes
- `apps/control-center/src/App.tsx` → Integrado novo CortesView
- `apps/control-center/src/app/api/cortes/route.ts` → Rotas API (Next.js)
