export interface WorkspaceMode {
  id: string;
  name: string;
  icon: string;
  color: string;
  systemPromptOverride: string;
  preferredModel?: string; // e.g. 'mistral' or 'phi3'
  memoryFilter?: string; // 'projects', 'general', etc.
  keywords: string[]; // For heuristic suggestions
}

export const WORKSPACE_MODES: WorkspaceMode[] = [
  {
    id: 'general',
    name: 'General',
    icon: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.974 0-5.749-.536-8.243-1.5m15.686 0a8.959 8.959 0 01-3.143 5.865m-12.543 0a8.959 8.959 0 01-3.143-5.865',
    color: 'text-gray-400',
    systemPromptOverride: '',
    keywords: [],
  },
  {
    id: 'work',
    name: 'Work Mode',
    icon: 'M20.25 14.15v4.25c0 1.094-.896 1.989-2 1.989H5.75c-1.104 0-2-.895-2-1.989v-4.25m16.5 0a4.818 4.818 0 00-1.5-3.81l-3.25-3.25a4.818 4.818 0 00-6.811 0l-3.25 3.25a4.818 4.818 0 00-1.5 3.81m16.5 0a4.818 4.818 0 01-1.5 3.81l-3.25 3.25a4.818 4.818 0 01-6.811 0l-3.25-3.25a4.818 4.818 0 01-1.5-3.81',
    color: 'text-blue-500',
    systemPromptOverride: '\n\n[WORK MODE ACTIVE]: You are in Work Mode. Be highly professional, concise, and action-oriented. Focus heavily on managing tasks and projects.',
    memoryFilter: 'projects',
    preferredModel: 'llama3.2',
    keywords: ['work', 'project', 'deadline', 'meeting', 'task', 'client'],
  },
  {
    id: 'research',
    name: 'Research Mode',
    icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
    color: 'text-purple-500',
    systemPromptOverride: '\n\n[RESEARCH MODE ACTIVE]: You are in Research Mode. Provide detailed, analytical, and highly structured answers. Whenever possible, break down complex concepts step-by-step and synthesize documents effectively.',
    preferredModel: 'mistral', // A larger/reasoning model ideally
    keywords: ['research', 'explain', 'summarize', 'analyze', 'concept', 'study', 'learn', 'how does', 'what is'],
  },
  {
    id: 'personal',
    name: 'Personal Mode',
    icon: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z',
    color: 'text-pink-500',
    systemPromptOverride: '\n\n[PERSONAL MODE ACTIVE]: You are in Personal Mode. Be friendly, conversational, and empathetic. Focus on personal goals, wellness, and casual chats.',
    memoryFilter: 'general',
    keywords: ['feel', 'journal', 'weekend', 'family', 'friend', 'personal', 'goal', 'habit', 'fun'],
  },
  {
    id: 'focus',
    name: 'Focus Mode',
    icon: 'M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.829 1.58-1.986l1.393-.238c.677-.116 1.157-.733 1.123-1.428a16.634 16.634 0 00-1.683-5.232c-.544-1.12-1.5-1.92-2.71-2.227C13.061 6.425 12.54 6 12 6c-.54 0-1.06.425-1.95 1.096-1.21.307-2.166 1.107-2.71 2.227a16.634 16.634 0 00-1.683 5.232c-.034.695.446 1.312 1.123 1.428l1.393.238c.922.157 1.58 1.003 1.58 1.986v.192',
    color: 'text-red-500',
    systemPromptOverride: '\n\n[FOCUS MODE ACTIVE]: You are in Focus Mode. The user is in deep work. Provide absolutely bare-minimum length answers. DO NOT use conversational filler. Be blunt and purely functional.',
    preferredModel: 'phi3', // A fast, tiny model
    keywords: ['urgent', 'quick', 'fast', 'focus', 'sprint', 'now'],
  }
];
