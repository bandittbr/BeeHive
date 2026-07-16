export interface ServiceDefinition {
  id: string;
  name: string;
  version: string;
  dependencies?: string[];
}

export interface IService {
  readonly id: string;
  init(): Promise<void>;
  destroy(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export interface IServiceRegistry {
  register(serviceId: string, factory: () => IService): void;
  unregister(serviceId: string): void;
  get<T extends IService>(serviceId: string): T;
  getAll(): Map<string, IService>;
  isRegistered(serviceId: string): boolean;
}

export interface IPermissionService {
  hasPermission(subject: string, action: string, resource: string): Promise<boolean>;
  requirePermission(subject: string, action: string, resource: string): Promise<void>;
}
