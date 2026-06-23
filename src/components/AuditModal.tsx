import React, { useState, useEffect } from 'react';

interface AuditLog {
  id: string;
  skill: string;
  action: string;
  args: string | null;
  result: string | null;
  status: string;
  createdAt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuditModal({ isOpen, onClose }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [confirmClear, setConfirmClear] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit?filter=${filter}`);
      const data = await res.json();
      if (res.ok) setLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
      setConfirmClear(false);
    }
  }, [isOpen, filter]);

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/audit', { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
        setConfirmClear(false);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-400">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
              Audit & Debug Dashboard
            </h2>
            <p className="text-xs text-gray-500 mt-1">Logs are stored locally and automatically rotated after 30 days.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters & Actions */}
        <div className="px-6 py-3 border-b border-gray-800 bg-gray-950 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2">
            {['all', 'notes', 'task', 'document', 'briefing', 'errors'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                  filter === f 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                    : 'bg-gray-800 text-gray-400 border border-transparent hover:bg-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={handleClear}
            disabled={loading || logs.length === 0}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              confirmClear 
                ? 'bg-red-600 text-white animate-pulse' 
                : 'bg-gray-800 text-red-400 border border-red-900/50 hover:bg-red-900/30'
            } disabled:opacity-50`}
          >
            {confirmClear ? 'Click to Confirm Delete' : 'Clear Logs'}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-950">
          {loading && logs.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">No audit logs found for this filter.</div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-800/30">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                        log.status === 'auto-run' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        log.status === 'confirmed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        log.status === 'canceled' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {log.status}
                      </span>
                      <span className="text-sm font-semibold text-gray-300 font-mono">
                        {log.action}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                        {log.skill}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="bg-gray-950 rounded-lg p-3 border border-gray-800 overflow-x-auto">
                      <div className="text-gray-500 mb-2 uppercase tracking-wider font-sans font-semibold text-[10px]">Input Arguments</div>
                      <pre className="text-gray-300">
                        {log.args ? (() => {
                           try {
                             return JSON.stringify(JSON.parse(log.args), null, 2);
                           } catch(e) { return log.args; }
                        })() : 'None'}
                      </pre>
                    </div>
                    
                    <div className="bg-gray-950 rounded-lg p-3 border border-gray-800 overflow-x-auto">
                      <div className="text-gray-500 mb-2 uppercase tracking-wider font-sans font-semibold text-[10px]">Output / Result</div>
                      <pre className={`${log.status === 'failed' ? 'text-red-400' : 'text-gray-300'}`}>
                        {log.result ? (() => {
                           try {
                             return JSON.stringify(JSON.parse(log.result), null, 2);
                           } catch(e) { return log.result; }
                        })() : 'None'}
                      </pre>
                    </div>
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
