import React, { useState, useRef, useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: Props) {
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Wake Word Settings
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [wakeWord, setWakeWord] = useState('Niko');

  // Skills Settings
  const [enabledSkills, setEnabledSkills] = useState<string[]>(['notes_skill', 'task_skill', 'document_skill', 'briefing_skill']);
  
  // TTS Settings
  const [ttsVoiceUri, setTtsVoiceUri] = useState('');
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsPitch, setTtsPitch] = useState(1.0);
  const [vadSilenceTimeout, setVadSilenceTimeout] = useState(1000);
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);

  // Demo Mode
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Workflow Settings
  const [workflows, setWorkflows] = useState<Record<string, boolean>>({
    auto_summarize_doc: true,
    auto_suggest_deadline: true,
    auto_link_memory: true,
    daily_morning_briefing: true
  });

  // Model Settings
  const [ollamaModels, setOllamaModels] = useState<any[]>([]);
  const [chatModel, setChatModel] = useState('llama3.2');
  const [embeddingModel, setEmbeddingModel] = useState('nomic-embed-text');
  const [memoryModel, setMemoryModel] = useState('llama3.2');
  const [briefingModel, setBriefingModel] = useState('llama3.2');
  const [visionModel, setVisionModel] = useState('llava');
  
  const [embeddingWarningModel, setEmbeddingWarningModel] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [modelTestStatus, setModelTestStatus] = useState<{model: string, status: string, msg: string} | null>(null);

  const SKILL_OPTIONS = [
    { id: 'notes_skill', name: 'Notes & Memory', desc: 'Save and recall long-term facts' },
    { id: 'task_skill', name: 'Task Manager', desc: 'Create and manage tasks' },
    { id: 'document_skill', name: 'Document Search', desc: 'Search through uploaded documents' },
    { id: 'briefing_skill', name: 'Daily Briefing', desc: 'Generate morning reports' },
  ];
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load settings on mount
  useEffect(() => {
    setWakeWordEnabled(localStorage.getItem('wakeWordEnabled') === 'true');
    setWakeWord(localStorage.getItem('wakeWord') || 'Niko');
    setTtsVoiceUri(localStorage.getItem('ttsVoiceUri') || '');
    setTtsSpeed(parseFloat(localStorage.getItem('ttsSpeed') || '1.0'));
    setTtsPitch(parseFloat(localStorage.getItem('ttsPitch') || '1.0'));
    setVadSilenceTimeout(parseInt(localStorage.getItem('vadSilenceTimeout') || '1000'));
    setIsDemoMode(localStorage.getItem('isDemoMode') === 'true');

    try {
      const skills = JSON.parse(localStorage.getItem('enabledSkills') || '[]');
      if (skills.length > 0) setEnabledSkills(skills);
    } catch(e) {}

    // Fetch workflows
    fetch('/api/workflows/settings')
      .then(r => r.json())
      .then(d => {
        if (d.settings) setWorkflows(prev => ({ ...prev, ...d.settings }));
      })
      .catch(e => console.error(e));

    // Load available voices
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => setAvailableVoices(window.speechSynthesis.getVoices());
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    // Load models settings
    setChatModel(localStorage.getItem('chatModel') || 'llama3.2');
    setEmbeddingModel(localStorage.getItem('embeddingModel') || 'nomic-embed-text');
    setMemoryModel(localStorage.getItem('memoryModel') || 'llama3.2');
    setBriefingModel(localStorage.getItem('briefingModel') || 'llama3.2');
    setVisionModel(localStorage.getItem('visionModel') || 'llava');

    // Fetch installed models
    fetch('/api/models')
      .then(r => r.json())
      .then(d => {
        if (d.models) setOllamaModels(d.models);
      })
      .catch(e => console.error(e));
  }, []);

  const handleWakeWordToggle = () => {
    const newState = !wakeWordEnabled;
    setWakeWordEnabled(newState);
    localStorage.setItem('wakeWordEnabled', String(newState));
    window.dispatchEvent(new Event('niko-settings-changed'));
  };

  const handleWakeWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWord = e.target.value;
    setWakeWord(newWord);
    localStorage.setItem('wakeWord', newWord);
    window.dispatchEvent(new Event('niko-settings-changed'));
  };

  const handleDemoModeToggle = () => {
    const newState = !isDemoMode;
    setIsDemoMode(newState);
    localStorage.setItem('isDemoMode', String(newState));
    window.dispatchEvent(new Event('niko-settings-changed'));
  };

  const handleSkillToggle = (skillId: string) => {
    const newSkills = enabledSkills.includes(skillId) 
      ? enabledSkills.filter(s => s !== skillId)
      : [...enabledSkills, skillId];
    setEnabledSkills(newSkills);
    localStorage.setItem('enabledSkills', JSON.stringify(newSkills));
    window.dispatchEvent(new Event('niko-settings-changed'));
  };

  const toggleWorkflow = async (workflowId: string) => {
    const newWorkflows = { ...workflows, [workflowId]: !workflows[workflowId] };
    setWorkflows(newWorkflows);
    try {
      await fetch('/api/workflows/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newWorkflows })
      });
    } catch (e) {
      console.error('Failed to save workflow settings:', e);
    }
  };

  const handleEmbeddingModelSelect = (newModel: string) => {
    if (newModel !== embeddingModel) {
      setEmbeddingWarningModel(newModel);
    }
  };

  const confirmEmbeddingModelChange = () => {
    if (embeddingWarningModel) {
      setEmbeddingModel(embeddingWarningModel);
      localStorage.setItem('embeddingModel', embeddingWarningModel);
      window.dispatchEvent(new Event('niko-settings-changed'));
      setEmbeddingWarningModel(null);
    }
  };

  const testModel = async (modelName: string) => {
    setModelTestStatus({ model: modelName, status: 'testing', msg: 'Testing...' });
    try {
      const res = await fetch('/api/models/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelName })
      });
      const data = await res.json();
      if (res.ok) {
        setModelTestStatus({ model: modelName, status: 'success', msg: 'Responsive!' });
      } else {
        setModelTestStatus({ model: modelName, status: 'error', msg: data.error || 'Failed' });
      }
    } catch(e: any) {
      setModelTestStatus({ model: modelName, status: 'error', msg: e.message });
    }
    setTimeout(() => setModelTestStatus(null), 3000);
  };

  const reindexData = async () => {
    setReindexing(true);
    setMessage({ text: 'Re-indexing data... This may take a while.', type: 'info' });
    try {
      const res = await fetch('/api/reindex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmbeddingModel: embeddingModel })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: `Re-indexed ${data.reindexedMemories} memories and ${data.reindexedChunks} document chunks.`, type: 'success' });
      } else {
        setMessage({ text: data.error, type: 'error' });
      }
    } catch(e:any) {
      setMessage({ text: e.message, type: 'error' });
    } finally {
      setReindexing(false);
    }
  };

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!passphrase || passphrase.length < 4) {
      setMessage({ text: 'Passphrase must be at least 4 characters.', type: 'error' });
      return;
    }
    
    setLoading(true);
    setMessage({ text: 'Generating encrypted backup...', type: 'info' });

    try {
      const res = await fetch('/api/backup/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Create a downloadable blob
      const blob = new Blob([data.backup], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `niko-backup-${new Date().toISOString().split('T')[0]}.niko`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ text: 'Backup downloaded successfully!', type: 'success' });
      setPassphrase('');
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = () => {
    if (!passphrase || passphrase.length < 4) {
      setMessage({ text: 'Enter passphrase before selecting a file to import.', type: 'error' });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage({ text: 'Decrypting and restoring...', type: 'info' });

    try {
      const text = await file.text();
      
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encryptedBackup: text, passphrase })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ text: 'Backup restored successfully! Please refresh the page.', type: 'success' });
      setPassphrase('');
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-400">
              <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l1.093.892c.12.098.197.24.21.391.01.121.011.244.011.368 0 .124-.001.247-.011.368-.013.15-.09.293-.21.391l-1.093.892a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-1.093-.892c-.12-.098-.197-.24-.21-.391a7.465 7.465 0 000-.736c.013-.15.09-.293.21-.391l1.093-.892a1.875 1.875 0 00.432-2.385l-.923-1.597a1.875 1.875 0 00-2.28-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
            </svg>
            Settings & Backups
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Local Model Manager</h3>
            <p className="text-sm text-gray-400 mb-4">
              Select which local Ollama model handles different tasks. Some models are better suited for reasoning, while others excel at text embeddings.
            </p>

            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 space-y-5">
              {[
                { label: 'Chat Model', state: chatModel, setState: setChatModel, storageKey: 'chatModel', desc: 'Main conversational model.' },
                { label: 'Briefing Model', state: briefingModel, setState: setBriefingModel, storageKey: 'briefingModel', desc: 'Used for formatting the morning report.' },
                { label: 'Memory Extraction', state: memoryModel, setState: setMemoryModel, storageKey: 'memoryModel', desc: 'Used for extracting facts from text.' },
                { label: 'Vision Model', state: visionModel, setState: setVisionModel, storageKey: 'visionModel', desc: 'Used for multimodal analysis.' },
              ].map(cfg => (
                <div key={cfg.storageKey} className="border-b border-gray-700/50 pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <label className="block text-sm font-medium text-white">{cfg.label}</label>
                      <p className="text-xs text-gray-400">{cfg.desc}</p>
                    </div>
                    <button 
                      onClick={() => testModel(cfg.state)}
                      className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
                    >
                      {modelTestStatus?.model === cfg.state ? modelTestStatus.msg : 'Test Model'}
                    </button>
                  </div>
                  <select 
                    value={cfg.state}
                    onChange={(e) => {
                      cfg.setState(e.target.value);
                      localStorage.setItem(cfg.storageKey, e.target.value);
                      window.dispatchEvent(new Event('niko-settings-changed'));
                    }}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    {!ollamaModels.find(m => m.name === cfg.state) && (
                      <option value={cfg.state}>{cfg.state} (Missing!)</option>
                    )}
                    {ollamaModels.map(m => (
                      <option key={m.name} value={m.name}>
                        {m.name} ({(m.size / 1024 / 1024 / 1024).toFixed(1)} GB)
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <div className="border-t border-gray-700/50 pt-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <label className="block text-sm font-medium text-white">Embeddings Model</label>
                    <p className="text-xs text-gray-400">Used for vector search. Changing this requires re-indexing.</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={reindexData}
                      disabled={reindexing}
                      className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white transition-colors disabled:opacity-50"
                    >
                      {reindexing ? 'Re-indexing...' : 'Re-index All Data'}
                    </button>
                  </div>
                </div>
                <select 
                  value={embeddingModel}
                  onChange={(e) => handleEmbeddingModelSelect(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                >
                  {!ollamaModels.find(m => m.name === embeddingModel) && (
                    <option value={embeddingModel}>{embeddingModel} (Missing!)</option>
                  )}
                  {ollamaModels.map(m => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({(m.size / 1024 / 1024 / 1024).toFixed(1)} GB)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Encrypted Backups</h3>
            <p className="text-sm text-gray-400 mb-4">
              Securely export your memories, documents, tasks, and conversations into a single encrypted file (AES-256-GCM). Keep it safe.
            </p>

            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Backup Passphrase</label>
                <input 
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter a strong passphrase..."
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {message.text && (
                <div className={`text-sm p-3 rounded-lg ${message.type === 'error' ? 'bg-red-900/20 text-red-400 border border-red-900/50' : message.type === 'success' ? 'bg-green-900/20 text-green-400 border border-green-900/50' : 'bg-blue-900/20 text-blue-400 border border-blue-900/50'}`}>
                  {message.text}
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={handleExport}
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                  </svg>
                  Export Backup
                </button>
                
                <button 
                  onClick={handleImportClick}
                  disabled={loading}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                  </svg>
                  Import Backup
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".niko,.enc,.json" 
                  className="hidden" 
                />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Voice Assistant Settings</h3>
            <p className="text-sm text-gray-400 mb-4">
              Configure the open-source Silero VAD engine for hands-free "Always Listening" capabilities. 100% offline and private.
            </p>

            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-white">Always Listening</h4>
                  <p className="text-xs text-gray-400">Enable offline voice detection (VAD)</p>
                </div>
                <button
                  onClick={handleWakeWordToggle}
                  className={`w-11 h-6 rounded-full transition-colors relative ${wakeWordEnabled ? 'bg-purple-500' : 'bg-gray-600'}`}
                >
                  <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${wakeWordEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Wake Word Trigger</label>
                <input 
                  type="text"
                  value={wakeWord}
                  onChange={handleWakeWordChange}
                  placeholder="e.g. Niko"
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-2">
                  When VAD detects speech, it transcribes it locally. If the transcription starts with this word, Niko responds.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Modular Skills</h3>
            <p className="text-sm text-gray-400 mb-4">
              Enable or disable specific plugins for Niko OS.
            </p>

            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 space-y-4">
              {SKILL_OPTIONS.map(skill => (
                <div key={skill.id} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0 last:pb-0">
                  <div>
                    <h4 className="text-sm font-medium text-white">{skill.name}</h4>
                    <p className="text-xs text-gray-400">{skill.desc}</p>
                  </div>
                  <button
                    onClick={() => handleSkillToggle(skill.id)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${enabledSkills.includes(skill.id) ? 'bg-green-500' : 'bg-gray-600'}`}
                  >
                    <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${enabledSkills.includes(skill.id) ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Demo & Presentation</h3>
            <p className="text-sm text-gray-400 mb-4">
              Toggle Recruiter Demo Mode to safely show off Niko OS without making actual file changes or destructive actions.
            </p>
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-white">Recruiter Demo Mode</h4>
                  <p className="text-xs text-gray-400">Mock destructive actions (safe mode)</p>
                </div>
                <button
                  onClick={handleDemoModeToggle}
                  className={`w-11 h-6 rounded-full transition-colors relative ${isDemoMode ? 'bg-orange-500' : 'bg-gray-600'}`}
                >
                  <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isDemoMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Automated Workflows</h3>
            <p className="text-sm text-gray-400 mb-4">
              Enable background tasks triggered by your actions.
            </p>
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 space-y-4">
              {[
                { id: 'auto_summarize_doc', name: 'Auto Summarize Docs', desc: 'Create a summary memory when a document is uploaded' },
                { id: 'auto_suggest_deadline', name: 'Auto Suggest Deadline', desc: 'Predict and assign due dates for new tasks' },
                { id: 'auto_link_memory', name: 'Auto Link Memory', desc: 'Find and connect semantically similar memories' },
                { id: 'daily_morning_briefing', name: 'Daily Morning Briefing', desc: 'Generate a briefing every morning' }
              ].map(wf => (
                <div key={wf.id} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0 last:pb-0">
                  <div>
                    <h4 className="text-sm font-medium text-white">{wf.name}</h4>
                    <p className="text-xs text-gray-400">{wf.desc}</p>
                  </div>
                  <button
                    onClick={() => toggleWorkflow(wf.id)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${workflows[wf.id] !== false ? 'bg-green-500' : 'bg-gray-600'}`}
                  >
                    <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${workflows[wf.id] !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Voice & TTS</h3>
            <p className="text-sm text-gray-400 mb-4">
              Configure the Text-to-Speech voice, speed, and pitch for Conversational Mode.
            </p>

            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">TTS Voice (Male preferred)</label>
                <select 
                  value={ttsVoiceUri}
                  onChange={(e) => {
                    setTtsVoiceUri(e.target.value);
                    localStorage.setItem('ttsVoiceUri', e.target.value);
                    window.dispatchEvent(new Event('niko-settings-changed'));
                  }}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                >
                  <option value="">Default OS Male Voice</option>
                  {availableVoices.filter(v => v.lang.startsWith('en')).map((v, i) => (
                    <option key={`${v.voiceURI}-${i}`} value={v.voiceURI}>
                      {v.name} ({v.lang}) {v.localService ? '' : '[Cloud]'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Speaking Speed: {ttsSpeed.toFixed(1)}x</label>
                <input 
                  type="range"
                  min="0.5" max="2.0" step="0.1"
                  value={ttsSpeed}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setTtsSpeed(val);
                    localStorage.setItem('ttsSpeed', val.toString());
                    window.dispatchEvent(new Event('niko-settings-changed'));
                  }}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Voice Pitch: {ttsPitch.toFixed(1)}</label>
                <input 
                  type="range"
                  min="0.1" max="2.0" step="0.1"
                  value={ttsPitch}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setTtsPitch(val);
                    localStorage.setItem('ttsPitch', val.toString());
                    window.dispatchEvent(new Event('niko-settings-changed'));
                  }}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">VAD Silence Timeout (ms): {vadSilenceTimeout}</label>
                <input 
                  type="range"
                  min="500" max="3000" step="100"
                  value={vadSilenceTimeout}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setVadSilenceTimeout(val);
                    localStorage.setItem('vadSilenceTimeout', val.toString());
                    window.dispatchEvent(new Event('niko-settings-changed'));
                  }}
                  className="w-full accent-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How long Niko waits after you stop speaking before replying.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Notifications</h3>
            <p className="text-sm text-gray-400 mb-4">
              Manage local desktop notifications for reminders and alerts.
            </p>

            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 space-y-4">
              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-medium text-white">System Permissions</h4>
                <p className="text-xs text-gray-400 mb-2">Ensure your OS allows notifications from Niko OS.</p>
                <button
                  onClick={() => {
                    if ('Notification' in window) {
                      Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                          new Notification('Niko OS', {
                            body: 'Notifications are working correctly!'
                          });
                        } else {
                          // we would probably show a message
                        }
                      });
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  Request Permission & Test
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Embedding Model Warning Modal */}
      {embeddingWarningModel && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-900/50 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-bold text-white">Warning: Changing Embedding Model</h3>
            </div>
            <p className="text-sm text-gray-300 mb-6 leading-relaxed">
              Changing the embedding model may require re-indexing all memories and documents. Old vectors will be incompatible with the new model, and semantic search will automatically fall back to keyword search for unindexed items.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setEmbeddingWarningModel(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-white hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmEmbeddingModelChange}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Change Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
