import { NextRequest, NextResponse } from "next/server";
import { executionStream } from "@/services/execution-stream";
import { executePipeline } from "@/services/pipeline-executor";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pipelineId, projectId, triggeredBy = "manual" } = body;

    if (!pipelineId || !projectId) {
      return NextResponse.json({ error: "Missing pipelineId or projectId" }, { status: 400 });
    }

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Initialize execution stream
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    const pipeline = await prisma.pipeline.findUnique({
      where: { id: pipelineId },
      include: { nodes: true, edges: true },
    });

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    // Create execution stream
    executionStream.createExecution(
      executionId,
      pipelineId,
      projectId,
      pipeline.nodes.map((n: any) => ({ id: n.id, name: n.label, type: n.type }))
    );

    // Execute pipeline asynchronously
    executePipeline({
      pipelineId,
      projectId,
      executionId,
    }).then(result => {
      if (result.success) {
        executionStream.updateNodeStatus(executionId, "pipeline", "success", { output: result.output });
        executionStream.completeExecution(executionId, "success");
      } else {
        executionStream.updateNodeStatus(executionId, "pipeline", "error", { error: result.error });
        executionStream.completeExecution(executionId, "error");
      }
    }).catch(error => {
      executionStream.updateNodeStatus(executionId, "pipeline", "error", { error: error.message });
      executionStream.completeExecution(executionId, "error");
    });

    return NextResponse.json({ executionId }, { status: 201 });
  } catch (error) {
    console.error("Error creating execution:", error);
    return NextResponse.json({ error: "Failed to create execution" }, { status: 500 });
  }
}