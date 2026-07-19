-- CreateTable
CREATE TABLE "scheduled_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pipelineId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "webhookSecret" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastRunAt" DATETIME,
    "nextRunAt" DATETIME,
    "lastRunStatus" TEXT,
    "lastRunOutput" TEXT,
    "lastError" TEXT,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "scheduled_jobs_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipelines" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "scheduled_jobs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pipeline_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "output" TEXT,
    "error" TEXT,
    "triggeredBy" TEXT NOT NULL DEFAULT 'cron',
    CONSTRAINT "pipeline_executions_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "scheduled_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
