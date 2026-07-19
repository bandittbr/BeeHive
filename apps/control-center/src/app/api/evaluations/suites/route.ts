import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { suiteId, name, description, input, expectedOutput, assertions, metadata } = body;

    if (!suiteId || !name) {
      return NextResponse.json({ error: "suiteId and name required" }, { status: 400 });
    }

    const testCase = await prisma.evaluationTestCase.create({
      data: {
        suiteId,
        name,
        description,
        input: input || {},
        expectedOutput: expectedOutput || null,
        assertions: assertions || [],
        metadata: metadata || {},
      },
    });

    return NextResponse.json({ testCase }, { status: 201 });
  } catch (error) {
    console.error("Error creating test case:", error);
    return NextResponse.json({ error: "Failed to create test case" }, { status: 500 });
  }
}
