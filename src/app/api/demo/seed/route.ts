import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generateEmbedding } from '@/lib/embeddings';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.id !== 'demo-user-id') {
      return NextResponse.json({ error: 'Unauthorized. Only the demo user can seed data.' }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. Wipe existing demo data
    await prisma.memory.deleteMany({ where: { userId } });
    await prisma.task.deleteMany({ where: { userId } });
    await prisma.document.deleteMany({ where: { userId } });
    await prisma.briefing.deleteMany({ where: { userId } });
    await prisma.conversation.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { userId } });

    // 2. Seed Memories
    const memories = [
      "I prefer working in 25-minute Pomodoro sprints.",
      "I am actively applying for Senior AI Engineer roles.",
      "I am experienced with React, Next.js, Node.js, and Python.",
      "My primary goal for Q3 is to launch my autonomous agent portfolio.",
      "I strongly dislike using tailwind classes inline, I prefer extracting them to components."
    ];

    for (const mem of memories) {
      const emb = await generateEmbedding(mem);
      await prisma.memory.create({
        data: {
          content: mem,
          userId,
          embedding: emb ? JSON.stringify(emb) : null
        }
      });
    }

    // 3. Seed Tasks
    await prisma.task.createMany({
      data: [
        { title: 'Update Resume for AI Engineer roles', description: 'Highlight my work on Niko OS and MAS architectures.', userId },
        { title: 'Finish Q3 Product Roadmap', dueDate: new Date().toISOString().split('T')[0], userId },
        { title: 'Prepare for technical interview', description: 'Review system design concepts.', userId }
      ]
    });

    // 4. Seed Document (Simulating a research paper)
    const doc = await prisma.document.create({
      data: {
        fileName: 'Quantum_Computing_Overview.pdf',
        fileSize: 1048576,
        userId
      }
    });

    const chunks = [
      "Quantum computing leverages the principles of quantum mechanics, such as superposition and entanglement, to perform complex calculations at speeds unachievable by classical computers.",
      "While classical bits are strictly 0 or 1, qubits can exist in a superposition of both states simultaneously.",
      "The primary challenges in quantum computing include maintaining qubit coherence (preventing decoherence) and scaling the number of physical qubits while implementing robust error correction."
    ];

    for (const chunk of chunks) {
      const emb = await generateEmbedding(chunk);
      await prisma.documentChunk.create({
        data: {
          documentId: doc.id,
          content: chunk,
          embedding: emb ? JSON.stringify(emb) : null
        }
      });
    }

    // 5. Seed a Briefing for today
    await prisma.briefing.create({
      data: {
        userId,
        date: new Date().toISOString().split('T')[0],
        content: `## 🎯 Focus Today
Your primary focus is finalizing your portfolio and preparing for Senior AI Engineer interviews.

## ⏰ Important Reminders
You have a Q3 Roadmap due today. You prefer working in 25-minute Pomodoro sprints, so use that technique!

## 📝 Unfinished Tasks
- Update Resume for AI Engineer roles
- Finish Q3 Product Roadmap
- Prepare for technical interview

## 🧠 Context & Memories
You are highly experienced with Next.js and Python. 

## 🚀 Suggested Next Action
Start a 25-minute Pomodoro sprint to update your resume.`
      }
    });

    // 6. Seed a Conversation
    const conv = await prisma.conversation.create({
      data: { title: 'Career Planning', userId }
    });

    await prisma.message.createMany({
      data: [
        { conversationId: conv.id, role: 'user', content: 'What roles am I applying for, and what should I do next?' },
        { conversationId: conv.id, role: 'assistant', content: 'Based on your memory, you are applying for Senior AI Engineer roles. You have a pending task to "Update Resume for AI Engineer roles". I suggest starting with that!', toolCalls: JSON.stringify([{name: 'invoke_research_agent', arguments: {}, result: 'Success'}]) }
      ]
    });

    // 7. Seed Audit Logs
    await prisma.auditLog.createMany({
      data: [
        {
          userId,
          action: 'createNote',
          skill: 'Notes \u0026 Memory',
          args: JSON.stringify({ content: 'I prefer working in 25-minute Pomodoro sprints.', category: 'general' }),
          result: JSON.stringify({ success: true, id: 'mock-id' }),
          status: 'auto-run',
          createdAt: new Date(Date.now() - 1000 * 60 * 60)
        },
        {
          userId,
          skill: 'system',
          action: 'login',
          args: JSON.stringify({ device: 'MacBook Pro' }),
          status: 'confirmed',
        },
        {
          userId,
          skill: 'notes_skill',
          action: 'createNote',
          args: JSON.stringify({ title: 'Project X ideas' }),
          status: 'auto-run',
        },
        {
          userId,
          skill: 'workflows',
          action: 'auto_summarize_doc',
          args: JSON.stringify({ documentId: 'dummy-id' }),
          status: 'failed',
        }
      ]
    });

    return NextResponse.json({ success: true, message: 'Demo data seeded successfully.' });

  } catch (error: any) {
    console.error('Seeding error:', error);
    return NextResponse.json({ error: 'Failed to seed demo data' }, { status: 500 });
  }
}
