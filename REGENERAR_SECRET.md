# 🔄 Como Obter o Client Secret

## Passo 1: Regenerar o Secret

Na página da credencial "YouTube Shorts Bot":
1. Procure por **"Client Secret"**
2. Você verá um botão **"REGENERAR SECRET"** ou **"SHOW SECRET"**
3. Clique em **"REGENERAR SECRET"**
4. Confirme a ação

⚠️ **IMPORTANTE:** Ao regenerar, o secret ANTERIOR PARA DE FUNCIONAR!

## Passo 2: Copiar IMEDIATAMENTE

Depois de regenerar, você verá:
- **Client ID:** `961620008569-rjeue818a3gmjg44cl1rkq9fbb069qi3.apps.googleusercontent.com`
- **Client Secret:** `GOCxxx...` (novo valor)

**COPIE AMBOS AGORA!**

## Passo 3: Colar no BeeHive

1. Acesse: https://beehiveos.vercel.app/negocios
2. Vá em **Canais**
3. Expanda sua persona
4. No campo **YouTube**, cole:
   - Client ID: `961620008569-rjeue818a3gmjg44cl1rkq9fbb069qi3.apps.googleusercontent.com`
   - Client Secret: (o NOVO valor que você copiou)
5. Clique em **"Salvar Credenciais"**
6. Clique em **"Conectar Conta"**

## Verificação Importante

Certifique-se de que a URI de redirecionamento está configurada:
```
https://beehive-production-d895.up.railway.app/oauth/youtube/callback
```

Se não estiver, adicione nos "URIs de redirecionamento autorizados".
