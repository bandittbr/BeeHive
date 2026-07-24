export interface IWorkflowService {
  start(workflowId: string, input?: Record<string, unknown>): Promise<string>;
  on(event: string, handler: Function): void;
  list(): Promise<unknown[]>;
}
