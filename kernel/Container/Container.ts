export class Container {
  private services = new Map<string, unknown>();

  register<T>(id: string, instance: T): void {
    this.services.set(id, instance);
  }

  resolve<T>(id: string): T {
    const svc = this.services.get(id);
    if (!svc) throw new Error(`Service not found: ${id}`);
    return svc as T;
  }

  has(id: string): boolean {
    return this.services.has(id);
  }

  unregister(id: string): void {
    this.services.delete(id);
  }
}
