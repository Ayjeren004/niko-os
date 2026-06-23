import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateEmbedding, cosineSimilarity } from '@/lib/embeddings';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const fullId = searchParams.get('id'); // format: type_dbId e.g. memory_abc
    
    if (!fullId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const [type, ...idParts] = fullId.split('_');
    const dbId = idParts.join('_');

    let targetEmbedding: number[] | null = null;
    let targetText = '';

    if (type === 'memory') {
      const m = await prisma.memory.findUnique({ where: { id: dbId } });
      if (m && m.embedding) targetEmbedding = JSON.parse(m.embedding);
      if (m && !targetEmbedding) targetText = m.content;
    } else if (type === 'task') {
      const t = await prisma.task.findUnique({ where: { id: dbId } });
      if (t) targetText = t.title;
    } else if (type === 'document') {
      const d = await prisma.documentChunk.findFirst({ where: { documentId: dbId } });
      if (d && d.embedding) targetEmbedding = JSON.parse(d.embedding);
    }

    if (!targetEmbedding && targetText) {
      targetEmbedding = await generateEmbedding(targetText);
    }

    if (!targetEmbedding) {
      return NextResponse.json({ nodes: [], links: [] });
    }

    // Now load all possible nodes to compare
    const memories = await prisma.memory.findMany({ where: { userId } });
    const tasks = await prisma.task.findMany({ where: { userId } });
    const documents = await prisma.document.findMany({ 
      where: { userId },
      include: { chunks: { take: 1 } } // just take the first chunk for embedding
    });

    const candidates = [
      ...memories.filter(m => m.id !== dbId || type !== 'memory').map(m => ({
        id: `memory_${m.id}`,
        type: 'memory',
        content: m.content,
        category: m.category || 'general',
        embeddingStr: m.embedding
      })),
      ...documents.filter(d => d.id !== dbId || type !== 'document').map(d => ({
        id: `document_${d.id}`,
        type: 'document',
        content: d.fileName,
        category: 'documents',
        embeddingStr: d.chunks[0]?.embedding
      }))
    ];

    const scored = candidates.map(c => {
      let score = -1;
      if (c.embeddingStr) {
        try {
          const vec = JSON.parse(c.embeddingStr);
          score = cosineSimilarity(targetEmbedding!, vec);
        } catch(e) {}
      }
      return { ...c, score };
    }).filter(c => c.score > 0.65); // Minimum similarity threshold

    scored.sort((a, b) => b.score - a.score);
    const topRelated = scored.slice(0, 10);

    const nodes = [
      { id: fullId, label: 'Target Node', group: type },
      ...topRelated.map(r => ({
        id: r.id,
        label: r.content.length > 30 ? r.content.substring(0, 30) + '...' : r.content,
        group: r.type,
        category: r.category
      }))
    ];

    const links = topRelated.map(r => ({
      source: fullId,
      target: r.id,
      value: r.score
    }));

    return NextResponse.json({ nodes, links });

  } catch (error) {
    console.error('Failed to build graph:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
