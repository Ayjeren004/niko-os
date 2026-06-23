import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { role, content, conversationId } = body;

    if (!role || !content || !conversationId) {
      return NextResponse.json({ error: 'Missing required fields: role, content, conversationId' }, { status: 400 });
    }

    // Save the message
    const message = await prisma.message.create({
      data: {
        role,
        content,
        conversationId,
      },
    });

    // Update the conversation's updatedAt timestamp so it bumps to the top of lists
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Error saving message:', error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}
