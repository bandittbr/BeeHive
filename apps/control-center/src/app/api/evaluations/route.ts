import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  try {
    const suites = await prisma.evaluationSuite.findMany({
      where: { projectId },
      include: {
        testCases: true,
        runs: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ suites });
  } catch (error) {
    console.error("Error fetching evaluation suites:", error);
    return NextResponse.json({ error: "Failed to fetch evaluation suites" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, pipelineId, name, description, createdBy } = body;

    if (!projectId || !name) {
      return NextResponse.json({ error: "projectId and name required" }, { status: 400 });
    }

    const suite = await prisma.evaluationSuite.create({
      data: { projectId, pipelineId, name, description, createdBy: createdBy || "current-user" },
    });

    return NextResponse.json({ suite }, { status: 201 });
  } catch (error) {
    console.error("Error creating evaluation suite:", error);
    return NextResponse.json({ error: "Failed to create evaluation suite" }, { status: 500 });
  }
}
