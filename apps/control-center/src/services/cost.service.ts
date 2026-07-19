export interface CostRecord {
  id: string;
  projectId: string;
  executionId?: string;
  pipelineId?: string;
  nodeId?: string;
  nodeType?: string;
  model?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CostSummary {
  totalCost: number;
  totalTokens: number;
  recordCount: number;
}

export interface CostDashboardData {
  summary: CostSummary;
  byModel: Record<string, { cost: number; tokens: number; count: number }>;
  byNodeType: Record<string, { cost: number; tokens: number; count: number }>;
  byDate: Record<string, { cost: number; tokens: number }>;
  records: CostRecord[];
}

export async function fetchCosts(projectId: string, period = "7d"): Promise<CostDashboardData> {
  const res = await fetch(`/api/costs?projectId=${projectId}&period=${period}`);
  if (!res.ok) throw new Error("Failed to fetch costs");
  return res.json();
}

export async function recordCost(data: {
  projectId: string;
  executionId?: string;
  pipelineId?: string;
  nodeId?: string;
  nodeType?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await fetch("/api/costs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
