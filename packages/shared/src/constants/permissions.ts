export const PERMISSIONS = {
  // Workspace
  WORKSPACE_READ: 'workspace:read',
  WORKSPACE_WRITE: 'workspace:write',
  WORKSPACE_DELETE: 'workspace:delete',
  WORKSPACE_MANAGE_MEMBERS: 'workspace:manage:members',

  // Projects
  PROJECT_READ: 'project:read',
  PROJECT_WRITE: 'project:write',
  PROJECT_DELETE: 'project:delete',

  // AI
  AI_CHAT: 'ai:chat',
  AI_STREAM: 'ai:stream',
  AI_MANAGE_PROVIDERS: 'ai:manage:providers',
  AI_USE_TOOLS: 'ai:use:tools',

  // Agents
  AGENT_CREATE: 'agent:create',
  AGENT_EXECUTE: 'agent:execute',
  AGENT_MANAGE: 'agent:manage',

  // Admin
  ADMIN_SYSTEM: 'admin:system',
  ADMIN_USERS: 'admin:users',
  ADMIN_MODULES: 'admin:modules',
  ADMIN_BILLING: 'admin:billing',

  // Files
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_DELETE: 'file:delete',

  // Billing
  BILLING_READ: 'billing:read',
  BILLING_MANAGE: 'billing:manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: Object.values(PERMISSIONS),
  USER: [
    PERMISSIONS.WORKSPACE_READ,
    PERMISSIONS.WORKSPACE_WRITE,
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.PROJECT_WRITE,
    PERMISSIONS.AI_CHAT,
    PERMISSIONS.AI_STREAM,
    PERMISSIONS.AI_MANAGE_PROVIDERS,
    PERMISSIONS.AI_USE_TOOLS,
    PERMISSIONS.AGENT_CREATE,
    PERMISSIONS.AGENT_EXECUTE,
    PERMISSIONS.FILE_READ,
    PERMISSIONS.FILE_WRITE,
    PERMISSIONS.BILLING_READ,
  ],
};
