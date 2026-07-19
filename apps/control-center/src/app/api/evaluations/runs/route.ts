import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const suiteId = searchParams.get("suiteId");

  if (!suiteId) {
    return NextResponse.json({ error: "suiteId required" }, { status: 400 });
  }

  try {
    const runs = await prisma.evaluationRun.findMany({
      where: { suiteId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ runs });
  } catch (error) {
    console.error("Error fetching runs:", error);
    return NextResponse.json({ error: "Failed to fetch runs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { suiteId, pipelineId } = body;

    if (!suiteId || !pipelineId) {
      return NextResponse.json({ error: "suiteId and pipelineId required" }, { status: 400 });
    }

    const suite = await prisma.evaluationSuite.findUnique({
      where: { id: suiteId },
      include: { testCases: true },
    });

    if (!suite) {
      return NextResponse.json({ error: "Suite not found" }, { status: 404 });
    }

    const totalCases = suite.testCases.length;

    const run = await prisma.evaluationRun.create({
      data: {
        suiteId,
        pipelineId,
        status: "RUNNING",
        totalCases,
        passedCases: 0,
        failedCases: 0,
        results: suite.testCases.map(tc => ({
          testCaseId: tc.id,
          passed: false,
          output: null,
          duration: 0,
        })),
      },
    });

    const testCaseRuns = suite.testCases.map(tc => ({
      runId: run.id,
      testCaseId: tc.id,
      status: "RUNNING" as const,
      assertionResults: tc.assertions.map((a: unknown) => ({
        assertion: a,
        passed: false,
        actual: null,
        expected: (a as { expected: unknown }).expected,
      })),
    }));

    if (testCaseRuns.length > 0) {
      await prisma.evaluationTestCaseRun.createMany({ data: testCaseRuns });
    }

    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    console.error("Error creating run:", error);
    return NextResponse.json({ error: "Failed to create run" }, { status: 500 });
  }
}
