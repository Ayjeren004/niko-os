import React, { useState, useEffect } from 'react';
import { Memory } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function EvalModal({ isOpen, onClose }: Props) {
  const [data, setData] = useState<{ feedbacks: any[], outdatedMemories: Memory[] } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/eval')
        .then(res => res.json())
        .then(d => setData(d))
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const feedbacks = data?.feedbacks || [];
  const outdatedMemories = data?.outdatedMemories || [];

  const modelStats: Record<string, { up: number, down: number }> = {};
  feedbacks.forEach(f => {
    const m = f.message.modelUsed || 'unknown';
    if (!modelStats[m]) modelStats[m] = { up: 0, down: 0 };
    if (f.rating === 1) modelStats[m].up++;
    if (f.rating === -1) modelStats[m].down++;
  });

  const negativeFeedbacks = feedbacks.filter(f => f.rating === -1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#05050A] border border-gray-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px]"></div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-400">
                <path fillRule="evenodd" d="M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm4.5 7.5a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75zm3.75-1.5a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0V12zm3.75-3a.75.75 0 00-1.5 0v7.5a.75.75 0 001.5 0V9z" clipRule="evenodd" />
              </svg>
              Evaluation & Telemetry
            </h2>
            <p className="text-xs text-gray-400 mt-1">Local RLHF data collection and model performance patterns.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

          {!data ? (
            <div className="text-center text-gray-500 mt-10">Loading telemetry...</div>
          ) : (
            <>
              {/* Model Leaderboard */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Model Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(modelStats).length === 0 ? (
                    <div className="text-xs text-gray-500 italic col-span-3">No feedback data yet.</div>
                  ) : Object.entries(modelStats).map(([model, stats]) => {
                    const total = stats.up + stats.down;
                    const winRate = total > 0 ? Math.round((stats.up / total) * 100) : 0;
                    return (
                      <div key={model} className="p-4 rounded-xl bg-gray-900 border border-gray-800">
                        <div className="font-mono text-sm text-gray-200 mb-2">{model}</div>
                        <div className="flex items-end gap-2">
                          <div className="text-3xl font-bold text-white">{winRate}%</div>
                          <div className="text-xs text-gray-500 mb-1">Win Rate</div>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs">
                          <span className="text-green-400">👍 {stats.up}</span>
                          <span className="text-red-400">👎 {stats.down}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Negative Feedback Patterns */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Failure Patterns</h3>
                {negativeFeedbacks.length === 0 ? (
                  <div className="text-xs text-gray-500 italic bg-gray-900/50 p-4 rounded-xl border border-gray-800">No negative feedback logged.</div>
                ) : (
                  <div className="space-y-3">
                    {negativeFeedbacks.map((f, i) => (
                      <div key={i} className="p-4 rounded-xl bg-red-900/10 border border-red-900/30">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-xs text-gray-400 font-mono">Model: <span className="text-gray-200">{f.message.modelUsed || 'unknown'}</span></div>
                          <div className="text-xs text-gray-500">{new Date(f.createdAt).toLocaleDateString()}</div>
                        </div>
                        <p className="text-sm text-gray-300 bg-gray-950 p-3 rounded-lg border border-gray-800 mb-3 whitespace-pre-wrap">{f.message.content}</p>
                        <div className="text-sm text-red-400 font-medium">Feedback: {f.text || 'No explanation provided.'}</div>
                        {f.message.contextRefs && (
                          <div className="mt-2 text-xs text-gray-500 font-mono">
                            Context Refs: {f.message.contextRefs}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outdated Memories */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Outdated / Deprecated Context</h3>
                {outdatedMemories.length === 0 ? (
                  <div className="text-xs text-gray-500 italic bg-gray-900/50 p-4 rounded-xl border border-gray-800">No memories marked as outdated.</div>
                ) : (
                  <div className="space-y-2">
                    {outdatedMemories.map(m => (
                      <div key={m.id} className="p-3 rounded-lg bg-gray-900/50 border border-gray-800 flex justify-between">
                        <span className="text-sm text-gray-400 line-through">{m.content}</span>
                        <span className="text-xs text-gray-600">{new Date(m.updatedAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </>
          )}

        </div>
      </div>
    </div>
  );
}
