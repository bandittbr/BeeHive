# 🔧 Resolver Erro 401: invalid_client

## O Problema
O erro "invalid_client" significa que as credenciais OAuth enviadas ao Google são inválidas. Pode ser:
- Client ID ou Secret incorretos
- Credencial foi regenerada/excluída
- URI de redirecionamento errada

## Solução Passo a Passo

### 1️⃣ Limpar Credenciais Antigas
Acesse: https://console.cloud.google.com/apis/credentials

**Procure por qualquer credencial chamada "BeeHive" e EXCLUA todas elas.**

### 2️⃣ Criar Nova Credencial (Passo a Passo)

1. Clique em **"CRIAR CREDENCIAIS"**
2. Selecione **"OAuth 2.0 Client ID"**

3. **Configure o tipo:**
   - Tipo de aplicação: **"Aplicativo da Web"**

4. **Nome:** `BeeHive Cortes`

5. **URIs de redirecionamento autorizados:**
   ```
   https://beehive-production-d895.up.railway.app/oauth/youtube/callback
   ```

6. **Clique em "CRIAR"**

### 3️⃣ COPIAR CREDENCIAIS (⚠️ CRÍTICO!)

Na janela que abrir, você verá:
```json
{
  "installed": {
    "client_id": "123456789-abc.apps.googleusercontent.com",
    "client_secret": "GOCxxx..."
  }
}
```

**COPIE AMBOS OS VALORES AGORA!**

Se você não copiou, feche a janela e crie uma NOVA credencial.

### 4️⃣ Colar no BeeHive

1. Acesse: https://beehiveos.vercel.app/negocios
2. Vá em **Canais**
3. Expanda sua persona (ex: Risadola Cortes)
4. Na seção **YouTube**, cole:
   - Client ID: `123456789-abc.apps.googleusercontent.com`
   - Client Secret: `GOCxxx...`
5. Clique em **"Salvar Credenciais"**
6. Clique em **"Conectar Conta"**

### 5️⃣ Autorizar no Google

Um popup vai abrir. Faça login com `beehive.automacao@gmail.com` e autorize.

## Verificações Importantes

### ✅ Verifique no Google Cloud Console:
- [ ] A API "YouTube Data API v3" está **ATIVADA**
- [ ] A URI de redirecionamento está **exatamente** assim:
  ```
  https://beehive-production-d895.up.railway.app/oauth/youtube/callback
  ```
- [ ] Não há espaços extras nas credenciais

### ✅ No BeeHive:
- [ ] Cole o Client ID completo (termina em `.apps.googleusercontent.com`)
- [ ] Cole o Client Secret completo
- [ ] Clique em "Salvar Credenciais" ANTES de clicar "Conectar Conta"

## Se Ainda Der Erro

1. **Exclua TODAS as credenciais OAuth do Google Cloud**
2. **Crie uma NOVA** (não use a mesma)
3. **Copie imediatamente** antes de fechar a janela
4. **Cole no BeeHive** e teste

## Dica Importante
O Google **NUNCA mostra o Client Secret depois de criado**. Você só vê uma vez na janela de criação. Se perdeu, precisa criar outra credencial do zero.
