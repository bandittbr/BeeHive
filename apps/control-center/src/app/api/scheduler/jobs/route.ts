import { NextRequest, NextResponse } from "next/server";
import { schedulerService } from "@/services/scheduler.service";

export async function GET() {
  try {
    const jobs = schedulerService.getAllJobs();
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Error fetching scheduled jobs:", error);
    return NextResponse.json({ error: "Failed to fetch scheduled jobs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pipelineId, projectId, name, cronExpression, timezone, webhookSecret } = await request.json();

    if (!cronExpression || !cronExpression.trim()) {
      return NextResponse.json({ error: "Cron expression is required" }, { status: 400 });
    }

    // Validate cron expression (basic validation)
    const cronParts = cronExpression.trim().split(/\s+/);
    if (cronExpression.trim().split(/\s+/).length < 5 || cronExpression.trim().split(/\s+/).length > 6) {
      return NextResponse.json({ error: "Invalid cron expression format" }, { status: 400 });
    }

    // Validate required fields
    if (!pipelineId || !projectId || !name || !cronExpression) {
      return NextResponse.json({ error: "Missing required fields: pipelineId, projectId, name, cronExpression" }, { status: 400 });
    }

    try {
      // In a real implementation, this would use the scheduler service
      const job = {
        id: crypto.randomUUID(),
        pipelineId: body.pipelineId,
        projectId: body.projectId,
        name: body.name,
        cronExpression: body.cronExpression,
        enabled: true,
        timezone: body.timezone || "America/Sao_Paulo",
        webhookSecret: body.webhookSecret,
        createdBy: "current-user", // Would come from auth
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        enabled: true,
        runCount: 0,
      };

      return NextResponse.json({ 
        job: {
          id: crypto.randomUUID(),
          pipelineId: body.pipelineId,
          projectId: body.projectId,
          name: body.name,
          cronExpression: body.cronExpression,
          enabled: true,
          timezone: body.timezone || "America/Sao_Paulo",
          webhookSecret: body.webhookSecret,
          createdBy: "current-user",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }, { status: 201 });
    } catch (error) {
      console.error("Error creating scheduled job:", error);
      return NextResponse.json({ error: "Failed to create scheduled job" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in scheduler jobs API:", error);
    return NextResponse.json({ error: "Failed to create scheduled job" }, { status: 500 });
  }
}