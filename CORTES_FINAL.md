# BeeHive - Módulo de Cortes - Documentação Final

## 🎯 Objetivo
Reformular completamente a área de **Negócios > Cortes** do BeeHive, utilizando o gerador de cortes existente.

## ✅ Funcionalidades Implementadas

### 1. Estrutura de Negócio
```
Negócios
├── Cortes
│   ├── Canais & Redes (Persona + OAuth)
│   ├── OAuth (Configuração de credenciais)
│   └── Configurações (Legendas, cores, vídeo)
└── Leads
```

### 2. Personas / Canais
- Criar personas organizadas (ex: "Risadola Cortes")
- Agrupar contas de rede social por persona
- Expandir/recolher cada persona

### 3. OAuth Multi-plataforma
Conexão oficial com:
- ✅ YouTube
- ✅ Instagram
- ✅ Facebook
- ✅ TikTok
- ✅ X (Twitter)

### 4. Agendamento Seguro
Regras anti-ban:
- Mínimo 60min entre posts
- Máximo 3 posts/dia por rede
- Evitar horários noturnos (22h-6h)
- Horários seguros: 9h, 12h, 15h, 18h, 21h

### 5. Publicação Automática
- Backend já suporta publicação em todas as plataformas
- Scheduler roda a cada 30 segundos
- Supporta YouTube, Instagram, Facebook, TikTok

## 📁 Arquivos Criados/Modificados

### Frontend (Vercel)
```
apps/control-center/src/
├── components/cortes/
│   ├── CortesView.tsx          # Página mestre
│   ├── ChannelsManager.tsx     # Gerenciador de personas
│   ├── OauthSettings.tsx       # Configuração OAuth
│   ├── CorteSettings.tsx       # Configurações de vídeo
│   ├── cortes.css              # Estilos
│   └── cortes-responsive.css   # Estilos mobile
├── services/
│   └── cortes-api.ts           # API service
├── stores/
│   └── appStore.ts             # Estado de cortes
└── types/
    └── cortes.ts               # Tipos TypeScript
```

### Backend (Railway)
```
apps/worker/src/
├── cortes-api.ts               # Rotas REST
├── oauth.ts                    # OAuth flows
└── index.ts                    # Rotas de OAuth (+ fix auth)
```

### Banco de Dados (SQLite)
```
prisma/schema.prisma
├── CorteChannel
├── CorteSocialAccount
├── CorteProject
├── CorteClip
└── CorteSettings
```

## 🔧 Como Usar

### 1. Configurar OAuth
1. Acesse https://beehiveos.vercel.app/negocios
2. Vá na aba **OAuth**
3. Preencha Client ID e Secret do YouTube (ou outra rede)
4. Salve

### 2. Criar Persona
1. Vá na aba **Canais**
2. Clique "Nova Persona"
3. Nome: "Risadola Cortes"
4. Categoria: "Comédia"

### 3. Conectar Conta
1. Expanda a persona
2. Clique no ícone da rede social
3. Faça login no popup
4. Conta conectada!

### 4. Publicar Cortes
1. Crie um projeto de cortes
2. Cole a URL do vídeo
3. Gere os cortes
4. Agende a publicação (ou publique agora)

## 🌐 URLs
- **Frontend:** https://beehiveos.vercel.app/negocios
- **Backend API:** https://beehive-production-d895.up.railway.app
- **API Health:** https://beehive-production-d895.up.railway.app/health

## 🚀 Deploy
- **Frontend:** Vercel (automático via GitHub)
- **Backend:** Railway (automático via GitHub)

## 📝 Commits Principais
1. `eb6ee0d` - Reestruturação inicial dos Cortes
2. `c811bf3` - Unificação Canais + Redes Sociais
3. `90aae60` - Implementação OAuth
4. `c2fcd43` - Agendamento seguro anti-ban
5. `36ab8e0` - Interface OAuth settings
6. `f6f646e` - Correção scroll/mobile
7. `2eb4f56` - Correção erro unauthorized OAuth

## 🔒 Segurança
- OAuth usa fluxo oficial de cada rede social
- Tokens são armazenados no banco SQLite
- Agendamento respeita limites das plataformas
- SPA routing configurado no Vercel
