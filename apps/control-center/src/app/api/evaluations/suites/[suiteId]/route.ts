import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(_request: NextRequest, { params }: { params: { suiteId: string } }) {
  try {
    const suite = await prisma.evaluationSuite.findUnique({
      where: { id: params.suiteId },
      include: { testCases: true, runs: { orderBy: { createdAt: "desc" } } },
    });
    if (!suite) return NextResponse.json({ error: "Suite not found" }, { status: 404 });
    return NextResponse.json({ suite });
  } catch (error) {
    console.error("Error fetching suite:", error);
    return NextResponse.json({ error: "Failed to fetch suite" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { suiteId: string } }) {
  try {
    const body = await request.json();
    const suite = await prisma.evaluationSuite.update({
      where: { id: params.suiteId },
      data: { name: body.name, description: body.description, pipelineId: body.pipelineId },
    });
    return NextResponse.json({ suite });
  } catch (error) {
    console.error("Error updating suite:", error);
    return NextResponse.json({ error: "Failed to update suite" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { suiteId: string } }) {
  try {
    await prisma.evaluationSuite.delete({ where: { id: params.suiteId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting suite:", error);
    return NextResponse.json({ error: "Failed to delete suite" }, { status: 500 });
  }
}
