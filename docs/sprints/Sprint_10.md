# Sprint 10 — Tool System

> A camada por onde **toda** ação da IA no mundo externo acontece. Nenhum Service
> ou Provider executa uma ação diretamente — tudo passa pelo `ToolManager`.
> Esta Sprint entrega apenas a arquitetura: nenhuma Tool implementada.

- **Entregue:** `ToolManager`, `ToolRegistry`, `ToolContext`, `ToolRequest`,
  `ToolResponse`, `BaseTool`, `ToolInterface` (`Tool`), `ToolExecutor`, ciclo de
  vida, categorias, manifesto (vazio) e a integração com o `AIManager`.
- **Não implementado:** nenhuma Tool, nenhuma Tool Call automática.

---

## 1. Arquitetura

```
AIManager  ──(ToolExecutor)──►  ToolManager  ──descobre──►  ToolRegistry
   │  (única forma da IA agir              │  (Registered → Initializing →
   │   no mundo externo)                   │   Available; Busy na execução)
   │                                        ▼
   │                                       Tool.execute(input, ToolContext)
   ▼                                        │
 Providers  ✗ nunca conhecem Tools          ▼
                                          ToolResponse (success/output/error)
```

- **`Tool`** (interface): `id`, `name`, `version`, `description`, `category`,
  `capabilities`, `initialize`, `execute`, `health`, `status`, `dispose`.
- **`BaseTool`**: base com padrões; a Tool concreta implementa só `execute`.
- **`ToolCategory`**: catálogo (filesystem, browser, terminal, git, python, ocr,
  speech, imageGeneration, videoGeneration, ffmpeg, editor, search, network,
  system) — nenhuma implementada.
- **`ToolRequest`/`ToolResponse`**: a solicitação (por `toolId` + input) e o
  resultado (sucesso/erro explícitos).
- **`ToolContext`**: contexto de execução (requestId, toolId, logger, signal p/
  cancelar, metadata) criado pelo ToolManager.
- **`ToolRegistry`**: guarda e descobre Tools (por id, categoria, capacidade).
- **`ToolManager`**: o **único** executor. Descobre pelo Registry, gerencia o
  ciclo de vida, executa (marca `Busy`/`Available`), emite eventos e expõe
  snapshots. Depende de abstrações (registry, logger, event bus) por injeção.
- **`ToolExecutor`**: o contrato que o `AIManager` usa — ele não conhece o
  ToolManager concreto nem nenhuma Tool.

### Ciclo de vida
`Registered → Initializing → Available` (e `Busy` durante a execução, voltando a
`Available`). `Failed` se a Tool falha ao inicializar; `Disposed` ao encerrar. Um
erro de execução vira `ToolResponse { success:false }` **sem** desativar a Tool.

---

## 2. Como uma Tool será criada no futuro

```ts
class ReadFileTool extends BaseTool {
  readonly id = 'filesystem.readFile';
  readonly name = 'Ler arquivo';
  readonly version = '0.1.0';
  readonly description = 'Lê um arquivo do disco';
  readonly category = 'filesystem' as const;
  readonly capabilities = ['read'];
  async execute(input: { path: string }, ctx: ToolContext): Promise<string> {
    // ... a única parte que toca o mundo externo ...
    return conteudo;
  }
}
```
Depois, registrar no `TOOL_MANIFEST` (ou via `getToolRegistry().register(...)`).
O ToolManager registra, inicializa e passa a executar automaticamente — nada mais
muda.

## 3. Como a IA usará uma Tool

Nenhum provider executa ações. Quando (em sprint futura) a IA precisar agir, o
**AIManager** orquestra a Tool Call pelo Tool System:

```ts
// dentro do AIManager (Tool Call futura):
const disponiveis = this.tools();                 // expõe as tools ao modelo
const resposta = await this.runTool({             // executa a escolhida
  toolId: 'filesystem.readFile',
  input: { path: '/notas.md' },
});
```
`runTool` delega ao `ToolExecutor` (o ToolManager). O provider nunca vê Tools; o
Service nunca executa uma ação — tudo passa pelo ToolManager.

---

## Validação

- **Teste automatizado** (Node, via esbuild): 15 asserções — descoberta e ciclo
  de vida (Available após load; init-fail → Failed), execução com sucesso
  (Busy→Available, output, `ToolExecuted`), erro de execução → `ToolResponse`
  success=false sem desativar a Tool (`ToolFailed`), tool inexistente → falha,
  `findByCategory`/`findByCapability`, e o **AIManager usando o ToolManager**
  (`runTool` delega, `tools()` lista, sem executor → erro). **Passou.**
- **Sintaxe/imports:** `tools/*`, `ai/AIManager.ts`, `app/bootstrap.ts`,
  `kernel/types.ts` (eventos — aditivo) — OK.
- **Nada quebrado:** Tool System autocontido; o boot cria o registry/manager
  (manifesto vazio) e injeta o executor no AIManager, aditivo.

## Arquivos criados/alterados

- Novos: `tools/{types,BaseTool,ToolRegistry,ToolManager,manifest,index}.ts`.
- Alterados: `ai/AIManager.ts` (usa `ToolExecutor`), `app/bootstrap.ts` (wire +
  `getToolManager`/`getToolRegistry`), `kernel/types.ts` (eventos de Tool).

## Decisões

- **`ToolExecutor` como contrato:** o AIManager depende dele, não do ToolManager
  concreto (DIP) — e nenhum provider recebe Tools (o `AIContext` não as expõe).
- **Erro de execução ≠ Tool quebrada:** a Tool volta a `Available`; só falha de
  inicialização a marca `Failed`. Robustez para uso contínuo.
- **Anti-especulação:** nenhuma Tool, nenhuma Tool Call automática; só a
  infraestrutura e os contratos de categoria, prontos para toda a evolução.
