import prisma from '@/lib/prisma';
import { generateEmbedding, cosineSimilarity } from '@/lib/embeddings';
import { generateNewBriefing } from '@/lib/briefing';

async function logWorkflow(userId: string, action: string, input: any, output: any) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      skill: 'Workflow Engine',
      args: JSON.stringify(input),
      result: JSON.stringify(output),
      status: 'auto-run'
    }
  });
}

export async function handleAutoSummarizeDoc(userId: string, eventData: { documentId: string, fileName: string }) {
  try {
    const chunks = await prisma.documentChunk.findMany({
      where: { documentId: eventData.documentId },
      take: 5 // Summarize first 5 chunks
    });
    
    if (!chunks.length) return;
    
    const text = chunks.map(c => c.content).join('\n');
    const prompt = `Summarize the following document content briefly:\n\n${text}`;
    
    // Quick summarize using Ollama
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2', // default model
        prompt: prompt,
        stream: false
      })
    });
    const data = await res.json();
    const summary = data.response;

    // Create a memory with the summary
    const memEmbedding = await generateEmbedding(`Summary of ${eventData.fileName}: ${summary}`);
    await prisma.memory.create({
      data: {
        userId,
        content: `Auto-Summary of ${eventData.fileName}: ${summary}`,
        category: 'documents',
        embedding: memEmbedding ? JSON.stringify(memEmbedding) : null,
        embeddingModel: memEmbedding ? 'nomic-embed-text' : null
      }
    });

    await logWorkflow(userId, 'auto_summarize_doc', eventData, { success: true, summaryLength: summary.length });
  } catch (error: any) {
    console.error('Workflow error auto_summarize_doc:', error);
    await logWorkflow(userId, 'auto_summarize_doc', eventData, { error: error.message });
  }
}

export async function handleAutoSuggestDeadline(userId: string, eventData: { taskId: string, title: string }) {
  try {
    const prompt = `Given the task "${eventData.title}", suggest a reasonable deadline in days from today. Respond ONLY with a number of days.`;
    
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: prompt,
        stream: false
      })
    });
    const data = await res.json();
    const days = parseInt(data.response.trim());
    
    if (!isNaN(days) && days > 0) {
      const date = new Date();
      date.setDate(date.getDate() + days);
      const dueDate = date.toISOString().split('T')[0];
      
      await prisma.task.update({
        where: { id: eventData.taskId },
        data: { dueDate }
      });
      await logWorkflow(userId, 'auto_suggest_deadline', eventData, { suggestedDays: days, dueDate });
    } else {
      await logWorkflow(userId, 'auto_suggest_deadline', eventData, { noDeadlineInferred: true });
    }
  } catch (error: any) {
    console.error('Workflow error auto_suggest_deadline:', error);
    await logWorkflow(userId, 'auto_suggest_deadline', eventData, { error: error.message });
  }
}

export async function handleAutoLinkMemory(userId: string, eventData: { memoryId: string, content: string, embeddingStr: string | null }) {
  try {
    if (!eventData.embeddingStr) {
       return await logWorkflow(userId, 'auto_link_memory', eventData, { skipped: 'No embedding' });
    }
    const targetEmbedding = JSON.parse(eventData.embeddingStr);
    
    // Load other memories to find connections
    const memories = await prisma.memory.findMany({ where: { userId } });
    let bestMatch: any = null;
    let highestScore = 0;
    
    for (const m of memories) {
      if (m.id === eventData.memoryId || !m.embedding) continue;
      const vec = JSON.parse(m.embedding);
      const score = cosineSimilarity(targetEmbedding, vec);
      if (score > 0.8 && score > highestScore) {
        highestScore = score;
        bestMatch = m;
      }
    }
    
    if (bestMatch) {
      // Just log it or potentially update the memory content to add a semantic tag
      await logWorkflow(userId, 'auto_link_memory', eventData, { linkedTo: bestMatch.id, score: highestScore });
    } else {
      await logWorkflow(userId, 'auto_link_memory', eventData, { noStrongLinksFound: true });
    }
  } catch (error: any) {
    console.error('Workflow error auto_link_memory:', error);
    await logWorkflow(userId, 'auto_link_memory', eventData, { error: error.message });
  }
}

export async function handleDailyMorningBriefing(userId: string) {
  try {
    const todayString = new Date().toISOString().split('T')[0];
    
    // Check if already exists
    const existing = await prisma.briefing.findFirst({
      where: { userId, date: todayString }
    });
    
    if (existing) {
       return { skipped: 'Already generated' };
    }
    
    // We pass empty models so it uses defaults
    await generateNewBriefing(todayString, userId, {});
    
    await logWorkflow(userId, 'daily_morning_briefing', { date: todayString }, { success: true });
    return { success: true };
  } catch (error: any) {
    console.error('Workflow error daily_morning_briefing:', error);
    await logWorkflow(userId, 'daily_morning_briefing', {}, { error: error.message });
    return { error: error.message };
  }
}

export async function handleSyncSearchIndex(userId: string, eventData: { sourceType: string, sourceId: string, content: string }) {
  try {
    const { sourceType, sourceId, content } = eventData;
    const embModel = 'nomic-embed-text';
    const emb = await generateEmbedding(content, embModel);
    
    await prisma.searchIndex.upsert({
      where: {
        sourceType_sourceId: {
          sourceType,
          sourceId
        }
      },
      update: {
        content,
        embedding: emb ? JSON.stringify(emb) : null,
        embeddingModel: emb ? embModel : null
      },
      create: {
        userId,
        sourceType,
        sourceId,
        content,
        embedding: emb ? JSON.stringify(emb) : null,
        embeddingModel: emb ? embModel : null
      }
    });
    
  } catch (error: any) {
    console.error('Workflow error sync_search_index:', error);
  }
}
