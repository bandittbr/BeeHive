export const SYSTEM_COMMANDS = {
  // Kernel
  KERNEL_STATUS: 'kernel:status',
  KERNEL_RESTART: 'kernel:restart',

  // Modules
  MODULE_LOAD: 'module:load',
  MODULE_UNLOAD: 'module:unload',
  MODULE_LIST: 'module:list',
  MODULE_CONFIG: 'module:config',

  // AI
  AI_EXECUTE: 'ai:execute',
  AI_EXECUTE_STREAM: 'ai:execute:stream',
  AI_EXECUTE_TOOLS: 'ai:execute:tools',
  AI_LIST_PROVIDERS: 'ai:list:providers',
  AI_LIST_MODELS: 'ai:list:models',

  // Providers
  PROVIDER_REGISTER: 'provider:register',
  PROVIDER_UNREGISTER: 'provider:unregister',
  PROVIDER_TEST: 'provider:test',
  PROVIDER_SET_ACTIVE: 'provider:set:active',
  PROVIDER_SET_PRIORITY: 'provider:set:priority',

  // Agents
  AGENT_CREATE: 'agent:create',
  AGENT_DESTROY: 'agent:destroy',
  AGENT_EXECUTE: 'agent:execute',
  AGENT_SEND_MESSAGE: 'agent:send:message',
  AGENT_STOP: 'agent:stop',
  AGENT_LIST: 'agent:list',

  // Conversation
  CONVERSATION_SEND: 'conversation:send',
  CONVERSATION_STREAM: 'conversation:stream',
  CONVERSATION_HISTORY: 'conversation:history',
  CONVERSATION_CLEAR: 'conversation:clear',

  // Workflows
  WORKFLOW_CREATE: 'workflow:create',
  WORKFLOW_START: 'workflow:start',
  WORKFLOW_CANCEL: 'workflow:cancel',
  WORKFLOW_PAUSE: 'workflow:pause',
  WORKFLOW_RESUME: 'workflow:resume',
  WORKFLOW_LIST: 'workflow:list',

  // Projects
  PROJECT_CREATE: 'project:create',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',
  PROJECT_LIST: 'project:list',
  PROJECT_GET: 'project:get',

  // Workspace
  WORKSPACE_CREATE: 'workspace:create',
  WORKSPACE_UPDATE: 'workspace:update',
  WORKSPACE_DELETE: 'workspace:delete',
  WORKSPACE_LIST: 'workspace:list',
  WORKSPACE_ADD_MEMBER: 'workspace:add:member',
  WORKSPACE_REMOVE_MEMBER: 'workspace:remove:member',

  // Memory
  MEMORY_STORE: 'memory:store',
  MEMORY_SEARCH: 'memory:search',
  MEMORY_SEMANTIC_SEARCH: 'memory:semantic:search',
  MEMORY_FORGET: 'memory:forget',

  // Tools
  TOOL_EXECUTE: 'tool:execute',
  TOOL_LIST: 'tool:list',
  TOOL_REGISTER: 'tool:register',
  TOOL_UNREGISTER: 'tool:unregister',

  // Billing
  BILLING_GET_SUBSCRIPTION: 'billing:get:subscription',
  BILLING_CHANGE_PLAN: 'billing:change:plan',
  BILLING_GET_INVOICES: 'billing:get:invoices',
  BILLING_GET_USAGE: 'billing:get:usage',

  // Admin
  ADMIN_GET_SYSTEM_METRICS: 'admin:get:system:metrics',
  ADMIN_LIST_USERS: 'admin:list:users',
  ADMIN_GET_LOGS: 'admin:get:logs',
} as const;

export type SystemCommandType = (typeof SYSTEM_COMMANDS)[keyof typeof SYSTEM_COMMANDS];
