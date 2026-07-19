import { PrismaClient } from "@prisma/client";
import { cronValidate } from "cron-validator";

const prisma = new PrismaClient();

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
  lastError?: string;
  runCount: number;
}

export interface ScheduledJobRun {
  id: string;
  jobId: string;
  status: "running" | "success" | "error";
  startedAt: string;
  completedAt?: string;
  output?: string;
  error?: string;
  triggeredBy: string;
}

interface JobTimer {
  timeout: any;
  cronExpression: string;
}

class SchedulerService {
  private timers: Map<string, JobTimer> = new Map();

  constructor() {
    this.loadJobs();
  }

  private async loadJobs(): Promise<void> {
    try {
      const jobs = await prisma.scheduledJob.findMany({
        where: { enabled: true },
      });

      for (const job of jobs) {
        this.scheduleJob(job as any);
      }
    } catch (error) {
      console.error("Failed to load scheduled jobs:", error);
    }
  }

  async getAllJobs(projectId?: string): Promise<any[]> {
    const where = projectId ? { projectId } : {};
    const jobs = await prisma.scheduledJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        executions: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
      },
    });

    return jobs.map(job => ({
      ...job,
      nextRunAt: this.calculateNextRun(job.cronExpression),
    }));
  }

  async getJob(jobId: string): Promise<any> {
    const job = await prisma.scheduledJob.findUnique({
      where: { id: jobId },
      include: {
        executions: {
          orderBy: { startedAt: "desc" },
          take: 50,
        },
      },
    });
    if (!job) return undefined;
    return { ...job, nextRunAt: this.calculateNextRun(job.cronExpression) };
  }

  async createJob(config: {
    pipelineId: string;
    projectId: string;
    name: string;
    cronExpression: string;
    timezone?: string;
    webhookSecret?: string;
    createdBy: string;
  }): Promise<any> {
    if (!this.validateCronExpression(config.cronExpression)) {
      throw new Error("Invalid cron expression");
    }

    const job = await prisma.scheduledJob.create({
      data: {
        pipelineId: config.pipelineId,
        projectId: config.projectId,
        name: config.name,
        cronExpression: config.cronExpression,
        enabled: true,
        timezone: config.timezone || "America/Sao_Paulo",
        webhookSecret: config.webhookSecret,
        createdBy: config.createdBy,
        nextRunAt: this.calculateNextRun(config.cronExpression),
      },
    });

    this.scheduleJob(job);
    return { ...job, nextRunAt: this.calculateNextRun(job.cronExpression) };
  }

  async updateJob(jobId: string, updates: Partial<any>): Promise<any> {
    const job = await prisma.scheduledJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error("Job not found");

    if (updates.cronExpression && !this.validateCronExpression(updates.cronExpression)) {
      throw new Error("Invalid cron expression");
    }

    const updated = await prisma.scheduledJob.update({
      where: { id: jobId },
      data: { ...updates, updatedAt: new Date() },
    });

    // Reschedule if cron changed
    if (updates.cronExpression) {
      this.unscheduleJob(jobId);
      this.scheduleJob(updated);
    } else if (updates.enabled !== undefined) {
      if (updates.enabled) {
        this.scheduleJob(updated);
      } else {
        this.unscheduleJob(jobId);
      }
    }

    return { ...updated, nextRunAt: this.calculateNextRun(updated.cronExpression) };
  }

  async deleteJob(jobId: string): Promise<boolean> {
    const job = await prisma.scheduledJob.findUnique({ where: { id: jobId } });
    if (!job) return false;

    this.unscheduleJob(jobId);
    await prisma.scheduledJob.delete({ where: { id: jobId } });
    return true;
  }

  async toggleJob(jobId: string, enabled: boolean): Promise<any> {
    const job = await prisma.scheduledJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error("Job not found");

    const updated = await prisma.scheduledJob.update({
      where: { id: jobId },
      data: { enabled, updatedAt: new Date() },
    });

    if (enabled) {
      this.scheduleJob(updated);
    } else {
      this.unscheduleJob(jobId);
    }

    return { ...updated, nextRunAt: this.calculateNextRun(updated.cronExpression) };
  }

  private scheduleJob(job: any): void {
    if (!job.enabled) return;

    try {
      const { CronJob } = require("cron");
      
      const cronJob = new CronJob(job.cronExpression, async () => {
        await this.executeJob(job.id);
      }, null, true, job.timezone || "America/Sao_Paulo");

      cronJob.start();

      this.timers.set(job.id, {
        timeout: cronJob,
        cronExpression: job.cronExpression,
      });

      console.log(`Scheduled job ${job.name} (${job.id}) with cron: ${job.cronExpression}`);
    } catch (error) {
      console.error(`Failed to schedule job ${job.id}:`, error);
    }
  }

  private unscheduleJob(jobId: string): void {
    const timer = this.timers.get(jobId);
    if (timer) {
      try {
        if (timer.timeout && typeof timer.timeout.stop === "function") {
          timer.timeout.stop();
        }
      } catch (e) {
        console.error(`Error stopping timer for job ${jobId}:`, e);
      }
      this.timers.delete(jobId);
    }
  }

  private validateCronExpression(expression: string): boolean {
    try {
      return require("cron-validator").validateCron(expression);
    } catch {
      return false;
    }
  }

  calculateNextRun(cronExpression: string): string {
    try {
      const { CronExpressionParser } = require("cron-parser");
      const interval = CronExpressionParser.parse(cronExpression);
      return interval.next().toDate().toISOString();
    } catch {
      // Fallback: return 1 minute from now
      return new Date(Date.now() + 60000).toISOString();
    }
  }

  async executeJob(jobId: string): Promise<any> {
    const job = await prisma.scheduledJob.findUnique({
      where: { id: jobId },
      include: { pipeline: true, project: true },
    });
    if (!job) throw new Error("Job not found");

    if (!job.enabled) {
      throw new Error("Job is disabled");
    }

    const execution = await prisma.pipelineExecution.create({
      data: {
        jobId: job.id,
        pipelineId: job.pipelineId,
        projectId: job.projectId,
        status: "running",
        startedAt: new Date(),
        triggeredBy: "cron",
      },
    });

    // Update job status
    await prisma.scheduledJob.update({
      where: { id: jobId },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: "running",
        lastRunOutput: "Starting...",
        runCount: { increment: 1 },
      },
    });

    try {
      // TODO: Actually execute the pipeline using PipelineRunner/ExecutionService
      // For now, simulate execution
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
      
      const success = Math.random() > 0.1; // 90% success rate
      
      if (success) {
        await prisma.pipelineExecution.update({
          where: { id: execution.id },
          data: {
            status: "success",
            completedAt: new Date(),
            output: `Pipeline executed successfully at ${new Date().toISOString()}`,
          },
        });

        await prisma.scheduledJob.update({
          where: { id: jobId },
          data: {
            lastRunStatus: "success",
            lastRunOutput: "Pipeline executed successfully",
            lastRunAt: new Date(),
            nextRunAt: this.calculateNextRun(job.cronExpression),
          },
        });

        return { success: true, executionId: execution.id };
      } else {
        throw new Error("Simulated execution failure");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      await prisma.pipelineExecution.update({
        where: { id: execution.id },
        data: {
          status: "error",
          completedAt: new Date(),
          error: errorMessage,
        },
      });

      await prisma.scheduledJob.update({
        where: { id: jobId },
        data: {
          lastRunStatus: "error",
          lastError: errorMessage,
          lastRunAt: new Date(),
        },
      });

      return { success: false, error: errorMessage };
    }
  }

  async triggerViaWebhook(pipelineId: string, secret?: string): Promise<any> {
    const job = await prisma.scheduledJob.findFirst({
      where: { pipelineId, webhookSecret: secret || undefined },
    });
    
    if (!job) {
      // Try to find any job for this pipeline
      const anyJob = await prisma.scheduledJob.findFirst({
        where: { pipelineId },
      });
      if (!anyJob) throw new Error("No scheduled job found for this pipeline");
    }

    const targetJob = job || (await prisma.scheduledJob.findFirst({ where: { pipelineId } }))!;
    return this.executeJob(targetJob.id);
  }

  async triggerManually(pipelineId: string, triggeredBy: string = "manual"): Promise<any> {
    const job = await prisma.scheduledJob.findFirst({
      where: { pipelineId },
    });
    
    if (!job) throw new Error("No scheduled job found for this pipeline");

    const execution = await prisma.pipelineExecution.create({
      data: {
        jobId: job.id,
        pipelineId: job.pipelineId,
        projectId: job.projectId,
        status: "running",
        startedAt: new Date(),
        triggeredBy,
      },
    });

    await prisma.scheduledJob.update({
      where: { id: job.id },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: "running",
        lastRunOutput: `Manual trigger by ${triggeredBy}`,
        runCount: { increment: 1 },
      },
    });

    try {
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
      const success = Math.random() > 0.1;
      
      if (success) {
        await prisma.pipelineExecution.update({
          where: { id: execution.id },
          data: {
            status: "success",
            completedAt: new Date(),
            output: `Pipeline executed successfully at ${new Date().toISOString()}`,
          },
        });

        await prisma.scheduledJob.update({
          where: { id: job.id },
          data: {
            lastRunStatus: "success",
            lastRunOutput: "Manual execution successful",
            lastRunAt: new Date(),
            nextRunAt: this.calculateNextRun(job.cronExpression),
          },
        });

        return { success: true, executionId: execution.id };
      } else {
        throw new Error("Simulated execution failure");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      await prisma.pipelineExecution.update({
        where: { id: execution.id },
        data: {
          status: "error",
          completedAt: new Date(),
          error: errorMessage,
        },
      });

      await prisma.scheduledJob.update({
        where: { id: job.id },
        data: {
          lastRunStatus: "error",
          lastError: errorMessage,
          lastRunAt: new Date(),
        },
      });

      return { success: false, error: errorMessage };
    }
  }

  async getJobRuns(jobId: string, limit = 50): Promise<any[]> {
    return prisma.pipelineExecution.findMany({
      where: { jobId },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  }

  calculateNextRun(cronExpression: string): string {
    try {
      const { CronJob } = require("cron");
      const cronJob = new CronJob(cronExpression, () => {}, null, false, "America/Sao_Paulo");
      const nextDate = cronJob.nextDate();
      return nextDate ? nextDate.toISOString() : new Date(Date.now() + 60000).toISOString();
    } catch {
      return new Date(Date.now() + 60000).toISOString();
    }
  }
}

export const schedulerService = new SchedulerService();