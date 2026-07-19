import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(_request: NextRequest, { params }: { params: { testCaseId: string } }) {
  try {
    const testCase = await prisma.evaluationTestCase.findUnique({ where: { id: params.testCaseId } });
    if (!testCase) return NextResponse.json({ error: "TestCase not found" }, { status: 404 });
    return NextResponse.json({ testCase });
  } catch (error) {
    console.error("Error fetching test case:", error);
    return NextResponse.json({ error: "Failed to fetch test case" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { testCaseId: string } }) {
  try {
    const body = await request.json();
    const testCase = await prisma.evaluationTestCase.update({
      where: { id: params.testCaseId },
      data: {
        name: body.name,
        description: body.description,
        input: body.input,
        expectedOutput: body.expectedOutput,
        assertions: body.assertions,
        metadata: body.metadata,
      },
    });
    return NextResponse.json({ testCase });
  } catch (error) {
    console.error("Error updating test case:", error);
    return NextResponse.json({ error: "Failed to update test case" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { testCaseId: string } }) {
  try {
    await prisma.evaluationTestCase.delete({ where: { id: params.testCaseId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting test case:", error);
    return NextResponse.json({ error: "Failed to delete test case" }, { status: 500 });
  }
}
