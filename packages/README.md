# packages — Código compartilhado

> Deixou de estar vazio na Sprint 12: `platform` é o primeiro pacote.

## `platform` (`@beehive/platform`)

Kernel, Module System, Service Layer, AI Layer, Tool System e Runtime —
extraídos de `apps/web` para um pacote de workspace compartilhado. É
agnóstico de ambiente (TypeScript puro, sem React/DOM): hoje é hospedado por
`apps/api` (Node), que executa o Runtime como processo próprio e o expõe por
HTTP/WebSocket (ver `docs/sprints/Sprint_12.md`). `apps/web` também depende
dele, mas hoje só para tipos/contratos e as constantes de comando/evento da
Conversa — nunca para instanciar a plataforma localmente.

```
packages/platform/src/
├── kernel/     # Event Bus, Command Dispatcher, Service Registry, Config, Logger
├── modules/    # Sistema de módulos + os 9 módulos de domínio
├── services/   # Service Layer (fundação: BaseService, ServiceManager)
├── ai/         # AI Layer (contratos, registro, manager — sem provedores)
├── tools/      # Tool System (contratos, registro, manager — sem tools)
└── runtime/    # RuntimeManager/RuntimeLifecycle — orquestra o boot de tudo
```

Novos pacotes compartilhados nascem aqui seguindo o mesmo princípio de não
criar código desnecessário (`docs/03_Development_Guide.md`): só quando algo
de fato precisa ser compartilhado entre `apps/web` e `apps/api`.
