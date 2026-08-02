# Resolver Erro 401: invalid_client

## Problema
O erro acontece quando o Client ID ou Secret estão incorretos no Google Cloud Console.

## Solução

### Passo 1: Verificar Credenciais Atuais
Acesse: https://console.cloud.google.com/apis/credentials

Verifique se existe uma credencial chamada "BeeHive" (ou similar).

### Passo 2: Se NÃO existir, Criar Nova Credencial
1. Clique em **"CRIAR CREDENCIAIS"**
2. Selecione **"OAuth 2.0 Client ID"**
3. **Tipo de aplicação:** "Aplicativo da Web"
4. **Nome:** "BeeHive Cortes"
5. Em **"URIs de redirecionamento autorizados"**, clique em **"ADICIONAR URI"**
6. Cole esta URI:
   ```
   https://beehive-production-d895.up.railway.app/oauth/youtube/callback
   ```
7. Clique em **"CRIAR"**

### Passo 3: Copiar Credenciais (IMPORTANTE!)
Na janela que abrir, você verá:
- **Client ID** (ex: `123456789-abc.apps.googleusercontent.com`)
- **Client Secret** (ex: `GOCxxx...`)

⚠️ **COPIE AMBOS AGORA!** O Google não mostra o Secret depois.

### Passo 4: Salvar no BeeHive
1. Acesse: https://beehiveos.vercel.app/negocios
2. Crie uma Persona (se não tiver)
3. Expanda a persona
4. Na seção OAuth, cole:
   - **Client ID:** (o que você copiou)
   - **Client Secret:** (o que você copiou)
5. Clique em **"Salvar Credenciais"**
6. Clique em **"Conectar Conta"**

### Passo 5: Conectar Conta
Um popup do Google abrirá. Faça login e autorize o acesso.

## Se o Erro Persistir

Verifique:
- [ ] O Client ID está correto (termine em `.apps.googleusercontent.com`)
- [ ] O Client Secret foi copiado completamente
- [ ] A URI de redirecionamento está configurada no Google Cloud
- [ ] A API YouTube Data API v3 está ativada no projeto

## Como Ativar YouTube Data API v3
1. Acesse: https://console.cloud.google.com/apis/library
2. Busque por "YouTube Data API v3"
3. Clique em **"ATIVAR"**

## Testar após Configurar
Depois de salvar no BeeHive, tente conectar novamente.
