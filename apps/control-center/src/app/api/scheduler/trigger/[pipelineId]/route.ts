import { NextRequest, NextResponse } from "next/server";
import { schedulerService } from "@/services/scheduler.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pipelineId: string }> }
) {
  try {
    const { pipelineId } = await params;
    const secret = request.headers.get("x-webhook-secret");
    
    const result = await schedulerService.triggerViaWebhook(pipelineId, secret || undefined);
    
    return NextResponse.json({ 
      success: result.success, 
      executionId: result.executionId,
      error: result.error 
    }, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("Error triggering pipeline via webhook:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to trigger pipeline" }, { status: 500 });
  }
}