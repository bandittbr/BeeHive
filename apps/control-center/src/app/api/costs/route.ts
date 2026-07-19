import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get("projectId");
  const period = searchParams.get("period") || "7d";

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  try {
    const periodMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const days = periodMap[period] || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const records = await prisma.costRecord.findMany({
      where: { projectId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    });

    const totalCost = records.reduce((sum, r) => sum + r.costUsd, 0);
    const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0);

    const byModel: Record<string, { cost: number; tokens: number; count: number }> = {};
    const byNodeType: Record<string, { cost: number; tokens: number; count: number }> = {};
    const byDate: Record<string, { cost: number; tokens: number }> = {};

    for (const r of records) {
      const model = r.model || "unknown";
      if (!byModel[model]) byModel[model] = { cost: 0, tokens: 0, count: 0 };
      byModel[model].cost += r.costUsd;
      byModel[model].tokens += r.totalTokens;
      byModel[model].count++;

      const nt = r.nodeType || "unknown";
      if (!byNodeType[nt]) byNodeType[nt] = { cost: 0, tokens: 0, count: 0 };
      byNodeType[nt].cost += r.costUsd;
      byNodeType[nt].tokens += r.totalTokens;
      byNodeType[nt].count++;

      const dateKey = r.createdAt.toISOString().slice(0, 10);
      if (!byDate[dateKey]) byDate[dateKey] = { cost: 0, tokens: 0 };
      byDate[dateKey].cost += r.costUsd;
      byDate[dateKey].tokens += r.totalTokens;
    }

    return NextResponse.json({
      summary: { totalCost, totalTokens, recordCount: records.length },
      byModel,
      byNodeType,
      byDate,
      records: records.map(r => ({
        id: r.id,
        nodeType: r.nodeType,
        model: r.model,
        promptTokens: r.promptTokens,
        completionTokens: r.completionTokens,
        totalTokens: r.totalTokens,
        costUsd: r.costUsd,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching costs:", error);
    return NextResponse.json({ error: "Failed to fetch costs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, executionId, pipelineId, nodeId, nodeType, model, promptTokens, completionTokens, costUsd, metadata } = body;

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const totalTokens = (promptTokens || 0) + (completionTokens || 0);

    const record = await prisma.costRecord.create({
      data: {
        projectId,
        executionId,
        pipelineId,
        nodeId,
        nodeType,
        model,
        promptTokens: promptTokens || 0,
        completionTokens: completionTokens || 0,
        totalTokens,
        costUsd: costUsd || 0,
        metadata: metadata || {},
      },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    console.error("Error creating cost record:", error);
    return NextResponse.json({ error: "Failed to create cost record" }, { status: 500 });
  }
}
