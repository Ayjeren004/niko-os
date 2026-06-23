import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const body = await request.json();
    const { messageId, rating, text } = body;

    if (!messageId || typeof rating !== 'number') {
      return NextResponse.json({ error: 'Missing messageId or rating' }, { status: 400 });
    }

    const feedback = await prisma.messageFeedback.upsert({
      where: { messageId },
      update: { rating, text },
      create: { messageId, rating, text }
    });

    return NextResponse.json({ success: true, feedback });

  } catch (error: any) {
    console.error('Feedback error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
