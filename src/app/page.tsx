'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import MemoriesModal from '@/components/MemoriesModal';
import DocumentsModal from '@/components/DocumentsModal';
import BriefingModal from '@/components/BriefingModal';
import SettingsModal from '@/components/SettingsModal';
import AuditModal from '@/components/AuditModal';
import TimelineModal from '@/components/TimelineModal';
import PrivacyModal from '@/components/PrivacyModal';
import EvalModal from '@/components/EvalModal';
import { Conversation } from '@/types';

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMemoriesOpen, setIsMemoriesOpen] = useState(false);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isEvalOpen, setIsEvalOpen] = useState(false);

  // Fetch all conversations for the sidebar
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Create a new conversation
  const handleCreateNew = async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' })
      });
      if (res.ok) {
        const newConv = await res.json();
        // Prepend the new conversation to the list so it shows up at top
        setConversations(prev => [newConv, ...prev]);
        setSelectedId(newConv.id);
      }
    } catch (err) {
      console.error("Failed to create conversation", err);
    }
  };

  return (
    <main className="flex h-screen overflow-hidden bg-gray-950 font-sans text-gray-100 selection:bg-blue-600/30">
      <Sidebar 
        conversations={conversations}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onNewChat={handleCreateNew}
        onOpenMemories={() => setIsMemoriesOpen(true)}
        onOpenDocuments={() => setIsDocumentsOpen(true)}
        onOpenBriefing={() => setIsBriefingOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAudit={() => setIsAuditModalOpen(true)}
        onOpenTimeline={() => setIsTimelineOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenEval={() => setIsEvalOpen(true)}
      />
      
      <ErrorBoundary>
        <ChatArea 
          conversationId={selectedId} 
          onUpdateHistory={fetchConversations} 
        />
      </ErrorBoundary>

      <MemoriesModal 
        isOpen={isMemoriesOpen} 
        onClose={() => setIsMemoriesOpen(false)} 
      />

      <DocumentsModal 
        isOpen={isDocumentsOpen} 
        onClose={() => setIsDocumentsOpen(false)} 
      />

      <BriefingModal
        isOpen={isBriefingOpen}
        onClose={() => setIsBriefingOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <AuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />

      <TimelineModal
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
      />

      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />

      <EvalModal
        isOpen={isEvalOpen}
        onClose={() => setIsEvalOpen(false)}
      />
    </main>
  );
}
