import { NextRequest, NextResponse } from "next/server";
import { schedulerService } from "@/services/scheduler.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pipelineId: string }> }
) {
  try {
    const { pipelineId } = await params;
    const body = await request.json();
    
    // Verify webhook secret if provided
    const secret = request.headers.get("x-webhook-secret");
    const body = await request.json();
    
    // In a real implementation, verify the webhook secret
    // const job = schedulerService.getJob(pipelineId);
    // if (job?.config?.webhookSecret && secret !== job.config.webhookSecret) {
    //   return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
    // }

    // Trigger the pipeline
    const result = await schedulerService.triggerViaWebhook(pipelineId, secret);
    
    return NextResponse.json({ 
      success: result.success, 
      executionId: result.executionId,
      error: result.error 
    }, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("Error triggering pipeline via webhook:", error);
    return NextResponse.json({ error: "Failed to trigger pipeline" }, { status: 500 });
  }
}