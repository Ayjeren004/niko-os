import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const body = await request.json();
    if (body.confirmation !== 'DELETE EVERYTHING') {
      return NextResponse.json({ error: 'Invalid confirmation string' }, { status: 400 });
    }

    const userId = session.user.id;

    // Delete everything sequentially or in a transaction
    await prisma.$transaction([
      prisma.memory.deleteMany({ where: { userId } }),
      prisma.task.deleteMany({ where: { userId } }),
      prisma.documentChunk.deleteMany({ where: { document: { userId } } }),
      prisma.document.deleteMany({ where: { userId } }),
      prisma.message.deleteMany({ where: { conversation: { userId } } }),
      prisma.conversation.deleteMany({ where: { userId } }),
      prisma.briefing.deleteMany({ where: { userId } }),
      prisma.searchIndex.deleteMany({ where: { userId } })
    ]);

    // Keep AuditLogs to track that a wipe occurred, but we should wipe them too based on standard privacy center behavior.
    // The user requested "Delete all data" but also "Log privacy actions to Audit Logs".
    // So we wipe the existing audit logs, and then create a new one to record the wipe!
    await prisma.auditLog.deleteMany({ where: { userId } });

    await prisma.auditLog.create({
      data: {
        userId,
        skill: 'Privacy Center',
        action: 'wipeData',
        args: JSON.stringify({ type: 'full_wipe' }),
        result: 'Success',
        status: 'confirmed'
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error wiping data:', error);
    return NextResponse.json({ error: error.message || 'Failed to wipe data' }, { status: 500 });
  }
}
