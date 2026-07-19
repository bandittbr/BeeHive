import { NextRequest } from "next/server";
import { executionStream } from "@/services/execution-stream";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  const { executionId } = await params;
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const execution = executionStream.getExecution(executionId);
        
        if (!execution) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Execution not found" })}\n\n`));
          controller.close();
          return;
        }

        // Send initial state
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ 
            type: "init", 
            execution: {
              id: execution.id,
              pipelineId: execution.pipelineId,
              pipelineName: execution.pipelineName,
              status: execution.status,
              startedAt: execution.startedAt,
              completedAt: execution.completedAt,
              currentNode: execution.currentNode,
              nodes: Array.from(execution.nodes.entries()).map(([id, node]) => ({ id, ...node })),
            }
          })}\n\n`
        ));

        const subscription = executionStream.subscribe(executionId);

        const handler = (update: any) => {
          if (update.data.executionId !== executionId) return;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));
          
          if (update.type === "complete") {
            subscription.unsubscribe();
            controller.close();
          }
        };

        executionStream.on("update", handler);

        // Keep connection alive
        const interval = setInterval(() => {
          controller.enqueue(encoder.encode(`:keepalive\n\n`));
        }, 15000);

        // Cleanup on close
        request.signal.addEventListener("abort", () => {
          clearInterval(interval);
          subscription.unsubscribe();
          executionStream.off("update", handler);
          controller.close();
        });
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: String(error) })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}