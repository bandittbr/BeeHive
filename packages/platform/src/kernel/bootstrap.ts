import { AgentManager } from './AgentManager';
import { CommandDispatcher } from './CommandDispatcher';
import { ConfigurationManager } from './ConfigurationManager';
import { EventBus } from './EventBus';
import { Kernel } from './Kernel';
import { Logger } from './Logger';
import { MemoryManager } from './MemoryManager';
import { ModuleLoader } from './ModuleLoader';
import { PluginManager } from './PluginManager';
import { Scheduler } from './Scheduler';
import { ServiceRegistry } from './ServiceRegistry';
import type { EnvironmentName } from './types';

/**
 * Bootstrap do Kernel — o único lugar que conhece as implementações concretas
 * e as injeta. Trocar qualquer peça (ex.: um EventBus distribuído) é mudar
 * apenas aqui; o resto do sistema depende só dos contratos.
 */

/**
 * Detecta o ambiente sem depender de tipos exclusivos do Vite: `import.meta.env`
 * só existe quando este pacote é empacotado pelo Vite (Web); em Node (apps/api,
 * via tsx) a propriedade simplesmente não existe. Tratada como opcional para
 * funcionar nos dois hosts sem `try/catch` nem tipagem amarrada ao bundler.
 */
function detectEnvironment(): EnvironmentName {
  const meta = import.meta as ImportMeta & { env?: { MODE?: string; PROD?: boolean } };
  const env = meta.env;
  if (!env) return 'local';
  if (env.MODE === 'test') return 'test';
  return env.PROD ? 'production' : 'development';
}

/** Cria um Kernel novo com as implementações padrão (usado também em testes). */
export function createKernel(): Kernel {
  const environment = detectEnvironment();
  const logger = new Logger('kernel');
  const events = new EventBus();
  const services = new ServiceRegistry();
  const config = new ConfigurationManager(environment, {
    'api.baseUrl': '/api',
  });
  const moduleLoader = new ModuleLoader();
  const scheduler = new Scheduler(logger);
  const agents = new AgentManager(logger);
  const memory = new MemoryManager(logger);
  const plugins = new PluginManager(logger);

  return new Kernel({
    events,
    services,
    config,
    logger,
    moduleLoader,
    scheduler,
    agents,
    memory,
    plugins,
    createDispatcher: (getContext) => new CommandDispatcher(events, logger, getContext),
  });
}

let instance: Kernel | null = null;

/** Cria (uma vez) e inicia o Kernel da aplicação. Idempotente. */
export function bootstrapKernel(): Kernel {
  if (!instance) {
    instance = createKernel();
    instance.start();
  }
  return instance;
}

/** Acesso ao Kernel já inicializado (para módulos/serviços futuros). */
export function getKernel(): Kernel {
  if (!instance) {
    throw new Error('Kernel não inicializado. Chame bootstrapKernel() primeiro.');
  }
  return instance;
}
