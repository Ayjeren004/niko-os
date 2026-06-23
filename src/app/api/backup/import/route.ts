import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { decryptData } from '@/lib/encryption';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { encryptedBackup, passphrase } = body;

    if (!encryptedBackup || !passphrase) {
      return NextResponse.json({ error: 'Backup data and passphrase are required.' }, { status: 400 });
    }

    const userId = session.user.id;

    // Decrypt the payload
    let decryptedPayload;
    try {
      decryptedPayload = decryptData(encryptedBackup, passphrase);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    if (!decryptedPayload.data || decryptedPayload.version !== "1.0") {
      return NextResponse.json({ error: 'Invalid backup file structure.' }, { status: 400 });
    }

    const { conversations, memories, tasks, documents, briefings } = decryptedPayload.data;

    // VERY IMPORTANT: We are appending/restoring this data to the CURRENT user.
    // If the backup came from a different user ID originally, we remap it to the current user ID.

    // 1. Restore Memories
    if (memories && memories.length > 0) {
      for (const m of memories) {
        await prisma.memory.upsert({
          where: { id: m.id },
          create: {
            id: m.id,
            userId: userId,
            content: m.content,
            embedding: m.embedding,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt
          },
          update: {}
        });
      }
    }

    // 2. Restore Tasks
    if (tasks && tasks.length > 0) {
      for (const t of tasks) {
        await prisma.task.upsert({
          where: { id: t.id },
          create: {
            id: t.id,
            userId: userId,
            title: t.title,
            description: t.description,
            dueDate: t.dueDate,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt
          },
          update: {}
        });
      }
    }

    // 3. Restore Briefings
    if (briefings && briefings.length > 0) {
      for (const b of briefings) {
        await prisma.briefing.upsert({
          where: { id: b.id },
          create: {
            id: b.id,
            userId: userId,
            content: b.content,
            date: b.date,
            createdAt: b.createdAt
          },
          update: {}
        });
      }
    }

    // 4. Restore Conversations and Messages
    if (conversations && conversations.length > 0) {
      for (const conv of conversations) {
        // Upsert conversation
        await prisma.conversation.upsert({
          where: { id: conv.id },
          create: {
            id: conv.id,
            userId: userId,
            title: conv.title,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt
          },
          update: {} // don't overwrite if exists, or choose to overwrite
        });

        // Insert messages
        if (conv.messages && conv.messages.length > 0) {
          for (const msg of conv.messages) {
            await prisma.message.upsert({
              where: { id: msg.id },
              create: {
                id: msg.id,
                conversationId: conv.id,
                role: msg.role,
                content: msg.content,
                toolCalls: msg.toolCalls,
                createdAt: msg.createdAt
              },
              update: {}
            });
          }
        }
      }
    }

    // 5. Restore Documents and Chunks
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        await prisma.document.upsert({
          where: { id: doc.id },
          create: {
            id: doc.id,
            userId: userId,
            fileName: doc.fileName,
            fileSize: doc.fileSize,
            createdAt: doc.createdAt
          },
          update: {}
        });

        if (doc.chunks && doc.chunks.length > 0) {
          for (const chunk of doc.chunks) {
            await prisma.documentChunk.upsert({
              where: { id: chunk.id },
              create: {
                id: chunk.id,
                documentId: doc.id,
                content: chunk.content,
                embedding: chunk.embedding
              },
              update: {}
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Backup successfully restored.' });

  } catch (error: any) {
    console.error('Import backup error:', error);
    return NextResponse.json({ error: 'Failed to restore backup' }, { status: 500 });
  }
}
