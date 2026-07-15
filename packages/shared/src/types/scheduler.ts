export interface ScheduledTask {
  id: string;
  name: string;
  type: 'cron' | 'interval' | 'once';
  schedule: string;
  handler: string;
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  metadata?: Record<string, unknown>;
}

export interface IScheduler {
  start(): Promise<void>;
  stop(): Promise<void>;

  cron(expression: string, taskId: string, handler: () => Promise<void>): ScheduledTask;
  interval(ms: number, taskId: string, handler: () => Promise<void>): ScheduledTask;
  once(date: Date, taskId: string, handler: () => Promise<void>): ScheduledTask;

  cancel(taskId: string): void;
  pause(taskId: string): void;
  resume(taskId: string): void;

  getTasks(): ScheduledTask[];
  getTask(taskId: string): ScheduledTask | undefined;
}
