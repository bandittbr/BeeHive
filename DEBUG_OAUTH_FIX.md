# Debug OAuth - Problema de Conexão

## Problema
Após fazer login no Google, a página volta para o BeeHive mas a conta continua mostrando como desconectada.

## Diagnóstico

### 1. Verificar se o callback está sendo chamado
- Após o login no Google, o usuário é redirecionado para:
  `https://beehive-production-d895.up.railway.app/oauth/youtube/callback?code=...&state=...`
  
- Verificar se o callback retorna um redirecionamento para o frontend

### 2. Verificar se a conta está sendo criada
- O callback deve criar uma conta no sistema de contas do worker
- Mas o frontend está usando uma API diferente (/api/cortes/social-accounts)

### 3. Problema identificado
O fluxo atual tem DUAS APIs separadas:
- `/oauth/*/callback` - Cria conta na tabela `beehive_accounts`
- `/api/cortes/social-accounts` - Gerencia contas na tabela `corte_social_account`

Elas NÃO estão conectadas!

## Solução

Precisamos:
1. Ou unificar as duas APIs
2. Ou fazer o callback OAuth criar também na API de cortes

## Opção 1: Unificar APIs (Recomendado)

Modificar o callback OAuth para:
1. Criar conta no sistema existente (`beehive_accounts`)
2. TAMÉM criar na API de cortes (`corte_social_account`)
3. Vincular à persona (channelId)

## Código Necessário

No callback OAuth, adicionar:
```typescript
// Após criar na tabela beehive_accounts...
// Criar também na API de cortes
const corteAccount = await fetch(`${BACKEND_URL}/api/cortes/social-accounts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    platform,
    accountId: r.accountId,
    displayName: r.displayName,
    channelId: state, // O channelId vem do state
  }),
});
```

## Próximos Passos
1. Atualizar o callback OAuth no index.ts
2. Testar o fluxo completo
3. Verificar se a conta aparece na persona
