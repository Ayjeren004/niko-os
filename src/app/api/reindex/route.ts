import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import ollama from 'ollama';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    const { targetEmbeddingModel } = await request.json();

    if (!targetEmbeddingModel) {
      return NextResponse.json({ error: 'Missing targetEmbeddingModel' }, { status: 400 });
    }

    let reindexedMemories = 0;
    let reindexedChunks = 0;

    // Fetch all memories for the user
    const memories = await prisma.memory.findMany({ where: { userId } });
    for (const mem of memories) {
      if (mem.embeddingModel !== targetEmbeddingModel) {
        try {
          const embResponse = await ollama.embeddings({
            model: targetEmbeddingModel,
            prompt: mem.content,
          });
          
          await prisma.memory.update({
            where: { id: mem.id },
            data: { 
              embedding: JSON.stringify(embResponse.embedding),
              embeddingModel: targetEmbeddingModel
            }
          });
          reindexedMemories++;
        } catch(e) {
          console.error(`Failed to reindex memory ${mem.id}:`, e);
        }
      }
    }

    // Fetch all document chunks for the user
    const documents = await prisma.document.findMany({ 
      where: { userId },
      include: { chunks: true }
    });

    for (const doc of documents) {
      for (const chunk of doc.chunks) {
        if (chunk.embeddingModel !== targetEmbeddingModel) {
          try {
            const embResponse = await ollama.embeddings({
              model: targetEmbeddingModel,
              prompt: chunk.content,
            });
            
            await prisma.documentChunk.update({
              where: { id: chunk.id },
              data: { 
                embedding: JSON.stringify(embResponse.embedding),
                embeddingModel: targetEmbeddingModel
              }
            });
            reindexedChunks++;
          } catch(e) {
            console.error(`Failed to reindex chunk ${chunk.id}:`, e);
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      reindexedMemories, 
      reindexedChunks 
    });

  } catch (error: any) {
    console.error('Failed to reindex:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
