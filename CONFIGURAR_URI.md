# 🔧 Configurar URI de Redirecionamento no Google Cloud

## Problema
Erro: `redirect_uri_mismatch`

## Solução

### 1️⃣ Acessar Credenciais OAuth
Clique neste link para editar sua credencial:
```
https://console.cloud.google.com/apis/credentials/oauthclient/961620008569-rjeue818a3gmjg44cl1rkq9fbb069qi3.apps.googleusercontent.com?project=estudo-oab-a3ac7
```

### 2️⃣ Adicionar URIs de Redirecionamento
Na seção **"URIs de redirecionamento autorizados"**, adicione estas URIs:

```
https://beehive-production-d895.up.railway.app/oauth/youtube/callback
http://localhost/oauth/youtube/callback
https://beehiveos.vercel.app/oauth/youtube/callback
https://beehiveos.vercel.app/
```

### 3️⃣ Salvar
Clique em **"SAVE"** (Salvar)

### 4️⃣ Regenerar Secret (se necessário)
Se o botão "MOSTRAR SECRET" não estiver disponível:
1. Role até encontrar "Client Secret"
2. Clique em **"REGENERAR SECRET"**
3. **COPIE O NOVO VALOR**

### 5️⃣ Colar no BeeHive
1. Acesse: https://beehiveos.vercel.app/negocios
2. Vá em **Canais**
3. Expanda sua persona
4. No campo **YouTube**, cole:
   - Client ID: `961620008569-rjeue818a3gmjg44cl1rkq9fbb069qi3.apps.googleusercontent.com`
   - Client Secret: (o novo valor que você copiou)
5. Clique em **"Salvar Credenciais"**
6. Clique em **"Conectar Conta"**

## Notas Importantes
- A URI deve ser **exatamente** como listado acima
- Sem espaços extras
- Com `https://` no início
- Sem slash no final (exceto onde indicado)
