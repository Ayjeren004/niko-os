import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Search query "q" is required' }, { status: 400 });
    }

    const memories = await prisma.memory.findMany({
      where: {
        userId: session.user.id,
        content: {
          contains: query,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(memories);
  } catch (error) {
    console.error('Error searching memories:', error);
    return NextResponse.json({ error: 'Failed to search memories' }, { status: 500 });
  }
}
