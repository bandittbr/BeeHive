import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get("projectId");
  const limit = parseInt(searchParams.get("limit") || "20");
  const cursor = searchParams.get("cursor");

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: { projectId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
    });

    let nextCursor: string | undefined;
    if (conversations.length > limit) {
      const next = conversations.pop();
      nextCursor = next?.id;
    }

    return NextResponse.json({
      conversations: conversations.map(c => ({
        id: c.id,
        title: c.title,
        projectId: c.projectId,
        model: c.model,
        reasoningEffort: c.reasoningEffort,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        messageCount: c.messages.length,
        lastMessage: c.messages[0] ? {
          role: c.messages[0].role,
          content: c.messages[0].content.slice(0, 100),
          createdAt: c.messages[0].createdAt.toISOString(),
        } : null,
      })),
      nextCursor,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, title, model = "opencode:big-pickle", reasoningEffort = "default" } = body;

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const conversation = await prisma.conversation.create({
      data: {
        projectId,
        title: title || "Nova conversa",
        model,
        reasoningEffort,
      },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}