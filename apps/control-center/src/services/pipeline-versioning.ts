import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface PipelineVersion {
  id: string;
  pipelineId: string;
  version: number;
  name: string;
  description?: string;
  nodes: any[];
  edges: any[];
  changelog?: string;
  createdBy: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface CreateVersionInput {
  pipelineId: string;
  version: number;
  name: string;
  description?: string;
  nodes: any[];
  edges: any[];
  createdBy: string;
  changelog?: string;
}

class PipelineVersionService {
  async getVersions(pipelineId: string): Promise<PipelineVersion[]> {
    const versions = await prisma.pipelineVersion.findMany({
      where: { pipelineId },
      orderBy: { version: "desc" },
    });

    return versions.map(v => ({
      id: v.id,
      pipelineId: v.pipelineId,
      version: v.version,
      name: v.name,
      description: v.description,
      nodes: v.nodes as any[],
      edges: v.edges as any[],
      changelog: v.changelog,
      createdBy: v.createdBy,
      createdAt: v.createdAt.toISOString(),
      isCurrent: v.isCurrent,
    }));
  }

  async getVersion(pipelineId: string, version: number): Promise<PipelineVersion | null> {
    const v = await prisma.pipelineVersion.findUnique({
      where: { pipelineId_version: { pipelineId, version } },
    });

    if (!v) return null;

    return {
      id: v.id,
      pipelineId: v.pipelineId,
      version: v.version,
      name: v.name,
      description: v.description,
      nodes: v.nodes as any[],
      edges: v.edges as any[],
      changelog: v.changelog,
      createdBy: v.createdBy,
      createdAt: v.createdAt.toISOString(),
      isCurrent: v.isCurrent,
    };
  }

  async createVersion(input: CreateVersionInput): Promise<any> {
    // Mark all previous versions as not current
    await prisma.pipelineVersion.updateMany({
      where: { pipelineId: input.pipelineId },
      data: { isCurrent: false },
    });

    const version = await prisma.pipelineVersion.create({
      data: {
        pipelineId: input.pipelineId,
        version: input.version,
        name: input.name,
        description: input.description,
        nodes: input.nodes,
        edges: input.edges,
        changelog: input.changelog,
        createdBy: input.createdBy,
        isCurrent: true,
      },
    });

    return {
      id: version.id,
      pipelineId: version.pipelineId,
      version: version.version,
      name: version.name,
      description: version.description,
      nodes: version.nodes as any[],
      edges: version.edges as any[],
      changelog: version.changelog,
      createdBy: version.createdBy,
      createdAt: version.createdAt.toISOString(),
      isCurrent: version.isCurrent,
    };
  }

  async restoreVersion(pipelineId: string, version: number, userId: string): Promise<any> {
    const sourceVersion = await this.getVersion(pipelineId, version);
    if (!sourceVersion) throw new Error("Version not found");

    // Create new version from restored one
    const versions = await this.getVersions(pipelineId);
    const nextVersion = Math.max(...versions.map(v => v.version)) + 1;

    return this.createVersion({
      pipelineId,
      version: nextVersion,
      name: `${sourceVersion.name} (restored from v${version})`,
      description: `Restored from version ${version}`,
      nodes: sourceVersion.nodes,
      edges: sourceVersion.edges,
      createdBy: userId,
      changelog: `Restored from version ${version} (${sourceVersion.name})`,
    });
  }

  async deleteVersion(pipelineId: string, version: number): Promise<void> {
    const v = await this.getVersion(pipelineId, version);
    if (!v) throw new Error("Version not found");
    
    if (v.isCurrent) throw new Error("Cannot delete current version");

    await prisma.pipelineVersion.delete({
      where: { pipelineId_version: { pipelineId, version } },
    });
  }

  async getDiff(pipelineId: string, fromVersion: number, toVersion: number): Promise<any> {
    const [from, to] = await Promise.all([
      this.getVersion(pipelineId, fromVersion),
      this.getVersion(pipelineId, toVersion),
    ]);

    if (!from || !to) throw new Error("One or both versions not found");

    return {
      fromVersion: from.version,
      toVersion: to.version,
      nodes: this.diffArrays(from.nodes, to.nodes, "id"),
      edges: this.diffArrays(from.edges, to.edges, "id"),
    };
  }

  private diffArrays(oldArr: any[], newArr: any[], key: string): any {
    const oldMap = new Map(oldArr.map(item => [item[key], item]));
    const newMap = new Map(newArr.map(item => [item[key], item]));

    const added = newArr.filter(item => !oldMap.has(item[key]));
    const removed = oldArr.filter(item => !newMap.has(item[key]));
    const modified = newArr
      .filter(item => oldMap.has(item[key]))
      .filter(item => JSON.stringify(item) !== JSON.stringify(oldMap.get(item[key])))
      .map(item => ({
        key: item[key],
        old: oldMap.get(item[key]),
        new: item,
      }));

    return { added, removed, modified };
  }
}

export const pipelineVersionService = new PipelineVersionService();