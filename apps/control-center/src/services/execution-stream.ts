import { EventEmitter } from "events";

export interface NodeExecution {
  id: string;
  name: string;
  type: string;
  status: "pending" | "running" | "success" | "error";
  startedAt?: string;
  completedAt?: string;
  output?: any;
  error?: string;
  logs: string[];
}

export interface PipelineExecution {
  id: string;
  pipelineId: string;
  pipelineName: string;
  status: "running" | "success" | "error";
  startedAt: string;
  completedAt?: string;
  nodes: Map<string, NodeExecution>;
  currentNode?: string;
}

class ExecutionStreamService extends EventEmitter {
  private executions: Map<string, PipelineExecution> = new Map();

  createExecution(
    executionId: string,
    pipelineId: string,
    pipelineName: string,
    nodes: Array<{ id: string; name: string; type: string }>
  ): PipelineExecution {
    const nodeMap = new Map<string, NodeExecution>();
    
    for (const node of nodes) {
      nodeMap.set(node.id, {
        id: node.id,
        name: node.name,
        type: node.type,
        status: "pending",
        logs: [],
      });
    }

    const execution: PipelineExecution = {
      id: executionId,
      pipelineId,
      pipelineName,
      status: "running",
      startedAt: new Date().toISOString(),
      nodes: nodeMap,
    };

    this.executions.set(executionId, execution);
    this.emit("execution:created", execution);

    return execution;
  }

  getExecution(executionId: string): PipelineExecution | undefined {
    return this.executions.get(executionId);
  }

  updateNodeStatus(
    executionId: string,
    nodeId: string,
    status: NodeExecution["status"],
    data?: { output?: any; error?: string; logs?: string[] }
  ): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const node = execution.nodes.get(nodeId);
    if (!node) return;

    node.status = status;
    
    if (status === "running") {
      node.startedAt = new Date().toISOString();
      execution.currentNode = nodeId;
    } else if (status === "success" || status === "error") {
      node.completedAt = new Date().toISOString();
      if (data?.output) node.output = data.output;
      if (data?.error) node.error = data.error;
      if (data?.logs) node.logs.push(...data.logs);
    }

    this.emit("node:updated", { executionId, nodeId, node });
  }

  addLog(executionId: string, nodeId: string, log: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const node = execution.nodes.get(nodeId);
    if (!node) return;

    node.logs.push(`[${new Date().toISOString()}] ${log}`);
    this.emit("log:added", { executionId, nodeId, log: node.logs[node.logs.length - 1] });
  }

  completeExecution(executionId: string, status: "success" | "error"): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = status;
    execution.completedAt = new Date().toISOString();
    execution.currentNode = undefined;

    this.emit("execution:completed", { executionId, status });
  }

  subscribe(executionId: string): { unsubscribe: () => void } {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return { unsubscribe: () => {} };
    }

    const handlers = {
      "node:updated": (data: any) => {
        if (data.executionId === executionId) {
          this.emit("update", { type: "node", data });
        }
      },
      "log:added": (data: any) => {
        if (data.executionId === executionId) {
          this.emit("update", { type: "log", data });
        }
      },
      "execution:completed": (data: any) => {
        if (data.executionId === executionId) {
          this.emit("update", { type: "complete", data });
        }
      },
    };

    for (const [event, handler] of Object.entries(handlers)) {
      this.on(event, handler);
    }

    return {
      unsubscribe: () => {
        for (const [event, handler] of Object.entries(handlers)) {
          this.off(event, handler);
        }
      },
    };
  }

  // SSE helper
  async *stream(executionId: string): AsyncGenerator<string, void, unknown> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      yield `data: ${JSON.stringify({ type: "error", error: "Execution not found" })}\n\n`;
      return;
    }

    // Send initial state
    yield `data: ${JSON.stringify({ 
      type: "init", 
      execution: this.serializeExecution(execution) 
    })}\n\n`;

    const subscription = this.subscribe(executionId);

    try {
      for await (const update of this.createAsyncIterator()) {
        if (update.data.executionId !== executionId) continue;
        yield `data: ${JSON.stringify(update)}\n\n`;
        
        if (update.type === "complete") break;
      }
    } finally {
      subscription.unsubscribe();
    }
  }

  private createAsyncIterator(): AsyncGenerator<any, void, unknown> {
    let queue: any[] = [];
    let resolve: ((value: any) => void) | null = null;
    let closed = false;

    const handler = (update: any) => {
      if (closed) return;
      if (resolve) {
        resolve({ value: update, done: false });
        resolve = null;
      } else {
        queue.push(update);
      }
    };

    this.on("update", handler);

    return {
      next: async () => {
        if (queue.length > 0) {
          return { value: queue.shift(), done: false };
        }
        if (closed) return { value: undefined, done: true };
        
        return new Promise((res) => {
          resolve = res;
        });
      },
      return: async () => {
        closed = true;
        this.off("update", handler);
        if (resolve) resolve({ value: undefined, done: true });
        return { value: undefined, done: true };
      },
      [Symbol.asyncIterator]: () => this.createAsyncIterator(),
    };
  }

  serializeExecution(execution: PipelineExecution): any {
    return {
      id: execution.id,
      pipelineId: execution.pipelineId,
      pipelineName: execution.pipelineName,
      status: execution.status,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      currentNode: execution.currentNode,
      nodes: Array.from(execution.nodes.entries()).map(([id, node]) => ({ id, ...node })),
    };
  }

  cleanup(executionId: string): void {
    this.executions.delete(executionId);
  }
}

export const executionStream = new ExecutionStreamService();