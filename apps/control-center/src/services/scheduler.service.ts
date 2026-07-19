import { EventEmitter } from "events";
import { cronValidate } from "cron-validator";

export interface ScheduledJob {
  id: string;
  pipelineId: string;
  projectId: string;
  name: string;
  cronExpression: string;
  enabled: boolean;
  timezone: string;
  webhookSecret?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
  lastRunStatus?: "success" | "error" | "running";
  lastRunOutput?: string;
  runCount: number;
  lastError?: string;
}

interface ScheduledJobConfig {
  pipelineId: string;
  projectId: string;
  name: string;
  cronExpression: string;
  timezone?: string;
  webhookSecret?: string;
}

interface ScheduledJobRun {
  id: string;
  jobId: string;
  status: "running" | "success" | "error";
  startedAt: string;
  completedAt?: string;
  output?: string;
  error?: string;
}

class SchedulerService {
  private jobs: Map<string, ScheduledJob> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private runHistory: Map<string, any[]> = new Map();

  constructor() {
    this.loadJobs();
  }

  private loadJobs(): void {
    // In production, load from database
    // For now, use in-memory storage
  }

  getAllJobs(): any[] {
    return Array.from(this.jobs.values()).map(job => ({
      ...job,
      nextRunAt: this.calculateNextRun(job.cronExpression),
    }));
  }

  getJob(jobId: string): ScheduledJob | undefined {
    return this.jobs.get(jobId);
  }

  createJob(config: {
    pipelineId: string;
    projectId: string;
    name: string;
    cronExpression: string;
    timezone?: string;
    webhookSecret?: string;
    createdBy: string;
  }): any {
    if (!this.validateCronExpression(config.cronExpression)) {
      throw new Error("Invalid cron expression");
    }

    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();

    const job = {
      id: crypto.randomUUID(),
      pipelineId: config.pipelineId,
      projectId: config.projectId,
      name: config.name,
      cronExpression: config.cronExpression,
      enabled: true,
      timezone: config.timezone || "America/Sao_Paulo",
      webhookSecret: config.webhookSecret,
      createdBy: config.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      runCount: 0,
    };

    this.jobs.set(job.id, job);
    this.scheduleJob(job);

    return job;
  }

  updateJob(jobId: string, updates: Partial<any>): any {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error("Job not found");

    if (updates.cronExpression && !this.validateCronExpression(updates.cronExpression)) {
      throw new Error("Invalid cron expression");
    }

    const updated = { ...job, ...updates, updatedAt: new Date().toISOString() };
    this.jobs.set(jobId, updated);

    // Reschedule if cron changed
    if (updates.cronExpression) {
      this.unscheduleJob(job.id);
      this.scheduleJob(job);
    }

    return this.jobs.get(jobId);
  }

  deleteJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    this.unscheduleJob(jobId);
    this.jobs.delete(jobId);
    return true;
  }

  toggleJob(jobId: string, enabled: boolean): any {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error("Job not found");

    job.enabled = enabled;
    job.updatedAt = new Date().toISOString();

    if (enabled) {
      this.scheduleJob(job);
    } else {
      this.unscheduleJob(job.id);
    }

    this.jobs.set(job.id, job);
    return this.jobs.get(job.id);
  }

  private scheduleJob(job: any): void {
    if (!job.enabled) return;

    // In a real implementation, this would use node-cron or similar
    // For now, we'll simulate with a simple interval
    // In production, use node-cron or similar library
    
    const intervalMs = this.cronToMs(job.cronExpression);
    if (intervalMs > 0) {
      const interval = setInterval(() => {
        this.executeJob(job.id);
      }, intervalMs);

      this.timers.set(job.id, interval);
    }
  }

  private unscheduleJob(jobId: string): void {
    const interval = this.intervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(jobId);
    }
  }

  private validateCronExpression(expression: string): boolean {
    try {
      return require("cron-validator").validateCron(expression);
    } catch {
      return false;
    }
  }

  private cronToMs(cron: string): number {
    // Simplified - in production use a proper cron parser
    // This is a simplified version for demo
    const parts = cron.split(" ");
    if (parts.length !== 5) return 0;
    
    // Very basic parsing for demo - in production use node-cron
    return 60000; // Default 1 minute for demo
  }

  async executeJob(jobId: string): Promise<any> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error("Job not found");

    if (!job.enabled) {
      throw new Error("Job is disabled");
    }

    const runId = crypto.randomUUID();
    const runRecord = {
      id: crypto.randomUUID(),
      jobId: job.id,
      status: "running" as const,
      startedAt: new Date().toISOString(),
    };

    if (!this.runHistory.has(job.id)) {
      this.runHistory.set(job.id, []);
    }
    this.runHistory.get(job.id)!.push(runRecord);

    job.lastRunAt = new Date().toISOString();
    job.runCount = (job.runCount || 0) + 1;
    job.lastRunStatus = "running";
    job.lastRunOutput = "Starting...";
    job.updatedAt = new Date().toISOString();

    // In a real implementation, this would trigger the pipeline execution
    // For now, simulate execution
    try {
      // Simulate execution
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
      
      const success = Math.random() > 0.1; // 90% success rate
      
      const completedRun = {
        ...runRecord,
        status: "success" as const,
        completedAt: new Date().toISOString(),
        output: `Pipeline executed successfully at ${new Date().toISOString()}`,
      };

      const history = this.runHistory.get(job.id) || [];
      const idx = history.findIndex(r => r.id === runRecord.id);
      if (idx >= 0) history[idx] = completedRun;
      else this.runHistory.get(job.id)!.push(completedRun);

      job.lastRunStatus = "success";
      job.lastRunOutput = "Pipeline executed successfully";
      job.lastRunAt = new Date().toISOString();
      job.runCount = (job.runCount || 0) + 1;
      job.nextRunAt = this.calculateNextRun(job.cronExpression);

      return { success: true, runId: runRecord.id };
    } catch (error) {
      const errorRun = {
        ...runRecord,
        status: "error" as const,
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };

      const history = this.runHistory.get(job.id) || [];
      const idx = history.findIndex(r => r.id === runRecord.id);
      if (idx >= 0) history[idx] = errorRun;

      job.lastRunStatus = "error";
      job.lastError = error instanceof Error ? error.message : String(error);
      job.lastRunAt = new Date().toISOString();

      return { success: false, error: String(error) };
    }
  }

  getJobRuns(jobId: string, limit = 50): any[] {
    const history = this.runHistory.get(jobId) || [];
    return history.slice(-limit).reverse();
  }

  getAllJobs(): any[] {
    return Array.from(this.jobs.values()).map(job => ({
      ...job,
      nextRunAt: this.calculateNextRun(job.cronExpression),
    });
  }

  private calculateNextRun(cronExpression: string): string {
    // Simplified - in production use a proper cron parser
    return new Date(Date.now() + 60000).toISOString(); // Placeholder
  }
}

export const schedulerService = new SchedulerService();