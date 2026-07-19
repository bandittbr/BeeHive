import { NextRequest, NextResponse } from "next/server";
import { schedulerService } from "@/services/scheduler.service";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const job = await prisma.scheduledJob.findUnique({
      where: { id },
      include: {
        pipeline: true,
        project: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const nextRunAt = schedulerService.calculateNextRun(job.cronExpression);
    
    return NextResponse.json({ 
      job: {
        ...job,
        nextRunAt,
      }
    });
  } catch (error) {
    console.error("Error fetching scheduled job:", error);
    return NextResponse.json({ error: "Failed to fetch scheduled job" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { enabled, cronExpression, name, timezone, webhookSecret } = body;
    
    const updates: any = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (cronExpression) updates.cronExpression = cronExpression;
    if (name) updates.name = name;
    if (timezone) updates.timezone = timezone;
    if (webhookSecret !== undefined) updates.webhookSecret = webhookSecret;

    const job = await schedulerService.updateJob(id, updates);
    
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const nextRunAt = schedulerService.calculateNextRun(job.cronExpression);
    return NextResponse.json({ 
      job: { ...job, nextRunAt }
    });
  } catch (error) {
    console.error("Error updating scheduled job:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update scheduled job" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const success = await schedulerService.deleteJob(id);
    
    if (!success) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting scheduled job:", error);
    return NextResponse.json({ error: "Failed to delete scheduled job" }, { status: 500 });
  }
}