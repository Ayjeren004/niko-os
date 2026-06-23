'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function UnifiedSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const performSearch = async (q: string) => {
    setLoading(true);
    try {
      const embModel = localStorage.getItem('embeddingModel') || 'nomic-embed-text';
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, embeddingModel: embModel })
      });
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Debounced Search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim().length > 2) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [query]);

  const getBadgeColor = (type: string) => {
    switch(type) {
      case 'memory': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'task': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'document': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'briefing': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'conversation': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input */}
        <div className="flex items-center px-4 py-4 border-b border-gray-800 bg-gray-900/50">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400 mr-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input 
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across memories, tasks, documents, and conversations..."
            className="flex-1 bg-transparent border-none text-white focus:ring-0 placeholder-gray-500 text-lg outline-none"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin ml-3"></div>
          )}
          <div className="text-xs text-gray-500 border border-gray-700 rounded px-1.5 py-0.5 ml-3 font-mono">
            ESC
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.length > 2 && results.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">
              No results found for &quot;{query}&quot;
            </div>
          )}

          {results.length > 0 && (
            <div className="p-2 space-y-1">
              {results.map((r, i) => (
                <div key={i} className="group flex flex-col p-3 rounded-xl hover:bg-gray-800/50 cursor-pointer border border-transparent hover:border-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getBadgeColor(r.sourceType)}`}>
                      {r.sourceType}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      {(r.score * 100).toFixed(0)}% Match
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {r.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {query.length <= 2 && (
            <div className="p-6 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-400 text-xs">
                Semantic search is powered by your local embeddings model
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
