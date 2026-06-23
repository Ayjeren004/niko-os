import prisma from '@/lib/prisma';
import { generateEmbedding, cosineSimilarity } from '@/lib/embeddings';

export async function generateNewBriefing(todayString: string, userId: string, models: any = {}) {
  const briefingModel = models.briefing || 'llama3.2';
  const embeddingModel = models.embedding || 'nomic-embed-text';
  // 1. Gather Tasks
  const tasks = await prisma.task.findMany({
    where: { userId: userId }
  });
  const taskText = tasks.map(t => `- ${t.title}${t.dueDate ? ` (Due: ${t.dueDate})` : ''}`).join('\n') || 'No pending tasks.';

  // 2. Gather Memories
  const memories = await prisma.memory.findMany({
    where: { userId: userId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  const memoryText = memories.map(m => `- ${m.content}`).join('\n') || 'No recent memories.';

  // 3. Gather Recent Conversations
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const recentMessages = await prisma.message.findMany({
    where: { 
      conversation: { userId: userId },
      createdAt: { gte: yesterday }
    },
    orderBy: { createdAt: 'asc' },
    take: 20
  });
  const conversationText = recentMessages.map(m => `${m.role === 'user' ? 'User' : 'Niko'}: ${m.content}`).join('\n') || 'No recent conversations.';

  // 4. Gather Documents (Semantic Search)
  let documentText = 'No relevant documents.';
  const queryEmb = await generateEmbedding("Priorities, deadlines, and important context for today", embeddingModel);
  if (queryEmb) {
    const allChunks = await prisma.documentChunk.findMany();
    const scoredChunks = allChunks.map(c => {
      let score = -1;
      if (c.embedding && c.embeddingModel === embeddingModel) {
        const vec = JSON.parse(c.embedding);
        score = cosineSimilarity(queryEmb, vec);
      }
      return { chunk: c, score };
    });
    
    const validScored = scoredChunks.filter(s => s.score >= 0);
    validScored.sort((a, b) => b.score - a.score);
    const topChunks = validScored.slice(0, 3).filter(s => s.score > 0.5);
    if (topChunks.length > 0) {
      documentText = topChunks.map(s => `- ${s.chunk.content}`).join('\n\n');
    } else if (validScored.length === 0) {
      documentText = allChunks.slice(0, 3).map(c => `- ${c.content}`).join('\n\n');
    }
  }

  // 5. Prompt Ollama
  const prompt = `You are Niko, a highly intelligent personal assistant generating a Daily Briefing.
Current Date: ${new Date().toLocaleDateString()}

CONTEXT:
--- TASKS ---
${taskText}

--- RECENT MEMORIES ---
${memoryText}

--- RECENT CONVERSATIONS (Last 24h) ---
${conversationText}

--- RELEVANT DOCUMENTS ---
${documentText}

REQUIREMENTS:
Write a beautifully formatted Markdown briefing for the user. Do NOT include pleasantries, get straight to the point.
You MUST include exactly these 5 sections with these exact headings (use Markdown ##):
## 🎯 Focus Today
## ⏰ Important Reminders
## 📝 Unfinished Tasks
## 🧠 Context & Memories
## 🚀 Suggested Next Action
`;

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: briefingModel,
        prompt: prompt,
        stream: false
      })
    });
    
    if (!response.ok) throw new Error("Ollama generation failed");
    
    const data = await response.json();
    const generatedText = data.response;

    // Save to DB
    const briefing = await prisma.briefing.create({
      data: {
        userId: userId,
        date: todayString,
        content: generatedText
      }
    });

    return briefing;
  } catch (error) {
    console.error("Failed to generate briefing", error);
    throw error;
  }
}
