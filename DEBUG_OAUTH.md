# 🔧 Corrigir Problema de Conexão OAuth

## Problema Identificado
O OAuth está funcionando (popup abre, faz login), mas a conta não aparece conectada na persona porque:
1. O callback não está passando o `state` (channelId) corretamente
2. O frontend não está recebendo o state para vincular à persona

## Solução

### Backend (Worker)
- Passar o `state` (channelId) na URL de redirecionamento
- Salvar a conta e retornar todos os dados

### Frontend (Vercel)
- Capturar o state da URL
- Vincular a conta à persona correta

## Teste Manual

Para testar o fluxo OAuth manualmente:

1. **Obter Auth URL:**
   ```
   https://beehive-production-d895.up.railway.app/oauth/youtube/start?redirectUri=https://beehive-production-d895.up.railway.app/oauth/youtube/callback&state=test_channel_123
   ```

2. **Fazer login no Google**

3. **Verificar callback:**
   ```
   https://beehiveos.vercel.app/negocios?connected=youtube&accountId=TESTE&displayName=Teste&state=test_channel_123
   ```

## Próximos Passos
- [ ] Corrigir callback para passar state
- [ ] Verificar se frontend está lidando com o state corretamente
- [ ] Testar fluxo completo
