export interface IMetricsCollector {
  increment(counter: string, value?: number): void;
  gauge(gauge: string, value: number): void;
  timing(metric: string, duration: number): void;
  histogram(metric: string, value: number): void;
  snapshot(): Record<string, unknown>;
}
