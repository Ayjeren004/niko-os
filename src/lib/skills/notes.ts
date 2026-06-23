import { Skill } from './types';
import prisma from '@/lib/prisma';
import { generateEmbedding, cosineSimilarity } from '../embeddings';
import { emitEvent } from '../workflows/engine';

export const NotesSkill: Skill = {
  id: 'notes_skill',
  name: 'Notes & Memory',
  description: 'Manage personal notes and long-term facts.',
  actions: [
    {
      name: 'createNote',
      description: 'Save a new note or long-term memory fact.',
      safetyLevel: 'safe',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'The text content to save' },
          category: { type: 'string', enum: ['people', 'projects', 'goals', 'general'], description: 'Categorize the memory appropriately. Default to general.' }
        },
        required: ['content']
      },
      handler: async (args, context) => {
        if (!args.content) throw new Error("content is required");
        const embModel = context.models?.embedding || 'nomic-embed-text';
        const memEmbedding = await generateEmbedding(args.content, embModel);
        const memory = await prisma.memory.create({
          data: { 
            content: args.content, 
            category: args.category || 'general',
            userId: context.userId,
            embedding: memEmbedding ? JSON.stringify(memEmbedding) : null,
            embeddingModel: memEmbedding ? embModel : null
          }
        });

        emitEvent(context.userId, 'MEMORY_ADDED', {
          memoryId: memory.id,
          content: memory.content,
          embeddingStr: memory.embedding
        });

        return { success: true, memoryId: memory.id, message: "Note saved successfully." };
      }
    },
    {
      name: 'searchNotes',
      description: 'Search past notes and memories. Use this to recall facts about the user.',
      safetyLevel: 'read',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search keyword or question' }
        }
      },
      handler: async (args, context) => {
        const allMemories = await prisma.memory.findMany({ where: { userId: context.userId } });
        
        if (args.query && allMemories.length > 0) {
          const embModel = context.models?.embedding || 'nomic-embed-text';
          const queryEmbedding = await generateEmbedding(args.query, embModel);
          
          if (queryEmbedding) {
            const scoredMemories = allMemories.map(m => {
              // Fallback to -1 if embedding is missing OR if the model doesn't match
              let score = -1;
              if (m.embedding && m.embeddingModel === embModel) {
                const vec = JSON.parse(m.embedding);
                score = cosineSimilarity(queryEmbedding, vec);
              }
              return { memory: m, score };
            });
            
            // Only keep memories that actually had a valid score (>= 0)
            const validScoredMemories = scoredMemories.filter(m => m.score >= 0);
            validScoredMemories.sort((a, b) => b.score - a.score);
            
            // If no valid semantic matches (due to model mismatch or missing embeddings), fallback to keyword
            if (validScoredMemories.length === 0) {
              const filtered = allMemories.filter(m => m.content.toLowerCase().includes(args.query.toLowerCase()));
              return { 
                warning: "Used keyword search due to embedding model mismatch or missing embeddings.",
                notes: filtered.length > 0 ? filtered.map(m => m.content) : allMemories.map(m => m.content) 
              };
            }
            
            return { notes: validScoredMemories.slice(0, 5).map(s => s.memory.content) };
          } else {
            const filtered = allMemories.filter(m => m.content.toLowerCase().includes(args.query.toLowerCase()));
            return { notes: filtered.length > 0 ? filtered.map(m => m.content) : allMemories.map(m => m.content) };
          }
        }
        
        return { notes: allMemories.map(m => m.content) };
      }
    }
  ]
};
