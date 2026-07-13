import type {
  ILogger,
  IScheduler,
  KernelContext,
  ScheduleConfig,
  ScheduledTask,
} from './types';

/**
 * Scheduler — gerenciador de tarefas agendadas do Kernel.
 *
 * Responsabilidade única: agendar, executar e gerenciar tarefas recorrentes
 * ou pontuais. Suporta intervalos fixos, diário, semanal, mensal e execução
 * manual (runNow). Não executa lógica de negócio — apenas coordena a execução
 * dos handlers registrados.
 *
 * O Scheduler nunca executa tarefas de negócio diretamente; ele apenas chama
 * os handlers que foram registrados por módulos, serviços ou plugins.
 */
export class Scheduler implements IScheduler {
  private readonly tasks = new Map<string, InternalTask>();
  private readonly logger: ILogger;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private readonly CHECK_INTERVAL = 1000; // verifica a cada 1s

  constructor(logger: ILogger) {
    this.logger = logger.child('scheduler');
  }

  schedule(
    task: Omit<ScheduledTask, 'createdAt' | 'running' | 'lastRunAt' | 'lastError' | 'runCount'>,
  ): string {
    if (this.tasks.has(task.id)) {
      throw new Error(`Tarefa já agendada: ${task.id}`);
    }

    const internal: InternalTask = {
      ...task,
      createdAt: Date.now(),
      running: false,
      lastRunAt: null,
      lastError: null,
      runCount: 0,
      paused: false,
      nextRunAt: this.calculateNextRun(task.schedule),
    };

    this.tasks.set(task.id, internal);
    this.logger.info(`Tarefa agendada: ${task.name}`, {
      id: task.id,
      schedule: task.schedule.type,
    });

    // Garante que o timer de verificação está rodando
    this.ensureTimer();

    return task.id;
  }

  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    this.tasks.delete(taskId);
    this.logger.info(`Tarefa cancelada: ${task.name}`, { id: taskId });
    this.cleanupTimer();
    return true;
  }

  pause(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.paused = true;
    this.logger.info(`Tarefa pausada: ${task.name}`, { id: taskId });
    return true;
  }

  resume(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.paused = false;
    task.nextRunAt = this.calculateNextRun(task.schedule);
    this.logger.info(`Tarefa retomada: ${task.name}`, { id: taskId });
    this.ensureTimer();
    return true;
  }

  list(): readonly ScheduledTask[] {
    return [...this.tasks.values()].map((t) => this.toPublic(t));
  }

  get(taskId: string): ScheduledTask | undefined {
    const task = this.tasks.get(taskId);
    return task ? this.toPublic(task) : undefined;
  }

  async runNow(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Tarefa não encontrada: ${taskId}`);
    if (task.running) throw new Error(`Tarefa já em execução: ${taskId}`);
    await this.executeTask(task);
  }

  /** Para o scheduler e limpa todos os timers. */
  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.logger.info('Scheduler parado');
  }

  // ---------------------------------------------------------------------------
  // Internos
  // ---------------------------------------------------------------------------

  private ensureTimer(): void {
    if (this.timerId !== null) return;
    this.timerId = setInterval(() => {
      this.tick();
    }, this.CHECK_INTERVAL);
    // Permite que o processo Node encerre mesmo com o timer ativo
    if (typeof this.timerId === 'object' && 'unref' in this.timerId) {
      (this.timerId as any).unref();
    }
  }

  private cleanupTimer(): void {
    if (this.tasks.size === 0 && this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private tick(): void {
    const now = Date.now();
    for (const task of this.tasks.values()) {
      if (task.paused || task.running) continue;
      if (task.nextRunAt !== null && now >= task.nextRunAt) {
        // Dispara sem await para não bloquear o tick
        this.executeTask(task).catch((error) => {
          this.logger.error(`Tarefa falhou no tick: ${task.name}`, {
            id: task.id,
            error: error instanceof Error ? error.message : 'erro desconhecido',
          });
        });
      }
    }
  }

  private async executeTask(task: InternalTask): Promise<void> {
    if (task.running) return;
    task.running = true;

    try {
      this.logger.debug(`Executando tarefa: ${task.name}`, { id: task.id });
      // O handler recebe um contexto simplificado (apenas o necessário)
      await task.handler({} as KernelContext);
      task.lastRunAt = Date.now();
      task.runCount++;
      task.lastError = null;
      this.logger.info(`Tarefa executada: ${task.name}`, {
        id: task.id,
        runCount: task.runCount,
      });
    } catch (error) {
      task.lastError = error instanceof Error ? error.message : 'erro desconhecido';
      this.logger.error(`Tarefa falhou: ${task.name}`, {
        id: task.id,
        error: task.lastError,
      });
    } finally {
      task.running = false;
      // Recalcula a próxima execução
      if (task.schedule.type !== 'once') {
        task.nextRunAt = this.calculateNextRun(task.schedule);
      } else {
        // Tarefas 'once' são removidas após execução
        this.tasks.delete(task.id);
      }
    }
  }

  private calculateNextRun(schedule: ScheduleConfig): number | null {
    const now = Date.now();

    switch (schedule.type) {
      case 'once':
        return now; // executa imediatamente
      case 'interval':
        if (!schedule.intervalMs) return null;
        return now + schedule.intervalMs;
      case 'daily': {
        if (!schedule.time) return null;
        const [hours, minutes] = schedule.time.split(':').map(Number);
        const next = new Date();
        next.setHours(hours, minutes, 0, 0);
        if (next.getTime() <= now) next.setDate(next.getDate() + 1);
        return next.getTime();
      }
      case 'weekly': {
        if (!schedule.time || schedule.dayOfWeek === undefined) return null;
        const [h, m] = schedule.time.split(':').map(Number);
        const next = new Date();
        next.setHours(h, m, 0, 0);
        const currentDay = next.getDay();
        let daysUntil = schedule.dayOfWeek - currentDay;
        if (daysUntil <= 0 || (daysUntil === 0 && next.getTime() <= now)) daysUntil += 7;
        next.setDate(next.getDate() + daysUntil);
        return next.getTime();
      }
      case 'monthly': {
        if (!schedule.time || !schedule.dayOfMonth) return null;
        const [h2, m2] = schedule.time.split(':').map(Number);
        const next2 = new Date();
        next2.setHours(h2, m2, 0, 0);
        next2.setDate(schedule.dayOfMonth);
        if (next2.getTime() <= now) next2.setMonth(next2.getMonth() + 1);
        return next2.getTime();
      }
      default:
        return null;
    }
  }

  private toPublic(task: InternalTask): ScheduledTask {
    return {
      id: task.id,
      name: task.name,
      schedule: task.schedule,
      handler: task.handler,
      createdAt: task.createdAt,
      running: task.running,
      lastRunAt: task.lastRunAt,
      lastError: task.lastError,
      runCount: task.runCount,
    };
  }
}

interface InternalTask extends ScheduledTask {
  paused: boolean;
  nextRunAt: number | null;
}
