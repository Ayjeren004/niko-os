import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { encryptData } from '@/lib/encryption';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { passphrase } = body;

    if (!passphrase || passphrase.length < 4) {
      return NextResponse.json({ error: 'A secure passphrase is required.' }, { status: 400 });
    }

    const userId = session.user.id;

    // Fetch all user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        conversations: {
          include: { messages: true }
        },
        memories: true,
        tasks: true,
        documents: {
          include: { chunks: true }
        },
        briefings: true
      }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // We don't want to export the hashed password
    const { password, ...safeUser } = user;

    const backupPayload = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      data: safeUser
    };

    // Encrypt the payload
    const encryptedString = encryptData(backupPayload, passphrase);

    return NextResponse.json({ backup: encryptedString });

  } catch (error: any) {
    console.error('Export backup error:', error);
    return NextResponse.json({ error: 'Failed to generate backup' }, { status: 500 });
  }
}
