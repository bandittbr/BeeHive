declare module 'playwright-stealth' {
  export default function stealth(context: {
    newPage(): Promise<any>;
    on(event: string, listener: (...args: any[]) => void): any;
    addInitScript(script: string): Promise<void>;
  }): Promise<void>;
}