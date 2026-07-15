export interface SkillDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  triggers: SkillTrigger[];
  actions: SkillAction[];
  config?: Record<string, unknown>;
}

export type SkillTrigger =
  | { type: 'event'; eventType: string; filter?: string }
  | { type: 'command'; command: string }
  | { type: 'schedule'; cron: string }
  | { type: 'keyword'; keywords: string[]; match: 'any' | 'all' }
  | { type: 'webhook'; path: string; method?: string };

export interface SkillAction {
  id: string;
  type:
    | 'prompt-llm'
    | 'execute-tool'
    | 'emit-event'
    | 'run-workflow'
    | 'http-request'
    | 'send-notification';
  config: Record<string, unknown>;
}

export interface ISkillManager {
  load(skill: SkillDefinition): Promise<void>;
  unload(skillId: string): Promise<void>;
  list(): SkillDefinition[];
  get(skillId: string): SkillDefinition | undefined;
  findMatchingSkills(eventType: string, payload?: unknown): SkillDefinition[];
}
