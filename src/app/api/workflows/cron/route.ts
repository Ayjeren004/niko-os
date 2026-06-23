import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { handleDailyMorningBriefing } from '@/lib/workflows/definitions';

export async function GET() {
  try {
    const now = new Date();
    // Daily Morning Briefing should trigger around 8:00 AM local time
    const currentHour = now.getHours();
    
    // Check all users
    const users = await prisma.user.findMany();
    const results = [];
    
    for (const user of users) {
      let settings: any = {};
      try {
        settings = JSON.parse(user.workflowSettings || "{}");
      } catch(e) {}
      
      // Execute daily morning briefing between 8 AM and 10 AM if enabled
      if (settings.daily_morning_briefing !== false && currentHour >= 8 && currentHour <= 10) {
        const res = await handleDailyMorningBriefing(user.id);
        results.push({ userId: user.id, workflow: 'daily_morning_briefing', res });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error in cron polling:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
