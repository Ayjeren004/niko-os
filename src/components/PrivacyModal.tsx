import React, { useState, useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ isOpen, onClose }: Props) {
  const [micStatus, setMicStatus] = useState<string>('unknown');
  const [notifStatus, setNotifStatus] = useState<string>('unknown');
  
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [enabledSkills, setEnabledSkills] = useState<string[]>([]);
  const [workflows, setWorkflows] = useState<any>({});
  
  const [dbPath, setDbPath] = useState('');
  
  // Wipe flow
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [wipeInput, setWipeInput] = useState('');
  const [wipeLoading, setWipeLoading] = useState(false);
  const [backupPrompt, setBackupPrompt] = useState(false);
  
  // Export backup flow (copied from Settings Modal pattern)
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    // Permissions API
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as any }).then(res => {
        setMicStatus(res.state);
        res.onchange = () => setMicStatus(res.state);
      }).catch(() => setMicStatus('unsupported'));
      
      navigator.permissions.query({ name: 'notifications' as any }).then(res => {
        setNotifStatus(res.state);
        res.onchange = () => setNotifStatus(res.state);
      }).catch(() => setNotifStatus('unsupported'));
    }

    // Local states
    setWakeWordEnabled(localStorage.getItem('wakeWordEnabled') === 'true');
    try {
      const skills = JSON.parse(localStorage.getItem('enabledSkills') || '[]');
      setEnabledSkills(skills);
    } catch(e) {}

    fetch('/api/workflows/settings')
      .then(r => r.json())
      .then(d => { if (d.settings) setWorkflows(d.settings); })
      .catch(e => console.error(e));

    fetch('/api/data/info')
      .then(r => r.json())
      .then(d => { if (d.dbUrl) setDbPath(d.dbUrl); })
      .catch(e => console.error(e));

  }, [isOpen]);

  const calculateHealthScore = () => {
    let score = 50; // Baseline for local architecture
    
    // Microphone risk
    if (micStatus === 'denied' || !wakeWordEnabled) score += 20;
    else score -= 10; // Hot mic always listening
    
    // Notification risk
    if (notifStatus === 'denied') score += 10;
    else score -= 5;
    
    // Destructive skills risk
    if (!enabledSkills.includes('task_skill')) score += 10; // Tasks can edit DB autonomously
    else score -= 5;
    
    // Background workflows risk
    if (Object.values(workflows).every(v => v === false)) score += 10;
    else score -= 5;

    return Math.max(0, Math.min(100, score));
  };

  const handleExport = async () => {
    if (!backupPassphrase || backupPassphrase.length < 4) {
      setMsg('Passphrase must be at least 4 characters.');
      return;
    }
    
    setExportLoading(true);
    setMsg('Generating encrypted backup...');

    try {
      const res = await fetch('/api/backup/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: backupPassphrase })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const blob = new Blob([data.backup], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `niko-backup-${new Date().toISOString().split('T')[0]}.niko`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMsg('Backup downloaded successfully!');
      setBackupPassphrase('');
      setBackupPrompt(false); // Can safely wipe now
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleWipeData = async () => {
    if (wipeInput !== 'DELETE EVERYTHING') return;
    setWipeLoading(true);
    try {
      const res = await fetch('/api/data/wipe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: wipeInput })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const d = await res.json();
        setMsg(d.error);
        setWipeLoading(false);
      }
    } catch(e) {
      console.error(e);
      setWipeLoading(false);
    }
  };

  if (!isOpen) return null;

  const score = calculateHealthScore();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-[#05050A] border border-gray-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px]"></div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-400">
                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
              </svg>
              Permissions & Privacy Center
            </h2>
            <p className="text-xs text-gray-400 mt-1">Audit what your local AI can access and do.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

          {/* Health Score */}
          <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1">Privacy Health Score</h3>
              <p className="text-xs text-gray-500 max-w-sm">
                Informational score based on strict privacy guidelines. Since Niko is 100% local, your baseline is naturally high.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`text-4xl font-black ${score >= 80 ? 'text-green-500' : score >= 60 ? 'text-amber-500' : 'text-orange-500'}`}>
                {score}
              </div>
              <div className="text-xs text-gray-500 mt-2">/ 100</div>
            </div>
          </div>

          {/* OS-Level Access */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">OS & Hardware Access</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/30 border border-gray-800">
                <div>
                  <div className="text-sm text-gray-200 font-medium">Microphone</div>
                  <div className="text-xs text-gray-500">Local Whisper transcription & Silero VAD</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-mono px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded">100% LOCAL</span>
                  <span className={`text-xs px-2 py-1 rounded capitalize ${micStatus === 'granted' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-700 text-gray-400'}`}>{micStatus}</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/30 border border-gray-800">
                <div>
                  <div className="text-sm text-gray-200 font-medium">Wake Word Mode</div>
                  <div className="text-xs text-gray-500">Always-listening hot mic trigger ("Niko")</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-mono px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded">100% LOCAL</span>
                  <span className={`text-xs px-2 py-1 rounded ${wakeWordEnabled ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-gray-700 text-gray-400'}`}>
                    {wakeWordEnabled ? 'Active Warning' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/30 border border-gray-800">
                <div>
                  <div className="text-sm text-gray-200 font-medium">Desktop Notifications</div>
                  <div className="text-xs text-gray-500">Browser API for task reminders</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded capitalize ${notifStatus === 'granted' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>{notifStatus}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Autonomous Permissions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">AI Autonomy</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/30 border border-gray-800">
                <div>
                  <div className="text-sm text-gray-200 font-medium">Model Inference</div>
                  <div className="text-xs text-gray-500">Chat & Vector Embeddings</div>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded">Local Ollama</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/30 border border-gray-800">
                <div>
                  <div className="text-sm text-gray-200 font-medium">Read-Only Skills</div>
                  <div className="text-xs text-gray-500">Searching your memories and documents</div>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded">Auto-Run Allowed</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/30 border border-gray-800">
                <div>
                  <div className="text-sm text-gray-200 font-medium">Destructive Skills</div>
                  <div className="text-xs text-gray-500">Updating or deleting tasks/notes</div>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">Requires Manual Confirmation</span>
              </div>
            </div>
          </div>

          {/* Data Location */}
          <div className="p-4 rounded-xl bg-blue-900/10 border border-blue-500/20 flex gap-4 items-start">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-400 shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M11.484 2.17a.75.75 0 011.032 0 11.209 11.209 0 007.877 3.08.75.75 0 01.722.515 12.74 12.74 0 01.222 2.45c0 5.061-3.235 9.828-8.96 11.332a.75.75 0 01-.756 0c-5.725-1.504-8.96-6.271-8.96-11.332a12.74 12.74 0 01.222-2.45.75.75 0 01.722-.515 11.209 11.209 0 007.877-3.08zM12 4.494A12.706 12.706 0 017.07 7.026a11.24 11.24 0 00-2.316.59c.077 1.83.35 3.585.807 5.244C6.67 15.65 9.07 18.25 12 19.345c2.93-1.095 5.33-3.695 6.44-6.485.456-1.66.73-3.414.806-5.245a11.24 11.24 0 00-2.316-.59A12.706 12.706 0 0112 4.494z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-400">Data Storage Location</h4>
              <p className="text-xs text-blue-200/70 mt-1">
                Your database is entirely local. It is stored on your disk using SQLite at:
                <br />
                <code className="mt-2 block p-2 bg-black/30 rounded text-blue-300 font-mono text-[10px] break-all">
                  {dbPath}
                </code>
              </p>
            </div>
          </div>

          {/* Danger Zone */}
          <div>
            <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">Danger Zone</h3>
            <div className="p-4 rounded-xl border border-red-900/50 bg-red-900/10 space-y-4">
              
              {!backupPrompt && !showWipeConfirm ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">Delete All Data</h4>
                    <p className="text-xs text-gray-400">Permanently delete all memories, documents, tasks, and history.</p>
                  </div>
                  <button 
                    onClick={() => setBackupPrompt(true)}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-lg transition-colors border border-red-500/30"
                  >
                    Delete Data...
                  </button>
                </div>
              ) : backupPrompt ? (
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <h4 className="text-sm font-medium text-white mb-2">Wait! Create a backup first.</h4>
                  <p className="text-xs text-gray-400 mb-4">It is highly recommended to export an AES-256 encrypted backup before wiping your data.</p>
                  <div className="flex items-center gap-3 mb-4">
                    <input 
                      type="password"
                      placeholder="Backup Passphrase"
                      value={backupPassphrase}
                      onChange={e => setBackupPassphrase(e.target.value)}
                      className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white"
                    />
                    <button 
                      onClick={handleExport}
                      disabled={exportLoading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm transition-colors disabled:opacity-50"
                    >
                      {exportLoading ? 'Exporting...' : 'Export Backup'}
                    </button>
                  </div>
                  <button 
                    onClick={() => { setBackupPrompt(false); setShowWipeConfirm(true); }}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Skip backup and proceed to wipe
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-red-950/40 rounded-lg border border-red-900">
                  <h4 className="text-sm font-medium text-red-400 mb-2">Final Confirmation</h4>
                  <p className="text-xs text-gray-400 mb-4">This action cannot be undone. Type <span className="font-mono bg-black/50 px-1 py-0.5 rounded text-red-300">DELETE EVERYTHING</span> to confirm.</p>
                  <div className="flex items-center gap-3">
                    <input 
                      type="text"
                      placeholder="Type DELETE EVERYTHING"
                      value={wipeInput}
                      onChange={e => setWipeInput(e.target.value)}
                      className="flex-1 bg-black border border-red-900 rounded px-3 py-2 text-sm text-red-400 focus:outline-none focus:border-red-500"
                    />
                    <button 
                      onClick={handleWipeData}
                      disabled={wipeInput !== 'DELETE EVERYTHING' || wipeLoading}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors disabled:opacity-50"
                    >
                      {wipeLoading ? 'Wiping...' : 'Confirm Wipe'}
                    </button>
                  </div>
                  <button 
                    onClick={() => { setShowWipeConfirm(false); setWipeInput(''); }}
                    className="text-xs text-gray-400 hover:text-white mt-4"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {msg && <div className="text-xs text-amber-400 mt-2">{msg}</div>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
