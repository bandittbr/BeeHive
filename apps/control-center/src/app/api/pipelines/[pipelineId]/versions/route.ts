import { NextRequest, NextResponse } from "next/server";
import { pipelineVersionService } from "@/services/pipeline-versioning";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pipelineId: string }> }
) {
  try {
    const { pipelineId } = await params;
    const versions = await pipelineVersionService.getVersions(pipelineId);
    return NextResponse.json({ versions });
  } catch (error) {
    console.error("Error fetching pipeline versions:", error);
    return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pipelineId: string }> }
) {
  try {
    const { pipelineId } = await params;
    const body = await request.json();
    const { name, description, changelog } = body;

    // Get current version number
    const versions = await pipelineVersionService.getVersions(pipelineId);
    const nextVersion = versions.length > 0 ? Math.max(...versions.map(v => v.version)) + 1 : 1;

    const version = await pipelineVersionService.createVersion({
      pipelineId,
      version: nextVersion,
      name: name || `Version ${nextVersion}`,
      description,
      nodes: body.nodes,
      edges: body.edges,
      createdBy: "current-user",
      changelog,
    });

    return NextResponse.json({ version }, { status: 201 });
  } catch (error) {
    console.error("Error creating pipeline version:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create version" }, { status: 500 });
  }
}