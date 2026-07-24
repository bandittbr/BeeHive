export interface ISecretsManager {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  rotate(key: string, generator?: () => string): Promise<string>;
}
