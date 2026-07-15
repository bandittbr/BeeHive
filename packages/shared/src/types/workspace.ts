import type { PlanType } from './billing';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: PlanType;
  settings: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceMember {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  joinedAt: number;
  user?: {
    name?: string;
    email: string;
    image?: string;
  };
}

export type WorkspaceRole =
  | 'OWNER'
  | 'ADMIN'
  | 'MEMBER'
  | 'VIEWER';

export interface IWorkspaceService {
  create(name: string, ownerId: string): Promise<Workspace>;
  get(id: string): Promise<Workspace | null>;
  update(id: string, data: Partial<Workspace>): Promise<Workspace>;
  delete(id: string): Promise<void>;
  list(userId: string): Promise<Workspace[]>;

  addMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ): Promise<void>;
  removeMember(workspaceId: string, userId: string): Promise<void>;
  updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ): Promise<void>;
  getMembers(workspaceId: string): Promise<WorkspaceMember[]>;
}
