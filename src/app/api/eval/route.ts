import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    // Fetch feedbacks linked to user's conversations
    const feedbacks = await prisma.messageFeedback.findMany({
      where: {
        message: {
          conversation: {
            userId
          }
        }
      },
      include: {
        message: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const outdatedMemories = await prisma.memory.findMany({
      where: {
        userId,
        isOutdated: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ feedbacks, outdatedMemories });

  } catch (error: any) {
    console.error('Eval fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
