/**
 * Kernel do BeeHive — ponto único de importação.
 *
 * A fundação sobre a qual todos os módulos futuros serão construídos.
 * Consumidores devem depender destes contratos e da fábrica, não dos detalhes.
 */
export * from './types';
export { EventBus } from './EventBus';
export { ServiceRegistry } from './ServiceRegistry';
export { CommandDispatcher } from './CommandDispatcher';
export { ConfigurationManager } from './ConfigurationManager';
export { Logger } from './Logger';
export { ModuleLoader } from './ModuleLoader';
export { Scheduler } from './Scheduler';
export { AgentManager } from './AgentManager';
export { MemoryManager } from './MemoryManager';
export { PluginManager } from './PluginManager';
export { Kernel, type KernelDependencies } from './Kernel';
export { createKernel, bootstrapKernel, getKernel } from './bootstrap';
