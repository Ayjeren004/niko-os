import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  let settings = {};
  if (user?.workflowSettings) {
    try {
      settings = JSON.parse(user.workflowSettings);
    } catch(e) {}
  }
  
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  
  await prisma.user.update({
    where: { id: session.user.id },
    data: { workflowSettings: JSON.stringify(body.settings) }
  });

  return NextResponse.json({ success: true });
}
