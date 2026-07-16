export interface ITracing {
  startSpan(name: string, options?: SpanOptions): ISpan;
  getCurrentSpan(): ISpan | null;
  inject(context: unknown): Record<string, string>;
  extract(headers: Record<string, string>): unknown;
}

export interface ISpan {
  readonly spanId: string;
  readonly traceId: string;
  readonly name: string;

  setAttribute(key: string, value: unknown): void;
  setStatus(status: SpanStatus): void;
  addEvent(name: string, attributes?: Record<string, unknown>): void;
  end(): void;
}

export type SpanStatus = 'OK' | 'ERROR' | 'UNSET';

export interface SpanOptions {
  parentSpan?: ISpan;
  attributes?: Record<string, unknown>;
  startTime?: number;
}

export interface ITraceExporter {
  export(spans: SpanData[]): Promise<void>;
  shutdown(): Promise<void>;
}

export interface SpanData {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  status: SpanStatus;
  attributes: Record<string, unknown>;
  events: SpanEvent[];
  startTime: number;
  endTime: number;
  duration: number;
  service: string;
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes: Record<string, unknown>;
}
