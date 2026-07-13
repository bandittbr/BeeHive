import type { IAgent, IAgentManager, ILogger, KernelContext } from './types';

/**
 * AgentManager — gerenciador de ciclo de vida dos agentes do Kernel.
 *
 * Responsabilidade única: registrar, iniciar, pausar, parar e descartar agentes.
 * Agentes NUNCA possuem ferramentas próprias — eles solicitam recursos ao
 * ToolManager através do KernelContext. O AgentManager apenas coordena o ciclo
 * de vida; não executa lógica de negócio.
 *
 * "Agentes Especializados" (Developer, Reviewer, Researcher, etc.) serão
 * implementados como módulos que se registram aqui.
 */
export class AgentManager implements IAgentManager {
  private readonly agents = new Map<string, IAgent>();
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger.child('agents');
  }

  register(agent: IAgent): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agente já registrado: ${agent.id}`);
    }
    this.agents.set(agent.id, agent);
    this.logger.info(`Agente registrado: ${agent.name}`, {
      id: agent.id,
      tools: agent.tools,
    });
  }

  unregister(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    this.agents.delete(agentId);
    this.logger.info(`Agente removido: ${agent.name}`, { id: agentId });
    return true;
  }

  get(agentId: string): IAgent | undefined {
    return this.agents.get(agentId);
  }

  list(): readonly IAgent[] {
    return [...this.agents.values()];
  }

  async start(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agente não encontrado: ${agentId}`);
    if (agent.state === 'Running') return;

    try {
      await agent.start({} as KernelContext);
      this.logger.info(`Agente iniciado: ${agent.name}`, { id: agentId });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido';
      this.logger.error(`Agente falhou ao iniciar: ${agent.name}`, { id: agentId, reason });
      throw error;
    }
  }

  async stop(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agente não encontrado: ${agentId}`);
    if (agent.state === 'Stopped' || agent.state === 'Disposed') return;

    try {
      await agent.stop({} as KernelContext);
      this.logger.info(`Agente parado: ${agent.name}`, { id: agentId });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido';
      this.logger.error(`Agente falhou ao parar: ${agent.name}`, { id: agentId, reason });
    }
  }

  async pause(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agente não encontrado: ${agentId}`);
    if (agent.state !== 'Running') return;

    try {
      await agent.pause({} as KernelContext);
      this.logger.info(`Agente pausado: ${agent.name}`, { id: agentId });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido';
      this.logger.error(`Agente falhou ao pausar: ${agent.name}`, { id: agentId, reason });
    }
  }

  async resume(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agente não encontrado: ${agentId}`);
    if (agent.state !== 'Paused') return;

    try {
      await agent.resume({} as KernelContext);
      this.logger.info(`Agente retomado: ${agent.name}`, { id: agentId });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido';
      this.logger.error(`Agente falhou ao retomar: ${agent.name}`, { id: agentId, reason });
    }
  }

  async dispose(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agente não encontrado: ${agentId}`);
    if (agent.state === 'Disposed') return;

    try {
      await agent.dispose({} as KernelContext);
      this.agents.delete(agentId);
      this.logger.info(`Agente descartado: ${agent.name}`, { id: agentId });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido';
      this.logger.error(`Agente falhou ao descartar: ${agent.name}`, { id: agentId, reason });
    }
  }

  async disposeAll(): Promise<void> {
    const ids = [...this.agents.keys()];
    for (const id of ids.reverse()) {
      await this.dispose(id).catch(() => {});
    }
    this.logger.info('Todos os agentes descartados');
  }
}
