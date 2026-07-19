import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // In a real implementation, this would fetch from database
    const job = {
      id,
      pipelineId: "pipeline-1",
      projectId: "project-1",
      name: "Daily Build",
      cronExpression: "0 2 * * *",
      enabled: true,
      timezone: "America/Sao_Paulo",
      fieldLabel: "Horário de execução",
      fieldPlaceholder: "Ex: 0 2 * * *",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      runCount: 0,
      status: "active",
      lastRun: null,
      nextRun: "2024-01-15T02:00:00Z",
    };

    return NextResponse.json({ job });
  } catch (error) {
    console.error("Error fetching scheduled job:", error);
    return NextResponse.json({ error: "Failed to fetch scheduled job" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const { enabled, cronExpression, name, timezone } = await request.json();
    
    // In a real implementation, update the job in database
    const updatedJob = {
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ job: updatedJob });
  } catch (error) {
    console.error("Error updating scheduled job:", error);
    return NextResponse.json({ error: "Failed to update scheduled job" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // In a real implementation, delete from database
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting scheduled job:", error);
    return NextResponse.json({ error: "Failed to delete scheduled job" }, { status: 500 });
  }
}