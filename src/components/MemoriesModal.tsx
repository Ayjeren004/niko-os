import React, { useState, useEffect } from 'react';
import { Memory } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function MemoriesModal({ isOpen, onClose }: Props) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memories');
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (error) {
      console.error("Failed to fetch memories", error);
    }
  };

  // Fetch memories when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMemories();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input })
      });
      if (res.ok) {
        const newMemory = await res.json();
        setMemories([newMemory, ...memories]);
        setInput('');
      }
    } catch (error) {
      console.error("Failed to add memory", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMemories(memories.filter(m => m.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete memory", error);
    }
  };

  const handleToggleOutdated = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOutdated: !currentStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setMemories(memories.map(m => m.id === id ? updated : m));
      }
    } catch(e) {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Memory Center</h2>
              <p className="text-xs text-gray-400">Facts Niko knows about you.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add Memory Form */}
        <div className="p-6 border-b border-gray-800 bg-gray-900">
          <form onSubmit={handleAdd} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="E.g., I have a dog named Max"
              disabled={isLoading}
              className="flex-1 bg-gray-950 text-white placeholder-gray-500 rounded-xl px-4 py-3 border border-gray-800 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all disabled:opacity-50 text-sm"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:hover:bg-purple-600 flex items-center gap-2"
            >
              Add Fact
            </button>
          </form>
        </div>

        {/* Memories List */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-950">
          {memories.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              <p>No memories saved yet.</p>
              <p className="text-sm mt-1">Add some facts about yourself above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {memories.map((memory) => (
                <div key={memory.id} className={`bg-gray-900 border ${memory.isOutdated ? 'border-red-900/50 opacity-60' : 'border-gray-800'} rounded-xl p-4 flex justify-between items-start group hover:border-gray-700 transition-colors`}>
                  <div className="pr-4">
                    <p className={`text-sm ${memory.isOutdated ? 'text-gray-400 line-through' : 'text-gray-200'}`}>{memory.content}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-xs text-gray-600">
                        {new Date(memory.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                        })}
                      </p>
                      {memory.isOutdated && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-medium uppercase">Outdated</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => handleToggleOutdated(memory.id, memory.isOutdated || false)}
                      className={`p-2 rounded-lg transition-colors text-xs font-medium ${memory.isOutdated ? 'text-green-500 hover:bg-green-500/10' : 'text-amber-500 hover:bg-amber-500/10'}`}
                      title="Mark as outdated"
                    >
                      {memory.isOutdated ? 'Restore' : 'Mark Outdated'}
                    </button>
                    <button
                      onClick={() => handleDelete(memory.id)}
                      className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Delete memory"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
