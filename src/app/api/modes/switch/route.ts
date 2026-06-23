import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const body = await request.json();
    const { modeId } = body;

    if (!modeId) return NextResponse.json({ error: 'Missing modeId' }, { status: 400 });

    await createAuditLog({
      userId: session.user.id,
      skill: 'system',
      action: 'switch_mode',
      args: { mode: modeId },
      status: 'confirmed'
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Mode switch log error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
