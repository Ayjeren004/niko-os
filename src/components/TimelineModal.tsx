'use client';
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface TimelineItem {
  id: string;
  dbId: string;
  type: 'memory' | 'task' | 'document';
  content: string;
  category: string;
  createdAt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function TimelineModal({ isOpen, onClose }: Props) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<{nodes: any[], links: any[]}>({ nodes: [], links: [] });
  const [graphLoading, setGraphLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/timeline');
      const data = await res.json();
      if (res.ok) setTimeline(data.timeline);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && timeline.length === 0) {
      fetchTimeline();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleNodeClick = async (id: string, content: string, type: string) => {
    setActiveNode(id);
    setGraphLoading(true);
    try {
      const res = await fetch(`/api/graph/related?id=${id}`);
      const data = await res.json();
      if (res.ok) {
        // Ensure the active node is in the graph data
        const nodes = data.nodes || [];
        if (!nodes.find((n:any) => n.id === id)) {
          nodes.push({ id, label: content.substring(0, 30), group: type });
        }
        setGraphData({ nodes, links: data.links || [] });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGraphLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredTimeline = timeline.filter(t => filter === 'all' || t.category === filter || t.type === filter);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex p-4 lg:p-10 gap-4">
      {/* Left Panel: Timeline */}
      <div className="w-1/3 min-w-[300px] bg-gray-900 border border-gray-700 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/80 sticky top-0 z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-400">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
            </svg>
            Timeline
          </h2>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-3 bg-gray-900/50 border-b border-gray-800">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-gray-800 text-sm text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none"
          >
            <option value="all">All Items</option>
            <option value="people">People</option>
            <option value="projects">Projects</option>
            <option value="goals">Goals</option>
            <option value="tasks">Tasks</option>
            <option value="documents">Documents</option>
            <option value="general">General Memories</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center text-gray-500 py-10">Loading timeline...</div>
          ) : (
            <div className="relative border-l-2 border-gray-800 ml-3 pl-5 space-y-6">
              {filteredTimeline.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => handleNodeClick(item.id, item.content, item.type)}
                  className={`relative p-3 rounded-xl border cursor-pointer transition-all ${activeNode === item.id ? 'bg-indigo-900/30 border-indigo-500/50' : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800 hover:border-gray-600'}`}
                >
                  <div className={`absolute -left-[27px] top-4 w-3 h-3 rounded-full border-2 border-gray-900 ${item.type === 'memory' ? 'bg-yellow-400' : item.type === 'task' ? 'bg-blue-400' : 'bg-purple-400'}`}></div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${item.type === 'memory' ? 'bg-yellow-900/30 text-yellow-500' : item.type === 'task' ? 'bg-blue-900/30 text-blue-500' : 'bg-purple-900/30 text-purple-500'}`}>
                      {item.type}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-3">{item.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Graph */}
      <div className="flex-1 bg-gray-900 border border-gray-700 rounded-2xl flex flex-col overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-gray-800/80 rounded-xl text-gray-400 hover:text-white transition-colors backdrop-blur-sm border border-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="absolute top-4 left-4 z-20 bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-3 rounded-xl pointer-events-none">
          <h3 className="text-sm font-semibold text-white mb-1">Relationship Graph</h3>
          <p className="text-xs text-gray-400">Click a timeline item to see semantic links.</p>
        </div>

        <div className="flex-1 w-full h-full relative bg-[#0a0a0f]">
          {graphLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10 backdrop-blur-[2px]">
              <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
          )}
          
          {graphData.nodes.length > 0 ? (
            <ForceGraph2D
              graphData={graphData}
              nodeLabel="label"
              nodeColor={(node: any) => node.group === 'memory' ? '#eab308' : node.group === 'task' ? '#3b82f6' : '#a855f7'}
              linkColor={() => 'rgba(255,255,255,0.2)'}
              nodeRelSize={6}
              linkWidth={1.5}
              backgroundColor="#0a0a0f"
              width={undefined}
              height={undefined}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
              {activeNode ? 'No strong semantic links found.' : 'Select an item to visualize connections.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
