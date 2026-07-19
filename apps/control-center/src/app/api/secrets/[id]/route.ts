import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function encrypt(text: string): string {
  const ENCRYPTION_KEY = process.env.SECRET_ENCRYPTION_KEY || "beehive-secret-key-32-chars!!";
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
  }
  return btoa(result);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { value, description } = body;

    const encrypted = value ? encrypt(value) : undefined;

    const secret = await prisma.secret.update({
      where: { id },
      data: {
        ...(encrypted && { value: encrypted }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json({ secret: { ...secret, value: "" } });
  } catch (error) {
    console.error("Error updating secret:", error);
    return NextResponse.json({ error: "Failed to update secret" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.secret.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting secret:", error);
    return NextResponse.json({ error: "Failed to delete secret" }, { status: 500 });
  }
}