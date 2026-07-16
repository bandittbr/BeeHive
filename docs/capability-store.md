# Capability Store

> Documentação viva de todas as capabilities do ecossistema BeeHive.

---

## foundation

| Capability | Status | Versão | Descrição | Adapters | Custo Médio |
|-----------|--------|--------|-----------|----------|-------------|
| chat.generate | `active` | 1 | Gera resposta de IA | OpenRouter, OpenAI, Ollama | ~$0.001/req |
| memory.search | `active` | 1 | Busca na memória | builtin | grátis |
| tool.execute | `active` | 1 | Executa ferramenta | builtin | grátis |

### chat.generate

**Input**
```typescript
{
  message: string;     // required - mensagem do usuário
  provider?: string;   // openrouter, openai, ollama
  model?: string;      // ex: meta-llama/llama-3.1-8b-instruct
  stream?: boolean;    // default: false
}
```

**Output**
```typescript
{
  response: string;    // resposta gerada
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }
}
```

**Eventos publicados**
- `chat:generated` — quando uma resposta é gerada

---

## Próximas capabilities (Fase 2+)

| Capability | Status | Plugin |
|-----------|--------|--------|
| browser.navigate | `planned` | browser |
| browser.scrape | `planned` | browser |
| browser.screenshot | `planned` | browser |
| image.generate | `planned` | content |
| video.generate | `planned` | content |

---

## Convenções

- Capabilities seguem o padrão `dominio.acao`
- Versão segue semver (1, 2, ...)
- Capabilities `active` são estáveis e podem ser usadas em workflows
- Capabilities `planned` estão em desenvolvimento

---

## browser

| Capability | Status | Versão | Descrição | Adapter | Custo |
|-----------|--------|--------|-----------|---------|-------|
| browser.navigate | `active` | 1 | Navega para URL e retorna título | Playwright | grátis (local) |
| browser.scrape | `active` | 1 | Extrai conteúdo como Markdown | Playwright | grátis (local) |
| browser.screenshot | `active` | 1 | Captura screenshot PNG | Playwright | grátis (local) |

### browser.navigate

**Input** `{ url: string }` ? **Output** `{ title: string, url: string }`

Navega para uma URL e retorna o título da página e a URL final (após redirects).

**Evento:** `browser:navigated`

### browser.scrape

**Input** `{ url: string }` ? **Output** `{ markdown: string, title: string }`

Extrai o conteúdo principal de uma URL e converte para Markdown. Remove scripts, navegação, footer, e elementos não essenciais.

**Evento:** `browser:scraped`

### browser.screenshot

**Input** `{ url: string, fullPage?: boolean }` ? **Output** `{ image: { artifactId, size, mimeType } }`

Captura screenshot da página como PNG. Opcionalmente captura a página inteira.

**Evento:** `browser:screenshotted`

---

## Exemplo de uso: Workflow Browser + Chat

```typescript
// 1. Navegar
const nav = await kernel.capabilities.resolve("browser.navigate")
  .execute({ url: "https://example.com" }, ctx);

// 2. Extrair
const scrape = await kernel.capabilities.resolve("browser.scrape")
  .execute({ url: "https://example.com" }, ctx);

// 3. Resumir com IA
const chat = await kernel.capabilities.resolve("chat.generate")
  .execute({ message: "Resuma: " + scrape.outputs.markdown }, ctx);

console.log(chat.outputs.response); // Resumo em texto
```
