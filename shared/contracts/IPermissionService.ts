export interface IPermissionService {
  check(userId: string, action: string, resource: string): Promise<boolean>;
  grant(role: string, action: string): void;
  revoke(role: string, action: string): void;
  listRoles(): string[];
}
