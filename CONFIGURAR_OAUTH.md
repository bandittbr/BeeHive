# 🔧 Configurar Credenciais OAuth no BeeHive

## Suas Credenciais Encontradas

Você já tem uma credencial OAuth criada:

| Campo | Valor |
|-------|-------|
| **Nome** | YouTube Shorts Bot |
| **Client ID** | `961620008569-rjeue818a3gmjg44cl1rkq9fbb069qi3.apps.googleusercontent.com` |
| **Tipo** | Aplicativo da Web |

## Passo a Passo para Configurar

### 1️⃣ Acessar Detalhes da Credencial

Clique neste link:
```
https://console.cloud.google.com/apis/credentials/oauthclient/961620008569-rjeue818a3gmjg44cl1rkq9fbb069qi3.apps.googleusercontent.com?project=estudo-oab-a3ac7
```

### 2️⃣ Adicionar URI de Redirecionamento

Na página de detalhes da credencial:
1. Role até a seção **"URIs de redirecionamento autorizados"**
2. Clique em **"ADICIONAR URI"**
3. Cole exatamente isto:
   ```
   https://beehive-production-d895.up.railway.app/oauth/youtube/callback
   ```
4. Clique em **"SAVE"** (Salvar)

### 3️⃣ Obter Client Secret

**Opção A - Mostrar Secret:**
1. Procure por **"Client Secret"** na página
2. Clique no ícone de olho para mostrar
3. Copie o valor

**Opção B - Download JSON (se não conseguir mostrar):**
1. Clique nos três pontinhos (⋮) no canto superior direito
2. Selecione **"BAIXAR JSON"**
3. Abra o arquivo e copie o campo `client_secret`

### 4️⃣ Colar no BeeHive

1. Acesse: https://beehiveos.vercel.app/negocios
2. Vá em **Canais**
3. Expanda sua persona (ex: Risadola Cortes)
4. No campo **YouTube**, cole:
   - **Client ID:** `961620008569-rjeue818a3gmjg44cl1rkq9fbb069qi3.apps.googleusercontent.com`
   - **Client Secret:** (o valor que você copiou)
5. Clique em **"Salvar Credenciais"**
6. Clique em **"Conectar Conta"**

### 5️⃣ Autorizar no Google

Um popup do Google vai abrir. Faça login e autorize o acesso.

## Troubleshooting

### Erro "invalid_client"
- Verifique se copiou o Client Secret completo
- Verifique se não há espaços extras
- Certifique-se de que a URI de redirecionamento está salva

### Erro "redirect_uri_mismatch"
- Verifique se a URI está EXATAMENTE assim:
  ```
  https://beehive-production-d895.up.railway.app/oauth/youtube/callback
  ```
- Sem slashes extras no final

### API não ativada
- Acesse: https://console.cloud.google.com/apis/library
- Busque por "YouTube Data API v3"
- Clique em **ATIVAR**

## Resumo Rápido

✅ Credencial existe: **YouTube Shorts Bot**
✅ Client ID: `961620008569-rjeue818a3gmjg44cl1rkq9fbb069qi3.apps.googleusercontent.com`
⏳ Próximo passo: Adicionar URI de redirecionamento e obter Client Secret
