import ollama, { Tool } from 'ollama';
import { executeTool, OLLAMA_TOOLS } from './tools';

export interface AgentAbstration {
  name: string;
  role: string;
  systemPrompt: string;
  tools: Tool[];
}

const RESEARCH_AGENT: AgentAbstration = {
  name: 'Research Agent',
  role: 'Context and fact retrieval expert',
  systemPrompt: 'You are the Research Agent. Your job is to search the user\'s uploaded documents and past memories to find accurate facts and context. Never hallucinate. Only return facts based on your tool outputs.',
  tools: OLLAMA_TOOLS.filter(t => ['searchDocuments', 'listMemories'].includes(t.function.name as string))
};

const PLANNER_AGENT: AgentAbstration = {
  name: 'Planner Agent',
  role: 'Task and action planning expert',
  systemPrompt: 'You are the Planner Agent. Your job is to break down requests into actionable tasks and create them using your tools. Be concise.',
  tools: OLLAMA_TOOLS.filter(t => ['createTask'].includes(t.function.name as string))
};

const MEMORY_AGENT: AgentAbstration = {
  name: 'Memory Agent',
  role: 'Long-term state retention expert',
  systemPrompt: 'You are the Memory Agent. Your job is to decide if a fact is worth remembering long-term (like preferences, routines, or goals) and save it using your tools. Do not save temporary emotions.',
  tools: OLLAMA_TOOLS.filter(t => ['createMemory'].includes(t.function.name as string))
};

// Generic execution loop for any internal agent
export async function runAgent(agent: AgentAbstration, input: string, userId: string): Promise<string> {
  const messages: any[] = [
    { role: 'system', content: agent.systemPrompt },
    { role: 'user', content: input }
  ];

  console.log(`[MAS] Invoking ${agent.name}...`);
  
  // 1. Let agent decide if it needs tools
  const response = await ollama.chat({
    model: 'llama3.2',
    messages,
    tools: agent.tools
  });

  if (!response.message.tool_calls || response.message.tool_calls.length === 0) {
    return response.message.content; // Agent just replied directly
  }

  // 2. Execute tools
  messages.push(response.message);
  for (const tool of response.message.tool_calls) {
    console.log(`[MAS] ${agent.name} using tool ${tool.function.name}...`);
    const result = await executeTool(tool.function.name, tool.function.arguments, userId);
    messages.push({
      role: 'tool',
      content: JSON.stringify(result)
    });
  }

  // 3. Final summary from agent
  const finalResponse = await ollama.chat({
    model: 'llama3.2',
    messages
  });

  return finalResponse.message.content;
}

// Map tool calls to their respective agents
export const ORCHESTRATOR_TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'invoke_research_agent',
      description: 'Delegate to the Research Agent to search through uploaded documents and past memories. Use this when the user asks about their files or past context.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'What to research exactly' } },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'invoke_planner_agent',
      description: 'Delegate to the Planner Agent to create, update, or manage tasks and action plans for the user.',
      parameters: {
        type: 'object',
        properties: { instruction: { type: 'string', description: 'What to plan or what task to create' } },
        required: ['instruction']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'invoke_memory_agent',
      description: 'Delegate to the Memory Agent to save an important long-term fact about the user.',
      parameters: {
        type: 'object',
        properties: { fact: { type: 'string', description: 'The exact fact to remember' } },
        required: ['fact']
      }
    }
  }
];

// Orchestrator tool executor
export async function executeOrchestratorTool(name: string, args: any, userId: string): Promise<any> {
  try {
    switch (name) {
      case 'invoke_research_agent':
        const researchResult = await runAgent(RESEARCH_AGENT, args.query, userId);
        return { agent_report: researchResult };
      case 'invoke_planner_agent':
        const plannerResult = await runAgent(PLANNER_AGENT, args.instruction, userId);
        return { agent_report: plannerResult };
      case 'invoke_memory_agent':
        const memoryResult = await runAgent(MEMORY_AGENT, args.fact, userId);
        return { agent_report: memoryResult };
      default:
        return { error: `Agent tool ${name} not found` };
    }
  } catch (err: any) {
    return { error: err.message };
  }
}
