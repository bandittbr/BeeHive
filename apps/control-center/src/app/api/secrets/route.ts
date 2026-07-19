import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ENCRYPTION_KEY = process.env.SECRET_ENCRYPTION_KEY || "beehive-secret-key-32-chars!!";

function encrypt(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
  }
  return btoa(result);
}

function decrypt(encrypted: string): string {
  try {
    const text = atob(encrypted);
    let result = "";
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
    }
    return result;
  } catch {
    return "";
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  try {
    const secrets = await prisma.secret.findMany({
      where: { projectId },
      orderBy: { key: "asc" },
    });

    return NextResponse.json({
      secrets: secrets.map(s => ({
        id: s.id,
        key: s.key,
        value: decrypt(s.value),
        type: s.type,
        description: s.description,
        createdBy: s.createdBy,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching secrets:", error);
    return NextResponse.json({ error: "Failed to fetch secrets" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, key, value, type, description, createdBy } = body;

    if (!projectId || !key || !value) {
      return NextResponse.json({ error: "projectId, key, and value required" }, { status: 400 });
    }

    const existing = await prisma.secret.findUnique({
      where: { projectId_key: { projectId, key: key.toUpperCase() } },
    });

    if (existing) {
      return NextResponse.json({ error: `Secret "${key}" already exists` }, { status: 400 });
    }

    const encrypted = encrypt(value);

    const secret = await prisma.secret.create({
      data: {
        projectId,
        key: key.toUpperCase(),
        value: encrypted,
        type: type || "STRING",
        description,
        createdBy: createdBy || "current-user",
      },
    });

    return NextResponse.json({
      secret: {
        id: secret.id,
        key: secret.key,
        value: value,
        type: secret.type,
        description: secret.description,
        createdBy: secret.createdBy,
        createdAt: secret.createdAt.toISOString(),
        updatedAt: secret.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating secret:", error);
    return NextResponse.json({ error: "Failed to create secret" }, { status: 500 });
  }
}