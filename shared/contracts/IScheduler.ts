export interface IScheduler {
  cron(expression: string, taskId: string, handler: () => Promise<void>): void;
  interval(ms: number, taskId: string, handler: () => Promise<void>): void;
  cancel(taskId: string): void;
  list(): ScheduledTask[];
}

export interface ScheduledTask {
  id: string;
  type: 'cron' | 'interval';
  schedule: string;
  nextRun: number;
  lastRun?: number;
  enabled: boolean;
}
