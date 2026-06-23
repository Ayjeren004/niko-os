import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Briefing } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function BriefingModal({ isOpen, onClose }: Props) {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const fetchBriefing = async () => {
    setIsLoading(true);
    try {
      const models = {
        chat: localStorage.getItem('chatModel') || 'llama3.2',
        embedding: localStorage.getItem('embeddingModel') || 'nomic-embed-text',
        memory: localStorage.getItem('memoryModel') || 'llama3.2',
        briefing: localStorage.getItem('briefingModel') || 'llama3.2'
      };
      const res = await fetch(`/api/briefing/today?models=${encodeURIComponent(JSON.stringify(models))}`);
      const data = await res.json();
      if (res.ok && data.briefing) {
        setBriefing(data.briefing);
      }
    } catch (error) {
      console.error('Failed to fetch briefing', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !briefing) {
      fetchBriefing();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);


  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const models = {
        chat: localStorage.getItem('chatModel') || 'llama3.2',
        embedding: localStorage.getItem('embeddingModel') || 'nomic-embed-text',
        memory: localStorage.getItem('memoryModel') || 'llama3.2',
        briefing: localStorage.getItem('briefingModel') || 'llama3.2'
      };
      
      const res = await fetch('/api/briefing/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: true, models })
      });
      const data = await res.json();
      if (res.ok && data.briefing) {
        setBriefing(data.briefing);
      }
    } catch (error) {
      console.error('Failed to regenerate briefing', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/20 text-yellow-500 p-2 rounded-xl border border-yellow-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M4.5 2.25a.75.75 0 000 1.5v16.5h15V3.75a.75.75 0 000-1.5h-15zM9 6a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5H9zm-.75 3.75A.75.75 0 019 9h1.5a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75zM9 12a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5H9zm3.75-6A.75.75 0 0113.5 5.25h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 0112.75 6zm0 3.75A.75.75 0 0113.5 9h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 0112.75 9.75zm0 3.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Daily Briefing</h2>
              <p className="text-sm text-gray-400 mt-0.5">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleRegenerate}
              disabled={isLoading || isRegenerating}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Regenerate
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-950/50">
          {(isLoading || isRegenerating) ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="w-10 h-10 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
              <p className="text-gray-400 font-medium animate-pulse">
                {isRegenerating ? "Synthesizing new context..." : "Gathering your daily context..."}
              </p>
            </div>
          ) : briefing ? (
            <div className="prose prose-invert prose-yellow max-w-none">
              <ReactMarkdown>{briefing.content}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-center text-red-400 py-10">
              Failed to load briefing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
