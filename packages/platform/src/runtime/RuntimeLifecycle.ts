import type { ILogger } from '../kernel';
import type { RuntimeStep } from './types';

/**
 * Ciclo de vida ordenado do Runtime.
 *
 * Executa os passos na ORDEM no startup e na ORDEM INVERSA no shutdown (só os
 * que efetivamente iniciaram). Garante que dependências subam antes de quem
 * depende delas e desçam na ordem contrária — startup/shutdown determinísticos.
 */
export class RuntimeLifecycle {
  private readonly started: RuntimeStep[] = [];

  constructor(
    private readonly steps: readonly RuntimeStep[],
    private readonly logger: ILogger,
  ) {}

  async startUp(): Promise<void> {
    for (const step of this.steps) {
      this.logger.info(`↑ ${step.name}`);
      await step.start();
      this.started.push(step);
    }
  }

  async shutDown(): Promise<void> {
    for (const step of [...this.started].reverse()) {
      this.logger.info(`↓ ${step.name}`);
      try {
        await step.stop?.();
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'erro desconhecido';
        this.logger.error(`Falha ao parar ${step.name}`, { reason });
      }
    }
    this.started.length = 0;
  }
}
