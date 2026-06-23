import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    
    // Find all pending reminders that are due
    const dueReminders = await prisma.task.findMany({
      where: {
        reminderStatus: 'pending',
        reminderAt: {
          lte: now
        }
      }
    });

    if (dueReminders.length > 0) {
      // Mark them as sent
      await prisma.task.updateMany({
        where: {
          id: {
            in: dueReminders.map(t => t.id)
          }
        },
        data: {
          reminderStatus: 'sent'
        }
      });
    }

    return NextResponse.json({ reminders: dueReminders });
  } catch (error) {
    console.error('Error polling reminders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
