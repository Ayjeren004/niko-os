import prisma from '@/lib/prisma';
import { 
  handleAutoSummarizeDoc, 
  handleAutoSuggestDeadline, 
  handleAutoLinkMemory,
  handleSyncSearchIndex
} from './definitions';

// In-memory cooldown tracking { userId_workflowId: timestamp }
const cooldowns: Record<string, number> = {};

export function emitEvent(userId: string, eventType: string, eventData: any) {
  // Fire and forget (don't await)
  processEvent(userId, eventType, eventData).catch(e => console.error('Workflow engine error:', e));
}

async function processEvent(userId: string, eventType: string, eventData: any) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  let settings: any = {};
  try {
    settings = JSON.parse(user.workflowSettings || "{}");
  } catch(e) {}

  const now = Date.now();

  // 1. auto_summarize_doc
  if (eventType === 'DOCUMENT_UPLOADED' && settings.auto_summarize_doc !== false) {
    const key = `${userId}_auto_summarize_doc_${eventData.documentId}`;
    if (!cooldowns[key] || now - cooldowns[key] > 60000) {
      cooldowns[key] = now;
      await handleAutoSummarizeDoc(userId, eventData);
    }
  }

  // 2. auto_suggest_deadline
  if (eventType === 'TASK_CREATED' && settings.auto_suggest_deadline !== false) {
    const key = `${userId}_auto_suggest_deadline_${eventData.taskId}`;
    if (!cooldowns[key] || now - cooldowns[key] > 60000) {
      cooldowns[key] = now;
      await handleAutoSuggestDeadline(userId, eventData);
    }
  }

  // 3. auto_link_memory
  if (eventType === 'MEMORY_ADDED' && settings.auto_link_memory !== false) {
    const key = `${userId}_auto_link_memory_${eventData.memoryId}`;
    if (!cooldowns[key] || now - cooldowns[key] > 60000) {
      cooldowns[key] = now;
      await handleAutoLinkMemory(userId, eventData);
    }
  }

  // 4. sync_search_index
  if (eventType === 'INDEX_RECORD') {
    await handleSyncSearchIndex(userId, eventData);
  }
}
