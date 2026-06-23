import prisma from '@/lib/prisma';
import { Tool } from 'ollama';
import { generateEmbedding, cosineSimilarity } from './embeddings';

export const OLLAMA_TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'createMemory',
      description: 'Save an important long-term fact about the user (e.g. preferences, routines, goals). Do not save temporary or useless facts.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'The factual content to remember' }
        },
        required: ['content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listMemories',
      description: 'Fetch saved long-term facts about the user. Use this when the user asks what you know about them. Optionally provide a query to semantic search memories.',
      parameters: { 
        type: 'object', 
        properties: {
          query: { type: 'string', description: 'Optional topic or keyword to search specific memories.' }
        } 
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createTask',
      description: 'Create a new task or todo item for the user.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The title of the task' },
          description: { type: 'string', description: 'Optional detailed description' },
          dueDate: { type: 'string', description: 'Optional due date' }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchDocuments',
      description: 'Search the user\'s uploaded files/documents using keywords. Use this if they ask about their files, PDFs, or uploaded text.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The exact keyword or short phrase to search for.' }
        },
        required: ['query']
      }
    }
  }
];

export async function executeTool(name: string, args: any, userId: string): Promise<any> {
  try {
    switch (name) {
      case 'createMemory':
        if (!args.content) throw new Error("content is required");
        const memEmbedding = await generateEmbedding(args.content);
        const memory = await prisma.memory.create({
          data: { 
            content: args.content, 
            userId: userId,
            embedding: memEmbedding ? JSON.stringify(memEmbedding) : null
          }
        });
        return { success: true, memoryId: memory.id, message: "Memory saved successfully." };
        
      case 'listMemories':
        const allMemories = await prisma.memory.findMany({ where: { userId: userId } });
        
        if (args.query && allMemories.length > 0) {
          const queryEmbedding = await generateEmbedding(args.query);
          if (queryEmbedding) {
            const scoredMemories = allMemories.map(m => {
              const vec = m.embedding ? JSON.parse(m.embedding) : null;
              const score = vec ? cosineSimilarity(queryEmbedding, vec) : -1;
              return { memory: m, score };
            });
            scoredMemories.sort((a, b) => b.score - a.score);
            return { memories: scoredMemories.slice(0, 5).map(s => s.memory.content) };
          } else {
            // Fallback keyword search
            const filtered = allMemories.filter(m => m.content.toLowerCase().includes(args.query.toLowerCase()));
            return { memories: filtered.length > 0 ? filtered.map(m => m.content) : allMemories.map(m => m.content) };
          }
        }
        
        return { memories: allMemories.map(m => m.content) };
        
      case 'createTask':
        if (!args.title) throw new Error("title is required");
        const task = await prisma.task.create({
          data: {
            title: args.title,
            description: args.description || null,
            dueDate: args.dueDate || null,
            userId: userId
          }
        });
        return { success: true, taskId: task.id, message: `Task '${args.title}' created successfully.` };

      case 'searchDocuments':
        if (!args.query) throw new Error("query is required");
        
        const allChunks = await prisma.documentChunk.findMany({
          where: { document: { userId: userId } },
          include: { document: true }
        });
        
        if (allChunks.length === 0) {
          return { message: "No matching information found. No documents have been uploaded." };
        }

        const queryEmb = await generateEmbedding(args.query);
        let topChunks = [];

        if (queryEmb) {
          // Semantic Search
          const scored = allChunks.map(c => {
            const vec = c.embedding ? JSON.parse(c.embedding) : null;
            const score = vec ? cosineSimilarity(queryEmb, vec) : -1;
            return { chunk: c, score };
          });
          scored.sort((a, b) => b.score - a.score);
          topChunks = scored.slice(0, 3).map(s => s.chunk);
        } else {
          // Fallback keyword search
          const filtered = allChunks.filter(c => c.content.toLowerCase().includes(args.query.toLowerCase()));
          topChunks = filtered.slice(0, 3);
          if (topChunks.length === 0) {
             // If absolute failure, just return top 3 chunks (or handle gracefully)
             topChunks = allChunks.slice(0, 3); 
          }
        }
        
        return {
          results: topChunks.map(c => ({
            sourceFile: c.document.fileName,
            excerpt: c.content
          }))
        };

      default:
        return { error: `Tool ${name} not found` };
    }
  } catch (err: any) {
    return { error: err.message };
  }
}
