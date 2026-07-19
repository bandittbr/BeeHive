import { NextRequest, NextResponse } from "next/server";
import { schedulerService } from "@/services/scheduler.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pipelineId: string }> }
) {
  try {
    const { pipelineId } = await params;
    const body = await request.json();
    const { triggeredBy } = body;

    const result = await schedulerService.triggerManually(pipelineId, triggeredBy || "manual");
    
    return NextResponse.json({ 
      success: result.success, 
      executionId: result.executionId,
      error: result.error 
    }, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("Error manually triggering pipeline:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to trigger pipeline" }, { status: 500 });
  }
}