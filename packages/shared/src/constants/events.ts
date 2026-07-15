export const SYSTEM_EVENTS = {
  KERNEL_BOOTED: 'kernel:booted',
  KERNEL_SHUTDOWN: 'kernel:shutdown',
  KERNEL_HEALTH_CHECK: 'kernel:health:check',
  KERNEL_ERROR: 'kernel:error',

  MODULE_LOADED: 'module:loaded',
  MODULE_LOAD_FAILED: 'module:load:failed',
  MODULE_UNLOADED: 'module:unloaded',
  MODULE_ERROR: 'module:error',
  MODULE_HEALTH_CHANGED: 'module:health:changed',

  PLUGIN_LOADED: 'plugin:loaded',
  PLUGIN_UNLOADED: 'plugin:unloaded',
  PLUGIN_ERROR: 'plugin:error',

  AGENT_CREATED: 'agent:created',
  AGENT_DESTROYED: 'agent:destroyed',
  AGENT_TASK_STARTED: 'agent:task:started',
  AGENT_TASK_COMPLETED: 'agent:task:completed',
  AGENT_TASK_FAILED: 'agent:task:failed',
  AGENT_MESSAGE: 'agent:message',
  AGENT_STATUS_CHANGED: 'agent:status:changed',

  CONVERSATION_STARTED: 'conversation:started',
  CONVERSATION_MESSAGE: 'conversation:message',
  CONVERSATION_ENDED: 'conversation:ended',
  CONVERSATION_STREAM_CHUNK: 'conversation:stream:chunk',

  PROVIDER_CONNECTED: 'provider:connected',
  PROVIDER_DISCONNECTED: 'provider:disconnected',
  PROVIDER_STATUS_CHANGE: 'provider:status:changed',
  PROVIDER_ERROR: 'provider:error',

  WORKFLOW_STARTED: 'workflow:started',
  WORKFLOW_STEP_COMPLETED: 'workflow:step:completed',
  WORKFLOW_STEP_FAILED: 'workflow:step:failed',
  WORKFLOW_COMPLETED: 'workflow:completed',
  WORKFLOW_FAILED: 'workflow:failed',
  WORKFLOW_CANCELLED: 'workflow:cancelled',

  MEMORY_STORED: 'memory:stored',
  MEMORY_SEARCHED: 'memory:searched',
  MEMORY_INDEXED: 'memory:indexed',
  MEMORY_DELETED: 'memory:deleted',

  USER_AUTHENTICATED: 'user:authenticated',
  USER_LOGIN: 'user:login:succeeded',
  USER_LOGIN_FAILED: 'user:login:failed',
  USER_LOGOUT: 'user:logout',
  USER_REGISTERED: 'user:registered',

  BILLING_INVOICE_GENERATED: 'billing:invoice:generated',
  BILLING_PAYMENT_SUCCEEDED: 'billing:payment:succeeded',
  BILLING_PAYMENT_FAILED: 'billing:payment:failed',
  BILLING_PLAN_CHANGED: 'billing:plan:changed',

  NOTIFICATION_SENT: 'notification:sent',

  ERROR_OCCURRED: 'error:occurred',
  ERROR_UNHANDLED: 'error:unhandled',

  SCHEDULER_TICK: 'scheduler:tick',
  SCHEDULER_TASK_EXECUTED: 'scheduler:task:executed',
} as const;

export type SystemEventType = (typeof SYSTEM_EVENTS)[keyof typeof SYSTEM_EVENTS];
