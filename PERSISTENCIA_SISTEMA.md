# Sistema de Persistência - BeeHive Cortes

## Problema Encontrado
O volume do Railway está **QUASE CHEIO** (493/500 MB).

Isso impedia a criação de novos arquivos de dados, fazendo com que os dados não persistissem.

## Solução Aplicada
Mudei o sistema para usar **memória RAM** ao invés de arquivos no disco.

### Vantagens:
- ✅ Funciona imediatamente
- ✅ Mais rápido (sem I/O de disco)
- ✅ Não ocupa espaço no volume

### Desvantagens:
- ⚠️ Dados somem se o container reiniciar
- ⚠️ Dados não persistem entre deployments

## Como Testar a Persistência

### 1. Criar Dados
```bash
curl -X POST https://beehive-production-d895.up.railway.app/api/cortes/channels \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","category":"Comédia"}'
```

### 2. Verificar
```bash
curl https://beehive-production-d895.up.railway.app/api/cortes/channels
```

### 3. Reiniciar e Verificar
```bash
railway restart --service BeeHive
curl https://beehive-production-d895.up.railway.app/api/cortes/channels
# Response: [] (dados perderam porque estão em RAM)
```

## Para Persistência Real

### Opção 1: Limpar Volume (Recomendado)
1. Acessar Railway Dashboard
2. Ir em Volumes
3. Limpar arquivos desnecessários
4. Reiniciar o serviço

### Opção 2: Adicionar SQLite
1. Adicionar variável de ambiente DATABASE_URL
2. Usar Prisma para salvar em SQLite
3. SQLite salva no volume persistente

### Opção 3: Adicionar PostgreSQL
1. Adicionar resource PostgreSQL no Railway
2. Configurar DATABASE_URL
3. Migrar dados para SQL

## Recomendação
Para uso contínuo, recomendo adicionar um **SQLite** ou **PostgreSQL** para garantir que os dados persistam entre reinicializações.

## Próximos Passos
- [ ] Limpar volume do Railway
- [ ] Adicionar SQLite para persistência
- [ ] Testar persistência após reinicialização
