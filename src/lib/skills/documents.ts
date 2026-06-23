import { Skill } from './types';
import prisma from '@/lib/prisma';
import { generateEmbedding, cosineSimilarity } from '../embeddings';
import { emitEvent } from '../workflows/engine';

export const DocumentSkill: Skill = {
  id: 'document_skill',
  name: 'Document Search',
  description: 'Search through the user\'s uploaded documents and files.',
  actions: [
    {
      name: 'searchDocuments',
      description: 'Search the user\'s uploaded files/documents using keywords.',
      safetyLevel: 'read',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The exact keyword or short phrase to search for.' }
        },
        required: ['query']
      },
      handler: async (args, context) => {
        if (!args.query) throw new Error("query is required");
        
        const allChunks = await prisma.documentChunk.findMany({
          where: { document: { userId: context.userId } },
          include: { document: true }
        });
        
        if (allChunks.length === 0) {
          return { message: "No documents have been uploaded." };
        }

        const embModel = context.models?.embedding || 'nomic-embed-text';
        const queryEmb = await generateEmbedding(args.query, embModel);
        let topChunks = [];
        let warning = undefined;

        if (queryEmb) {
          const scored = allChunks.map(c => {
            let score = -1;
            if (c.embedding && c.embeddingModel === embModel) {
              const vec = JSON.parse(c.embedding);
              score = cosineSimilarity(queryEmb, vec);
            }
            return { chunk: c, score };
          });
          
          const validScored = scored.filter(s => s.score >= 0);
          validScored.sort((a, b) => b.score - a.score);
          
          if (validScored.length === 0) {
             warning = "Used keyword search due to embedding model mismatch or missing embeddings.";
             const filtered = allChunks.filter(c => c.content.toLowerCase().includes(args.query.toLowerCase()));
             topChunks = filtered.slice(0, 3);
          } else {
             topChunks = validScored.slice(0, 3).map(s => s.chunk);
          }
        } else {
          const filtered = allChunks.filter(c => c.content.toLowerCase().includes(args.query.toLowerCase()));
          topChunks = filtered.slice(0, 3);
          if (topChunks.length === 0) {
             topChunks = allChunks.slice(0, 3); 
          }
        }
        
        return {
          warning,
          results: topChunks.map(c => ({
            sourceFile: c.document.fileName,
            excerpt: c.content
          }))
        };
      }
    }
  ]
};
