# 🧪 Testando o OAuth - Passo a Passo

## Configuração Atual

✅ **YouTube Shorts Bot** - Credencial OAuth 2.0
- Client ID: `961620008569-rjeue818a3gmjg44cl1rkq9fbb069qi3.apps.googleusercontent.com`
- Tipo: Aplicativo da Web

✅ **URIs de Redirecionamento Configuradas:**
```
https://beehive-production-d895.up.railway.app/oauth/youtube/callback
https://beehiveos.vercel.app/negocios
https://beehiveos.vercel.app/
http://localhost/oauth/youtube/callback
```

## Como Testar Agora

### 1️⃣ Acessar o BeeHive
Abra: https://beehiveos.vercel.app/negocios

### 2️⃣ Criar/Selecionar Persona
- Se não tiver persona, crie uma (ex: "Risadola Cortes")
- Clique na persona para expandir

### 3️⃣ Configurar YouTube OAuth
1. No campo **Client ID**, cole:
   ```
   961620008569-rjeue818a3gmjg44cl1rkq9fbb069qi3.apps.googleusercontent.com
   ```
2. No campo **Client Secret**, cole o secret da sua credencial
3. Clique em **"Salvar Credenciais"**
4. Aguarde o confirmation verde

### 4️⃣ Conectar Conta
1. Clique em **"Conectar Conta"** (botão com ícone Globe)
2. Você será redirecionado para o Google
3. Faça login com `beehive.automacao@gmail.com`
4. Clique em **"Continuar"** para autorizar
5. Você voltará automaticamente para o BeeHive
6. A conta deve aparecer conectada!

## Troubleshooting

### Erro "redirect_uri_mismatch"
Verifique se as URIs estão EXATAMENTE assim no Google Cloud Console:
```
https://beehive-production-d895.up.railway.app/oauth/youtube/callback
```
Sem espaços, sem slash no final.

### Erro "invalid_client"
- Verifique se o Client ID está correto
- O Client Secret pode ter expirado/regenerado? Crie uma nova credencial

### Página fica carregando
- Verifique o console do navegador (F12 → Console)
- Pode haver erro de CORS ou JavaScript

## Status do Sistema

- ✅ Backend: Online (Railway)
- ✅ Frontend: Online (Vercel)
- ✅ YouTube OAuth: Configurado
- ✅ URIs: Configuradas
- ⏳ Aguardando teste do usuário
