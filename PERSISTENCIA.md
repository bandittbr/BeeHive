# Configuração de Persistência - BeeHive Cortes

## Como os Dados São Salvos

### Backend (Railway)
Os dados são salvos em arquivos JSON no diretório:
```
/app/apps/worker/workspace/data/cortes/
```

**Arquivos criados:**
- `channels.json` - Canais/Personas
- `social-accounts.json` - Contas conectadas
- `projects.json` - Projetos de cortes
- `settings.json` - Configurações globais

### Volume Persistente
O Railway fornece um volume persistente de **500MB** em `/app/apps/worker/workspace/`.

Isso significa que os dados **NÃO somem** quando o container reinicia.

---

## Testando Localmente

Para testar a persistência local:

```bash
cd E:\BeeHive\apps\worker
pnpm run dev
```

Os dados serão salvos em:
```
E:\BeeHive\apps\worker\workspace\data\cortes\
```

---

## Verificando se os Dados Persistem

### 1. Criar um Canal
Acesse: https://beehiveos.vercel.app/negocios
- Crie uma persona "Teste"

### 2. Reiniciar o Backend
No Railway:
```bash
railway restart --service BeeHive
```

Ou aguarde o rebuild automático.

### 3. Verificar Persistência
- Atualize a página
- A persona "Teste" deve continuar lá!

---

## Problemas Comuns

### Dados Somen do Nada?
- Verifique se o volume do Railway está montado
- Verifique permissões de escrita

### Erro ao Salvar?
- Verifique se há espaço suficiente no volume
- Verifique se o arquivo não está corrompido

---

## Próximos Passos

Para produção definitiva:
1. Migrar para SQLite/PostgreSQL (melhor que JSON files)
2. Adicionar backup automático
3. Implementar sync entre múltiplos workers
