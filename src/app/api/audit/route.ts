import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');

    const whereClause: any = { userId: session.user.id };

    if (filter && filter !== 'all') {
      if (filter === 'errors') {
        whereClause.status = 'failed';
      } else {
        // Simple mapping of filter to skill prefixes
        whereClause.skill = {
          contains: filter
        };
      }
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to 100 recent for performance
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.auditLog.deleteMany({
      where: { userId: session.user.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing audit logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
