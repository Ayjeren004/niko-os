import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generateEmbedding, cosineSimilarity } from '@/lib/embeddings';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const body = await request.json();
    const query = body.query;
    if (!query) return NextResponse.json({ error: 'Query is required' }, { status: 400 });

    const userId = session.user.id;
    const embModel = body.embeddingModel || 'nomic-embed-text';

    // Generate query embedding
    const queryEmb = await generateEmbedding(query, embModel);
    
    // Fetch all indices
    const indices = await prisma.searchIndex.findMany({
      where: { userId }
    });

    if (!queryEmb) {
      // Fallback to keyword search if embedding fails
      const filtered = indices.filter(i => i.content.toLowerCase().includes(query.toLowerCase()));
      return NextResponse.json({ results: filtered.slice(0, 10).map(r => ({ ...r, score: 1 })) });
    }

    // Calculate semantic similarity
    const scored = indices.map(idx => {
      if (!idx.embedding || idx.embeddingModel !== embModel) {
        // Keyword fallback for missing/mismatched models
        const kwScore = idx.content.toLowerCase().includes(query.toLowerCase()) ? 0.5 : 0;
        return { ...idx, score: kwScore };
      }
      const vec = JSON.parse(idx.embedding);
      const score = cosineSimilarity(queryEmb, vec);
      return { ...idx, score };
    });

    // Sort and return top 15 results
    scored.sort((a, b) => b.score - a.score);
    const topResults = scored.filter(r => r.score > 0.4).slice(0, 15);

    return NextResponse.json({ results: topResults });

  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
