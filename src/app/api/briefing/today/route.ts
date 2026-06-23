import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateEmbedding, cosineSimilarity } from '@/lib/embeddings';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

import { generateNewBriefing } from '@/lib/briefing';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const modelsStr = searchParams.get('models');
    let models = {};
    if (modelsStr) {
      try { models = JSON.parse(modelsStr); } catch(e) {}
    }

    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    let briefing = await prisma.briefing.findFirst({
      where: { userId: session.user.id, date: todayString }
    });

    if (!briefing) {
      briefing = await generateNewBriefing(todayString, session.user.id, models);
    }

    return NextResponse.json({ briefing });
  } catch (error) {
    console.error('Error fetching briefing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { regenerate, models = {} } = await request.json();
    if (!regenerate) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    // Delete existing
    await prisma.briefing.deleteMany({
      where: { userId: session.user.id, date: todayString }
    });

    const newBriefing = await generateNewBriefing(todayString, session.user.id, models);
    return NextResponse.json({ briefing: newBriefing });
  } catch (error) {
    console.error('Error regenerating briefing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
