import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    const memories = await prisma.memory.findMany({ where: { userId } });
    const tasks = await prisma.task.findMany({ where: { userId } });
    const documents = await prisma.document.findMany({ where: { userId } });

    const timeline = [
      ...memories.map(m => ({
        id: `memory_${m.id}`,
        dbId: m.id,
        type: 'memory',
        content: m.content,
        category: m.category || 'general',
        createdAt: m.createdAt
      })),
      ...tasks.map(t => ({
        id: `task_${t.id}`,
        dbId: t.id,
        type: 'task',
        content: t.title,
        category: 'tasks',
        createdAt: t.createdAt
      })),
      ...documents.map(d => ({
        id: `document_${d.id}`,
        dbId: d.id,
        type: 'document',
        content: d.fileName,
        category: 'documents',
        createdAt: d.createdAt
      }))
    ];

    timeline.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ timeline });
  } catch (error) {
    console.error('Failed to fetch timeline:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
