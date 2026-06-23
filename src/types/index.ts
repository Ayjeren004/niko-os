export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  createdAt: string;
  extractedMemory?: Memory;
  toolCalls?: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  updatedAt: string;
  messages?: Message[];
}

export interface Memory {
  id: string;
  content: string;
  category?: string | null;
  isOutdated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  createdAt: string;
}

export interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
}

export interface Briefing {
  id: string;
  content: string;
  date: string;
  createdAt: string;
}
