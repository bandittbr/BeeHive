import type { EvaluationSuite, EvaluationRun, EvaluationTestCase } from "../types";

export interface EvaluationData {
  suites: EvaluationSuite[];
}

export async function fetchEvaluationSuites(projectId: string): Promise<EvaluationData> {
  const res = await fetch(`/api/evaluations?projectId=${projectId}`);
  if (!res.ok) throw new Error("Failed to fetch evaluation suites");
  return res.json();
}

export async function fetchSuite(suiteId: string): Promise<{ suite: EvaluationSuite }> {
  const res = await fetch(`/api/evaluations/suites/${suiteId}`);
  if (!res.ok) throw new Error("Failed to fetch suite");
  return res.json();
}

export async function createSuite(data: {
  projectId: string;
  pipelineId?: string;
  name: string;
  description?: string;
  createdBy?: string;
}): Promise<{ suite: EvaluationSuite }> {
  const res = await fetch("/api/evaluations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create suite");
  return res.json();
}

export async function updateSuite(suiteId: string, data: { name?: string; description?: string; pipelineId?: string }): Promise<{ suite: EvaluationSuite }> {
  const res = await fetch(`/api/evaluations/suites/${suiteId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update suite");
  return res.json();
}

export async function deleteSuite(suiteId: string): Promise<void> {
  const res = await fetch(`/api/evaluations/suites/${suiteId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete suite");
}

export async function fetchRuns(suiteId: string): Promise<{ runs: EvaluationRun[] }> {
  const res = await fetch(`/api/evaluations/runs?suiteId=${suiteId}`);
  if (!res.ok) throw new Error("Failed to fetch runs");
  return res.json();
}

export async function startRun(suiteId: string, pipelineId: string): Promise<{ run: EvaluationRun }> {
  const res = await fetch("/api/evaluations/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ suiteId, pipelineId }),
  });
  if (!res.ok) throw new Error("Failed to start run");
  return res.json();
}
