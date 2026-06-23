import React, { useState, useEffect } from 'react';
import { Conversation } from '@/types';
import { signOut, useSession } from 'next-auth/react';

interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onOpenMemories: () => void;
  onOpenDocuments: () => void;
  onOpenBriefing: () => void;
  onOpenSettings: () => void;
  onOpenAudit: () => void;
  onOpenTimeline: () => void;
  onOpenPrivacy: () => void;
  onOpenEval: () => void;
}

export default function Sidebar({ conversations, selectedId, onSelect, onNewChat, onOpenMemories, onOpenDocuments, onOpenBriefing, onOpenSettings, onOpenAudit, onOpenTimeline, onOpenPrivacy, onOpenEval }: Props) {
  const { data: session } = useSession();
  const isDemo = session?.user?.id === 'demo-user-id';
  const [isResetting, setIsResetting] = useState(false);
  
  const [upcomingReminders, setUpcomingReminders] = useState<any[]>([]);

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const res = await fetch('/api/reminders/upcoming');
        if (res.ok) {
          const data = await res.json();
          setUpcomingReminders(data.reminders || []);
        }
      } catch (e) {}
    };
    
    fetchReminders();
    // Poll every 10 seconds to update the UI list
    const interval = setInterval(fetchReminders, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/demo/seed', { method: 'POST' });
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
    setIsResetting(false);
  };

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen p-4 text-white">
      {/* Brand & New Chat Button */}
      <div className="mb-6">
        <h1 className="text-xl font-bold mb-4 px-2 flex items-center justify-between">
          Niko OS
          {isDemo && (
            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
              DEMO
            </span>
          )}
        </h1>
        <button 
          onClick={onNewChat}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Upcoming Reminders Widget */}
      {upcomingReminders.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
            </svg>
            Upcoming Reminders
          </h2>
          <div className="space-y-1.5 px-2">
            {upcomingReminders.map(reminder => (
              <div key={reminder.id} className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-2 flex flex-col gap-1">
                <span className="text-sm font-medium text-yellow-500 truncate">{reminder.title}</span>
                <span className="text-[10px] text-gray-400">
                  {new Date(reminder.reminderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Conversations</h2>
        <div className="space-y-1.5">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full text-left truncate px-3 py-2.5 rounded-lg text-sm transition-all ${
                selectedId === conv.id 
                  ? 'bg-gray-800 text-white border border-gray-700 shadow-sm' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white border border-transparent'
              }`}
            >
              {conv.title || 'New Conversation'}
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-sm text-gray-600 italic px-2 mt-2">No chats yet.</p>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        <button 
          onClick={onOpenBriefing}
          className="flex items-center justify-between w-full p-3 rounded-xl bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 hover:from-yellow-500/20 hover:to-yellow-600/20 border border-yellow-500/20 text-yellow-500 transition-colors group shadow-lg shadow-yellow-500/5"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center group-hover:bg-yellow-500 group-hover:text-gray-900 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M4.5 2.25a.75.75 0 000 1.5v16.5h15V3.75a.75.75 0 000-1.5h-15zM9 6a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5H9zm-.75 3.75A.75.75 0 019 9h1.5a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75zM9 12a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5H9zm3.75-6A.75.75 0 0113.5 5.25h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 0112.75 6zm0 3.75A.75.75 0 0113.5 9h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 0112.75 9.75zm0 3.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium text-sm">Daily Briefing</span>
          </div>
        </button>

        <button 
          onClick={onOpenDocuments}
          className="flex items-center justify-between w-full p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors group border border-gray-700/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium text-sm">Documents</span>
          </div>
        </button>
        
        <button 
          onClick={onOpenMemories}
          className="flex items-center justify-between w-full p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors group border border-gray-700/50"
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-purple-500">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
            <span>Memories</span>
          </div>
        </button>

        <button 
          onClick={onOpenAudit}
          className="flex items-center justify-between w-full p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors group border border-gray-700/50"
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-500">
              <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
            </svg>
            <span>Audit & Debug</span>
          </div>
        </button>

        <button 
          onClick={onOpenTimeline}
          className="flex items-center justify-between w-full p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors group border border-gray-700/50"
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-500">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
            </svg>
            <span>Timeline & Graph</span>
          </div>
        </button>

        <button 
          onClick={onOpenSettings}
          className="flex items-center justify-between w-full p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors group border border-gray-700/50"
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors">
              <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l1.093.892c.12.098.197.24.21.391.01.121.011.244.011.368 0 .124-.001.247-.011.368-.013.15-.09.293-.21.391l-1.093.892a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-1.093-.892c-.12-.098-.197-.24-.21-.391a7.465 7.465 0 000-.736c.013-.15.09-.293.21-.391l1.093-.892a1.875 1.875 0 00.432-2.385l-.923-1.597a1.875 1.875 0 00-2.28-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
            </svg>
            <span>Settings</span>
          </div>
        </button>

        <button 
          onClick={onOpenPrivacy}
          className="flex items-center justify-between w-full p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors group border border-gray-700/50"
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 transition-colors">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
            </svg>
            <span>Privacy Center</span>
          </div>
        </button>

        <button 
          onClick={onOpenEval}
          className="flex items-center justify-between w-full p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors group border border-gray-700/50"
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors">
              <path fillRule="evenodd" d="M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm4.5 7.5a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75zm3.75-1.5a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0V12zm3.75-3a.75.75 0 00-1.5 0v7.5a.75.75 0 001.5 0V9z" clipRule="evenodd" />
            </svg>
            <span>Eval Dashboard</span>
          </div>
        </button>

        <button 
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center justify-between w-full p-3 rounded-xl bg-gray-800/50 hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition-colors group border border-transparent hover:border-red-900/50"
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-500 group-hover:text-red-400 transition-colors">
              <path fillRule="evenodd" d="M16.5 3.75a1.5 1.5 0 011.5 1.5v13.5a1.5 1.5 0 01-1.5 1.5h-6a1.5 1.5 0 01-1.5-1.5V15a.75.75 0 00-1.5 0v3.75a3 3 0 003 3h6a3 3 0 003-3V5.25a3 3 0 00-3-3h-6a3 3 0 00-3 3V9A.75.75 0 109 9V5.25a1.5 1.5 0 011.5-1.5h6zm-5.03 4.72a.75.75 0 000 1.06l1.72 1.72H2.25a.75.75 0 000 1.5h10.94l-1.72 1.72a.75.75 0 101.06 1.06l3-3a.75.75 0 000-1.06l-3-3a.75.75 0 00-1.06 0z" clipRule="evenodd" />
            </svg>
            <span>Log Out</span>
          </div>
        </button>

        {isDemo && (
          <button 
            onClick={handleResetDemo}
            disabled={isResetting}
            className="flex w-full items-center justify-center gap-2 mt-2 p-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-xs font-semibold uppercase disabled:opacity-50"
          >
            {isResetting ? 'Resetting...' : 'Reset Demo Data'}
          </button>
        )}
      </div>

    </div>
  );
}
