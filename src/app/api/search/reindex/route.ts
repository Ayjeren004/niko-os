import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generateEmbedding } from '@/lib/embeddings';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    // 1. Wipe existing index
    await prisma.searchIndex.deleteMany({ where: { userId } });

    // 2. Fetch everything
    const memories = await prisma.memory.findMany({ where: { userId } });
    const tasks = await prisma.task.findMany({ where: { userId } });
    const briefings = await prisma.briefing.findMany({ where: { userId } });
    const auditLogs = await prisma.auditLog.findMany({ where: { userId } });
    const messages = await prisma.message.findMany({ where: { conversation: { userId } } });
    const documentChunks = await prisma.documentChunk.findMany({ where: { document: { userId } } });

    const embModel = 'nomic-embed-text';
    let indexedCount = 0;

    const indexItems = [];

    for (const mem of memories) {
      indexItems.push({ sourceType: 'memory', sourceId: mem.id, content: mem.content, embString: mem.embedding });
    }
    for (const t of tasks) {
      indexItems.push({ sourceType: 'task', sourceId: t.id, content: `Task: ${t.title} ${t.description || ''}`, embString: null });
    }
    for (const b of briefings) {
      indexItems.push({ sourceType: 'briefing', sourceId: b.id, content: `Briefing for ${b.date}:\n${b.content}`, embString: null });
    }
    for (const m of messages) {
      indexItems.push({ sourceType: 'conversation', sourceId: m.id, content: `${m.role}: ${m.content}`, embString: null });
    }
    for (const c of documentChunks) {
      indexItems.push({ sourceType: 'document', sourceId: c.id, content: c.content, embString: c.embedding });
    }

    // Insert to DB sequentially to avoid overloading Ollama/SQLite
    for (const item of indexItems) {
      let embArray = null;
      if (item.embString) {
        embArray = JSON.parse(item.embString);
      } else {
        embArray = await generateEmbedding(item.content, embModel);
      }
      
      await prisma.searchIndex.create({
        data: {
          userId,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          content: item.content,
          embedding: embArray ? JSON.stringify(embArray) : null,
          embeddingModel: embArray ? embModel : null
        }
      });
      indexedCount++;
    }

    return NextResponse.json({ success: true, message: `Re-indexed ${indexedCount} items.` });

  } catch (error: any) {
    console.error('Reindex error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
