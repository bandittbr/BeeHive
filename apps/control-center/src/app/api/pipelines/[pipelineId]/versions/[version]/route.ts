import { NextRequest, NextResponse } from "next/server";
import { pipelineVersionService } from "@/services/pipeline-versioning";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pipelineId: string; version: string }> }
) {
  try {
    const { pipelineId, version } = await params;
    const versionData = await pipelineVersionService.getVersion(pipelineId, parseInt(version));
    
    if (!versionData) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }
    
    return NextResponse.json({ version: versionData });
  } catch (error) {
    console.error("Error fetching pipeline version:", error);
    return NextResponse.json({ error: "Failed to fetch version" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pipelineId: string; version: string }> }
) {
  try {
    const { pipelineId, version } = await params;
    const body = await request.json();
    const { action, userId } = body;

    if (action === "restore") {
      const restored = await pipelineVersionService.restoreVersion(pipelineId, parseInt(version), userId || "current-user");
      return NextResponse.json({ version: restored });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error restoring pipeline version:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to restore version" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pipelineId: string; version: string }> }
) {
  try {
    const { pipelineId, version } = await params;
    await pipelineVersionService.deleteVersion(pipelineId, parseInt(version));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pipeline version:", error);
    return NextResponse.json({ error: "Failed to delete version" }, { status: 500 });
  }
}