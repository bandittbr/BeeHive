// Control Center Service — persistência e sincronização
import {
  loadControlCenterState,
  saveControlCenterState,
  type ControlCenterState,
} from '../stores/control-center';

export class ControlCenterService {
  private state: ControlCenterState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = loadControlCenterState();
  }

  getState(): ControlCenterState {
    return this.state;
  }

  getSection<K extends keyof ControlCenterState>(section: K): ControlCenterState[K] {
    return this.state[section];
  }

  updateSection<K extends keyof ControlCenterState>(section: K, updates: Partial<ControlCenterState[K]>): void {
    this.state[section] = { ...this.state[section], ...updates };
    saveControlCenterState(this.state);
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
