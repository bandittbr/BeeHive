export interface QueryEnvelope<T = unknown> {
  id: string;
  type: string;
  source: string;
  timestamp: number;
  payload: T;
  metadata?: Record<string, unknown>;
}

export interface QueryResult<T = unknown> {
  data: T;
  metadata: {
    duration: number;
    source?: string;
  };
}

export type QueryHandler<T = unknown, R = unknown> = (
  query: QueryEnvelope<T>
) => Promise<R>;

export interface IQueryBus {
  query<T, R>(type: string, payload: T): Promise<QueryResult<R>>;
  on<T, R>(queryType: string, handler: QueryHandler<T, R>): void;
  off(queryType: string): void;
}
