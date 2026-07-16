# External Weather Plugin

Um plugin BeeHive desenvolvido **fora do monorepo** — sem depender de caminhos relativos ou conhecimento interno do Kernel.

## Prova

Este plugin demonstra que:

1. Um terceiro pode criar novas capabilities sem modificar o Kernel
2. O SDK exporta tudo que é necessário (`CapabilityBuilder`, `Plugin`, tipos)
3. O PluginRegistry descobre o plugin automaticamente
4. A arquitetura suporta extensão externa

## Como usar

```bash
# Copiar o plugin para a pasta de plugins
cp -r examples/integrations/external-weather-plugin plugins/weather

# O Kernel descobre automaticamente no proximo boot
```

## O que ele faz

Recebe o nome de uma cidade e retorna:
- Temperatura atual
- Condicao climatica
- Umidade

Usa dados mockados internos (substituir por API real em produção).
