import { NextRequest, NextResponse } from "next/server";
import { schedulerService } from "@/services/scheduler.service";

export async function GET() {
  try {
    const jobs = await schedulerService.getAllJobs();
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Error fetching scheduled jobs:", error);
    return NextResponse.json({ error: "Failed to fetch scheduled jobs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pipelineId, projectId, name, cronExpression, timezone, webhookSecret } = body;

    if (!cronExpression || !cronExpression.trim()) {
      return NextResponse.json({ error: "Cron expression is required" }, { status: 400 });
    }

    if (!pipelineId || !projectId || !name || !cronExpression) {
      return NextResponse.json({ error: "Missing required fields: pipelineId, projectId, name, cronExpression" }, { status: 400 });
    }

    try {
      const job = await schedulerService.createJob({
        pipelineId,
        projectId,
        name,
        cronExpression,
        timezone: timezone || "America/Sao_Paulo",
        webhookSecret,
        createdBy: "current-user",
      });

      return NextResponse.json({ job }, { status: 201 });
    } catch (error) {
      console.error("Error creating scheduled job:", error);
      return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create scheduled job" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in scheduler jobs API:", error);
    return NextResponse.json({ error: "Failed to create scheduled job" }, { status: 500 });
  }
}