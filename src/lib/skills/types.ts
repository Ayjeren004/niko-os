export type SafetyLevel = 'safe' | 'read' | 'write' | 'destructive';

export interface SkillAction {
  name: string; // The function name exposed to the LLM (e.g., 'createTask')
  description: string; // Instructions for the LLM on when/how to use it
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  safetyLevel: SafetyLevel;
  handler: (args: any, context: { userId: string, models?: any }) => Promise<any>;
}

export interface Skill {
  id: string; // e.g., 'task_skill'
  name: string; // e.g., 'Task Manager'
  description: string; // General description of what the skill does
  actions: SkillAction[];
}
