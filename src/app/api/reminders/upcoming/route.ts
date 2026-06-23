import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    
    // Find all upcoming reminders (reminderAt > now) or pending ones
    const upcomingReminders = await prisma.task.findMany({
      where: {
        userId: session.user.id,
        reminderStatus: 'pending',
        reminderAt: {
          gt: now
        }
      },
      orderBy: {
        reminderAt: 'asc'
      },
      take: 5
    });

    return NextResponse.json({ reminders: upcomingReminders });
  } catch (error) {
    console.error('Error fetching upcoming reminders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
