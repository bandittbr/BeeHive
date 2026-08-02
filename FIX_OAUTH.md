# 🔄 Corrigir Fluxo OAuth

## Problema Identificado
O popup do OAuth está abrindo mas não fechando corretamente e a conta não está sendo conectada.

## Solução Aplicada

### 1️⃣ Backend (Railway)
O callback OAuth agora passa o `state` (channelId) de volta para o frontend.

### 2️⃣ Frontend (Vercel)
- Popup monitora se foi fechado
- Listener de mensagens captura o sucesso do OAuth
- Redirecionamento corrato com parâmetros

## Como Testar Agora

### Passo 1: Configurar Credenciais no Google Cloud
Acesse: https://console.cloud.google.com/apis/credentials

1. Clique na credencial **"YouTube Shorts Bot"**
2. Adicione estas URIs de redirecionamento:
   ```
   https://beehive-production-d895.up.railway.app/oauth/youtube/callback
   https://beehiveos.vercel.app/negocios
   ```
3. Salve

### Passo 2: Testar no BeeHive
1. Acesse: https://beehiveos.vercel.app/negocios
2. Vá em **Canais**
3. Expanda sua persona
4. Clique em **"Conectar Conta"** no YouTube
5. Faça login no popup
6. Autorize o acesso
7. O popup deve fechar e a conta aparecer conectada!

## Se ainda não funcionar

### Verifique no Console do Navegador (F12):
```javascript
// No console, digite:
window.location.search
// Deve mostrar: ?connected=youtube&accountId=...&state=...
```

### Teste Manual:
1. Abra o popup manualmente:
   ```
   https://beehive-production-d895.up.railway.app/oauth/youtube/start?redirectUri=https://beehive-production-d895.up.railway.app/oauth/youtube/callback&state=teste123
   ```
2. Faça login e veja se redireciona corretamente

## Erros Comuns

### "redirect_uri_mismatch"
- A URI no Google Cloud NÃO está cadastrada
- Verifique se está EXATAMENTE: `https://beehive-production-d895.up.railway.app/oauth/youtube/callback`

### "invalid_client"
- Client ID ou Secret incorretos
- Regenerar secret no Google Cloud

### Popup não fecha
- Bloqueador de popup no navegador
- Verifique permissões do site
