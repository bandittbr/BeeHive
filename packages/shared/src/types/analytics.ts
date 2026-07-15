export interface AnalyticsEvent {
  id: string;
  event: string;
  userId?: string;
  workspaceId?: string;
  sessionId?: string;
  properties: Record<string, unknown>;
  timestamp: number;
}

export interface AnalyticsQuery {
  event?: string;
  userId?: string;
  workspaceId?: string;
  from?: number;
  to?: number;
  groupBy?: string;
  limit?: number;
}

export interface AnalyticsResult {
  events: AnalyticsEvent[];
  total: number;
  aggregation?: Record<string, number>;
}

export interface SystemMetrics {
  kernelUptime: number;
  moduleCount: number;
  pluginCount: number;
  eventsEmitted: number;
  eventsFailed: number;
  activeSubscriptions: number;
  totalTokensUsed: number;
  totalCost: number;
  requestsPerMinute: number;
  averageLatency: number;
  activeAgents: number;
  cpuUsage: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
  activeConnections: number;
  queueSizes: Record<string, number>;
  providerUsage: Record<string, {
    tokens: number;
    cost: number;
    requests: number;
  }>;
}

export interface IAnalyticsService {
  track(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void>;
  query(query: AnalyticsQuery): Promise<AnalyticsResult>;
  getSystemMetrics(): Promise<SystemMetrics>;
  flush(): Promise<void>;
}
