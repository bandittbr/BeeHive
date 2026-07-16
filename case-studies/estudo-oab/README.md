# Caso de Uso: Estudo OAB Content Factory

## Objetivo

Produzir um Short para Instagram sobre um tema jurídico (Ex: Princípio da Insignificância) em um único comando.

## Workflow

```
Tema (Ex: "Princípio da Insignificância")
    ↓
chat.generate — Pesquisa jurídica (fundamentos, jurisprudência, doutrina)
    ↓
chat.generate — Resumo didático para leigo
    ↓
chat.generate — Roteiro curto (60s)
    ↓
[próximo sprint] image.generate — thumbnail / cenas
    ↓
[próximo sprint] video.generate — Short com narração e legendas
    ↓
Artifact(video) + legenda + hashtags
```

## Capabilities envolvidas

| Capability | Uso | Status |
|------------|-----|--------|
| `chat.generate` | Pesquisa, resumo, roteiro, legenda | ✅ Mock |
| `chat.generate` (templates) | Prompt engineering para tom jurídico-didático | ✅ Mock |
| `image.generate` | Thumbnail e cenas | ⏳ Pendente |
| `video.generate` | Montagem do Short | ⏳ Pendente |
| `tool.execute` | (opcional) scraping de jurisprudência real | ⏳ |

## Artifacts gerados

- Roteiro (markdown)
- Legenda (texto)
- Hashtags (lista)
- [próximo] Imagem (PNG)
- [próximo] Vídeo (MP4)

## Resultado esperado

Um comando:

```bash
pnpm example:oab-short --tema="Princípio da Insignificância"
```

Gera tudo que precisa para publicar um Short no Instagram do Estudo OAB:

```
✅ Roteiro (60s)
✅ Legenda otimizada
✅ Hashtags
✅ Thumbnail
✅ Vídeo
```

## Métricas de sucesso

| Métrica | Meta |
|---------|------|
| Tempo total do workflow | < 60s |
| Custo por execução (LLM) | < R$ 0,10 |
| Taxa de sucesso | > 95% |
| Intervenções manuais | 0 |
| Tempo economizado por post | ~ 2h |

## Status atual

`chat.generate` funciona com MockAdapter. Roteiro, título e descrição são gerados.
Faltam: `image.generate`, `video.generate`, e a integração ponta-a-ponta.

## Próximos passos

1. Implementar `image.generate` (thumbnail + cenas)
2. Implementar `video.generate` (montagem com narração TTS)
3. Workflow completo executável
4. Publicação automática no Instagram
