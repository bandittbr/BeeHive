import { PrismaClient } from "@prisma/client";
import { executionStream } from "./execution-stream";

const prisma = new PrismaClient();

export interface PipelineExecutorConfig {
  pipelineId: string;
  projectId: string;
  executionId: string;
}

export interface PipelineExecutorResult {
  success: boolean;
  output?: string;
  error?: string;
}

export async function executePipeline(config: PipelineExecutorConfig): Promise<PipelineExecutorResult> {
  try {
    const pipeline = await prisma.pipeline.findUnique({
      where: { id: config.pipelineId },
      include: {
        nodes: true,
        edges: true,
        project: true,
      },
    });

    if (!pipeline) {
      throw new Error("Pipeline not found");
    }

    const nodes = pipeline.nodes;
    const edges = pipeline.edges;

    // Build adjacency list
    const adjacency: Record<string, string[]> = {};
    const reverseAdjacency: Record<string, string[]> = {};
    
    for (const node of nodes) {
      adjacency[node.id] = [];
      reverseAdjacency[node.id] = [];
    }
    
    for (const edge of edges) {
      adjacency[edge.source]?.push(edge.target);
      reverseAdjacency[edge.target]?.push(edge.source);
    }

    // Find entry nodes (nodes with no incoming edges)
    const entryNodes = nodes.filter(n => reverseAdjacency[n.id].length === 0);

    if (entryNodes.length === 0) {
      throw new Error("Pipeline has no entry point");
    }

    // Initialize execution stream
    executionStream.createExecution(
      config.executionId,
      config.pipelineId,
      pipeline.name,
      nodes.map(n => ({ id: n.id, name: n.label, type: n.type }))
    );

    // Execute nodes in topological order
    const visited = new Set<string>();
    const executing = new Set<string>();
    const results: Record<string, any> = {};
    let output = "";

    async function executeNode(nodeId: string): Promise<any> {
      if (visited.has(nodeId)) return results[nodeId];
      if (executing.has(nodeId)) throw new Error(`Circular dependency detected at node ${nodeId}`);

      const node = nodes.find(n => n.id === nodeId);
      if (!node) throw new Error(`Node ${nodeId} not found`);

      executing.add(nodeId);
      
      // Mark node as running
      executionStream.updateNodeStatus(config.executionId, nodeId, "running");

      // Wait for all dependencies to complete
      const deps = reverseAdjacency[nodeId] || [];
      await Promise.all(deps.map(depId => executeNode(depId)));

      // Prepare inputs from dependencies
      const inputs: Record<string, any> = {};
      for (const depId of deps) {
        inputs[depId] = results[depId];
      }

      // Execute the node based on its type
      const nodeResult = await executeNodeByType(node, inputs, config);
      results[nodeId] = nodeResult;
      
      output += `[${node.label}] ${JSON.stringify(nodeResult)}\n`;
      
      // Mark node as complete
      executionStream.updateNodeStatus(config.executionId, nodeId, "success", { output: nodeResult, logs: [`${node.label}: completed`] });
      
      visited.add(nodeId);
      executing.delete(nodeId);
      
      return nodeResult;
    }

    // Execute all entry nodes
    for (const entryNode of entryNodes) {
      await executeNode(entryNode.id);
    }

    return { success: true, output: output || "Pipeline executed successfully" };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

async function executeNodeByType(
  node: any, 
  inputs: Record<string, any>, 
  config: PipelineExecutorConfig
): Promise<any> {
  const type = node.type;
  const nodeConfig = node.config || {};

  switch (type) {
    case "agent":
      return await executeAgentNode(node, inputs, nodeConfig);
    case "tool":
      return await executeToolNode(node, inputs, nodeConfig);
    case "condition":
      return await executeConditionNode(node, inputs, nodeConfig);
    case "loop":
      return await executeLoopNode(node, inputs, nodeConfig);
    case "input":
      return await executeInputNode(node, inputs, nodeConfig);
    case "output":
      return await executeOutputNode(node, inputs, nodeConfig);
    case "parallel":
      return await executeParallelNode(node, inputs, nodeConfig);
    case "delay":
      return await executeDelayNode(node, inputs, nodeConfig);
    case "code":
      return await executeCodeNode(node, inputs, nodeConfig);
    case "http":
      return await executeHttpNode(node, inputs, nodeConfig);
    case "db":
      return await executeDbNode(node, inputs, nodeConfig);
    default:
      return { type, executed: true, timestamp: new Date().toISOString() };
  }
}

async function executeAgentNode(node: any, inputs: Record<string, any>, config: any): Promise<any> {
  // Simulate LLM agent execution
  await new Promise(r => setTimeout(r, 100 + Math.random() * 500));
  return {
    type: "agent",
    model: config.model || "gpt-4",
    prompt: config.systemPrompt || "Execute task",
    inputs,
    result: `Agent ${node.label} completed task`,
    timestamp: new Date().toISOString(),
  };
}

async function executeToolNode(node: any, inputs: Record<string, any>, config: any): Promise<any> {
  await new Promise(r => setTimeout(r, 50 + Math.random() * 200));
  return {
    type: "tool",
    tool: config.toolName || "unknown",
    inputs,
    result: `Tool ${config.toolName || node.label} executed`,
    timestamp: new Date().toISOString(),
  };
}

async function executeConditionNode(node: any, inputs: Record<string, any>, config: any): Promise<any> {
  await new Promise(r => setTimeout(r, 10));
  const condition = config.condition || "true";
  // Simple condition evaluation - in production use a safe evaluator
  const result = condition === "true" || condition === "1";
  return {
    type: "condition",
    condition,
    result,
    branch: result ? "true" : "false",
    timestamp: new Date().toISOString(),
  };
}

async function executeLoopNode(node: any, inputs: Record<string, any>, config: any): Promise<any> {
  const maxIterations = config.maxIterations || 10;
  const results = [];
  for (let i = 0; i < maxIterations; i++) {
    await new Promise(r => setTimeout(r, 50));
    results.push({ iteration: i, timestamp: new Date().toISOString() });
  }
  return {
    type: "loop",
    iterations: maxIterations,
    results,
    timestamp: new Date().toISOString(),
  };
}

async function executeInputNode(node: any, inputs: Record<string, any>, config: any): Promise<any> {
  return {
    type: "input",
    schema: config.schema || {},
    data: inputs,
    timestamp: new Date().toISOString(),
  };
}

async function executeOutputNode(node: any, inputs: Record<string, any>, config: any): Promise<any> {
  const inputValues = Object.values(inputs);
  return {
    type: "output",
    data: inputValues.length === 1 ? inputValues[0] : inputs,
    timestamp: new Date().toISOString(),
  };
}

async function executeParallelNode(node: any, inputs: Record<string, any>, config: any): Promise<any> {
  // In a real implementation, this would run branches in parallel
  return {
    type: "parallel",
    branches: [],
    timestamp: new Date().toISOString(),
  };
}

async function executeDelayNode(node: any, inputs: Record<string, any>, config: any): Promise<any> {
  const delay = config.delayMs || 1000;
  await new Promise(r => setTimeout(r, delay));
  return {
    type: "delay",
    delayMs: delay,
    timestamp: new Date().toISOString(),
  };
}

async function executeCodeNode(node: any, inputs: Record<string, any>, config: any): Promise<any> {
  const code = config.code || "return inputs;";
  try {
    // WARNING: In production, use a safe sandbox like isolated-vm or similar
    const func = new Function("inputs", "config", code);
    const result = func(inputs, config);
    return {
      type: "code",
      code,
      result,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      type: "code",
      code,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

async function executeHttpNode(node: any, inputs: Record<string, any>, config: any): Promise<any> {
  const url = config.url || "";
  const method = config.method || "GET";
  const headers = config.headers || {};
  const body = config.body || inputs;

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: method !== "GET" ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json();
    return {
      type: "http",
      url,
      method,
      status: response.status,
      data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      type: "http",
      url,
      method,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

async function executeDbNode(node: any, inputs: Record<string, any>, config: any): Promise<any> {
  const query = config.query || "";
  // In production, use parameterized queries
  return {
    type: "db",
    query,
    result: `Executed: ${query}`,
    timestamp: new Date().toISOString(),
  };
}