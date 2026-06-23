import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message } from '@/types';
import MessageBubble from './MessageBubble';
import { useWakeWord } from '@/hooks/useWakeWord';
import { tts } from '@/lib/tts';
import { WORKSPACE_MODES, WorkspaceMode } from '@/lib/modes';

interface Props {
  conversationId: string | null;
  onUpdateHistory: () => void; // Triggered to refresh sidebar sorting
}

export default function ChatArea({ conversationId, onUpdateHistory }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isConversationalMode, setIsConversationalMode] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // Skills Confirmation State
  const [pendingToolCall, setPendingToolCall] = useState<any | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Wake word & Skills settings
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [wakeWord, setWakeWord] = useState('Niko');
  const [enabledSkills, setEnabledSkills] = useState<string[]>([]);
  
  // TTS Settings State
  const [ttsVoiceUri, setTtsVoiceUri] = useState('');
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsPitch, setTtsPitch] = useState(1.0);
  const [vadSilenceTimeout, setVadSilenceTimeout] = useState(1000);

  const [activeModeId, setActiveModeId] = useState('general');
  const [suggestedModeId, setSuggestedModeId] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelWarning, setModelWarning] = useState<string | null>(null);

  // Vision Mode States
  const [isVisionMode, setIsVisionMode] = useState(false);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [visionSetupNeeded, setVisionSetupNeeded] = useState(false);
  const [pipPos, setPipPos] = useState({ x: 20, y: 80 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    fetch('/api/models')
      .then(res => res.json())
      .then(data => setAvailableModels(data.models?.map((m: any) => m.name.split(':')[0]) || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      import('@/lib/tts').then(({ tts }) => {
        setIsSpeaking(tts.isSpeaking());
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadSettings = () => {
       setWakeWordEnabled(localStorage.getItem('wakeWordEnabled') === 'true');
       setWakeWord(localStorage.getItem('wakeWord') || 'Niko');
       setTtsVoiceUri(localStorage.getItem('ttsVoiceUri') || '');
       setTtsSpeed(parseFloat(localStorage.getItem('ttsSpeed') || '1.0'));
       setTtsPitch(parseFloat(localStorage.getItem('ttsPitch') || '1.0'));
       setVadSilenceTimeout(parseInt(localStorage.getItem('vadSilenceTimeout') || '1000'));
       
       try {
         const skills = JSON.parse(localStorage.getItem('enabledSkills') || '[]');
         setEnabledSkills(skills);
       } catch(e) {
         setEnabledSkills([]);
       }
       
       setActiveModeId(localStorage.getItem('activeModeId') || 'general');
    };
    
    loadSettings();
    window.addEventListener('storage', loadSettings);
    window.addEventListener('niko-settings-changed', loadSettings);
    return () => {
       window.removeEventListener('storage', loadSettings);
       window.removeEventListener('niko-settings-changed', loadSettings);
    };
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isVisionMode) {
      const visionModel = localStorage.getItem('visionModel') || 'llava';
      if (availableModels.length > 0 && !availableModels.includes(visionModel)) {
        setVisionSetupNeeded(true);
        setIsVisionMode(false);
        return;
      }
      setVisionSetupNeeded(false);

      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(err => {
          console.error("Camera access denied", err);
          setIsVisionMode(false);
        });
    }

    const updateDemoMode = () => setIsDemoMode(localStorage.getItem('isDemoMode') === 'true');
    window.addEventListener('niko-settings-changed', updateDemoMode);
    updateDemoMode();

    return () => {
      window.removeEventListener('niko-settings-changed', updateDemoMode);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isVisionMode, availableModels]);

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.8);
    }
    return null;
  };

  const getActiveModelConfig = () => {
    const modeDef = WORKSPACE_MODES.find(m => m.id === activeModeId);
    let chatModel = localStorage.getItem('chatModel') || 'llama3.2';
    if (modeDef?.preferredModel && availableModels.includes(modeDef.preferredModel)) {
      chatModel = modeDef.preferredModel;
    }
    return {
      chat: chatModel,
      embedding: localStorage.getItem('embeddingModel') || 'nomic-embed-text',
      memory: localStorage.getItem('memoryModel') || 'llama3.2',
      briefing: localStorage.getItem('briefingModel') || 'llama3.2',
      vision: localStorage.getItem('visionModel') || 'llava'
    };
  };

  const handleModeSwitch = async (modeId: string) => {
    setActiveModeId(modeId);
    localStorage.setItem('activeModeId', modeId);
    setSuggestedModeId(null);
    
    const modeDef = WORKSPACE_MODES.find(m => m.id === modeId);
    if (modeDef?.preferredModel && availableModels.length > 0 && !availableModels.includes(modeDef.preferredModel)) {
      setModelWarning(`Preferred model '${modeDef.preferredModel}' not installed. Using default.`);
    } else {
      setModelWarning(null);
    }

    try {
      await fetch('/api/modes/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modeId })
      });
    } catch(e) {}
  };

  const checkModeHeuristics = (text: string) => {
    if (activeModeId !== 'general') return; // Only suggest if in general mode
    
    const lowerText = text.toLowerCase();
    for (const mode of WORKSPACE_MODES) {
      if (mode.id === 'general') continue;
      if (mode.keywords.some(k => lowerText.includes(k))) {
        setSuggestedModeId(mode.id);
        break;
      }
    }
  };

  // Fetch full conversation history when selected chat changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setPendingToolCall(null);
      return;
    }

    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/conversations/${conversationId}`);
        const data = await res.json();
        if (res.ok) {
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error("Failed to load history", err);
      }
    };

    fetchHistory();
  }, [conversationId]);

  async function handleChatStream(res: Response, assistantId: string) {
    if (!res.body) throw new Error('No response body');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let accumulatedContent = '';
    let finalBuffer = '';

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      
      if (value) {
        const chunkStr = decoder.decode(value, { stream: !done });
        finalBuffer += chunkStr;

        if (finalBuffer.includes('[FINAL_DATA]')) {
          const parts = finalBuffer.split('[FINAL_DATA]');
          const textContent = parts[0];
          
          try {
            const finalData = JSON.parse(parts[1]);
            setMessages(prev => prev.map(m => 
              m.id === assistantId ? finalData.assistantMessage : m
            ));
            onUpdateHistory(); 
            speakText(textContent);
          } catch (e) {
            console.error("Failed to parse final data", e);
          }
        } else {
          accumulatedContent += chunkStr;
          setMessages(prev => prev.map(m => 
            m.id === assistantId ? { ...m, content: accumulatedContent } : m
          ));
        }
      }
    }
  }

  // Helper to submit messages programmatically
  async function submitMessage(userText: string) {
    if (!userText.trim() || !conversationId || isLoading) return;

    setError(null);
    setPendingToolCall(null);

    const optimisticMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setIsLoading(true);

    checkModeHeuristics(userText);

    const currentFrame = isVisionMode ? (capturedFrame || captureFrame()) : null;
    
    try {
      // Get models config
      const models = getActiveModelConfig();

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationId, 
          message: userText, 
          enabledSkills,
          models,
          modeId: activeModeId,
          imageBase64: currentFrame,
          isDemoMode: localStorage.getItem('isDemoMode') === 'true'
        })
      });

      if (currentFrame) setCapturedFrame(null); // Clear after sending

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }

      // Check if it's a JSON response requesting confirmation instead of a stream
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.requiresConfirmation) {
          setPendingToolCall(data.toolCall);
          setIsLoading(false);
          return;
        }
      }

      const assistantId = Date.now().toString() + "-ai";
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString()
      }]);
      
      setIsLoading(false);
      await handleChatStream(res, assistantId);

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  async function resolvePendingTool(toolCall: any, confirm: boolean) {
    setPendingToolCall(null);
    setIsLoading(true);
    try {
      const models = getActiveModelConfig();

      const payload: any = {
        conversationId,
        enabledSkills,
        models,
        modeId: activeModeId,
        isDemoMode: localStorage.getItem('isDemoMode') === 'true'
      };
      
      if (confirm) {
        payload.confirmedToolCall = toolCall;
      } else {
        payload.canceledToolCall = toolCall;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to resolve tool action');
      
      // Could potentially require ANOTHER confirmation if LLM chooses another write tool sequentially
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.requiresConfirmation) {
          setPendingToolCall(data.toolCall);
          setIsLoading(false);
          return;
        }
      }

      const assistantId = Date.now().toString() + "-ai";
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString()
      }]);
      
      setIsLoading(false);
      await handleChatStream(res, assistantId);

    } catch(err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  }

  const handleRegenerate = async (messageId: string, modelOverride: string) => {
    if (!conversationId || isLoading) return;
    setIsLoading(true);
    
    try {
      await fetch(`/api/chat/message?id=${messageId}`, { method: 'DELETE' });
      setMessages(prev => prev.filter(m => m.id !== messageId));

      const models = {
        ...getActiveModelConfig(),
        chat: modelOverride
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationId, 
          enabledSkills,
          models,
          modeId: activeModeId
        })
      });

      if (!res.ok) throw new Error('Regeneration failed');

      const assistantId = Date.now().toString() + "-ai";
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString()
      }]);
      
      setIsLoading(false);
      await handleChatStream(res, assistantId);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const [isAwaitingFollowup, setIsAwaitingFollowup] = useState(false);
  
  const toggleListening = useCallback(async () => {
    setSpeechError(null);

    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
      return; 
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsTranscribing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        stream.getTracks().forEach(track => track.stop());

        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        try {
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          
          if (res.ok && data.text) {
            setInput(data.text);
          } else {
            setSpeechError(data.error || "Failed to transcribe audio.");
          }
        } catch (err) {
          console.error("Transcription error:", err);
          setSpeechError("Network error during local transcription.");
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err: any) {
      setSpeechError("Microphone permission denied.");
    }
  }, [isListening]);
  
  const onSpeechDetected = useCallback(async (audioBlob: Blob) => {
    if (isListening || isTranscribing || isLoading || pendingToolCall) return;
    
    setIsTranscribing(true);
    setSpeechError(null);
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'vad-recording.wav');

    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (res.ok && data.text) {
        const transcribedText = data.text as string;
        const cleanText = transcribedText.replace(/[^\p{L}\p{N}\s]/gu, '').toLowerCase().trim();
        
        if (isConversationalMode) {
          if (cleanText.length > 0) {
            submitMessage(transcribedText);
          }
        } else if (isAwaitingFollowup) {
          // We were already waiting for their question! Just submit whatever they said.
          if (cleanText.length > 0) {
            submitMessage(transcribedText);
            setIsAwaitingFollowup(false);
          }
        } else {
          // Standard wake word mode
          const trigger = wakeWord.toLowerCase();
          
          // Simple alias handling for common Whisper misspellings of "Niko"
          const startsWithTrigger = cleanText.startsWith(trigger) || 
            (trigger === 'niko' && (cleanText.startsWith('nico') || cleanText.startsWith('neko') || cleanText.startsWith('miko') || cleanText.startsWith('eagle') || cleanText.startsWith('nickel') || cleanText.startsWith('nicole') || cleanText.startsWith('echo') || cleanText.startsWith('nniko') || cleanText.includes('niko')));

          if (startsWithTrigger) {
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              osc.connect(gainNode);
              gainNode.connect(ctx.destination);
              osc.frequency.value = 880; 
              gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
              osc.start();
              osc.stop(ctx.currentTime + 0.1);
            } catch (e) {}

            let matchedTrigger = trigger;
            if (trigger === 'niko' && !cleanText.startsWith('niko')) {
              if (cleanText.startsWith('nico')) matchedTrigger = 'nico';
              if (cleanText.startsWith('neko')) matchedTrigger = 'neko';
              if (cleanText.startsWith('miko')) matchedTrigger = 'miko';
            }

            const queryIndex = transcribedText.toLowerCase().indexOf(matchedTrigger);
            const query = queryIndex !== -1 
              ? transcribedText.substring(queryIndex + matchedTrigger.length).trim()
              : '';
            
            if (query.replace(/[^a-zA-Z0-9]/g, '').length > 2) {
              submitMessage(query);
            } else {
              // Instead of triggering manual mode (which blocks VAD), we just wait for the NEXT VAD trigger
              setIsAwaitingFollowup(true);
              
              // Give audible feedback
              if (activeModeId !== 'focus') {
                tts.speak("I'm listening.", {
                  voiceUri: ttsVoiceUri,
                  rate: ttsSpeed,
                  pitch: ttsPitch
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("VAD Transcription error:", err);
    } finally {
      setIsTranscribing(false);
    }
  }, [isListening, isTranscribing, isLoading, pendingToolCall, wakeWord, isConversationalMode, toggleListening, submitMessage, isAwaitingFollowup, activeModeId, ttsPitch, ttsSpeed, ttsVoiceUri]);

  const onSpeechStart = useCallback(() => {
    // We intentionally do NOT stop TTS here anymore.
    // Due to local microphone echo, the AI's own voice was triggering VAD and causing it to cut itself off.
    // If the user wants to interrupt, they can use the spacebar, or we just rely on VAD pausing while speaking.
  }, []);

  const { isReady: isWakeWordReady, error: wakeWordError, isListening: isWakeWordListening } = useWakeWord({
    enabled: (wakeWordEnabled || isConversationalMode) && !isSpeaking,
    onSpeechDetected,
    onSpeechStart,
    vadOptions: {
      minSpeechMs: 200, // Allow shorter utterances (like saying "Niko")
      redemptionMs: isConversationalMode ? vadSilenceTimeout : 1000, // Silence timeout in ms
      positiveSpeechThreshold: 0.5,
      negativeSpeechThreshold: 0.35
    }
  });

  const isSpaceDown = useRef(false);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpaceDown.current && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        isSpaceDown.current = true;
        if (!isListening && !isTranscribing && !pendingToolCall) {
          toggleListening();
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        isSpaceDown.current = false;
        if (isListening) {
          toggleListening();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isListening, isTranscribing, pendingToolCall]);



  function speakText(text: string) {
    if (!isConversationalMode) return;
    if (activeModeId === 'focus') return; // Focus Mode mutes TTS
    
    // Remove markdown symbols and roleplay tags like *sigh*, (pauses), [laughs]
    const cleanText = text
      .replace(/[*#`~]/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .trim();
      
    if (!cleanText) return;
    
    tts.speak(cleanText, {
      voiceUri: ttsVoiceUri,
      rate: ttsSpeed,
      pitch: ttsPitch
    });
  };

  const handleSubmit = async (e: React.FormEvent | { preventDefault: () => void }) => {
    e.preventDefault();
    if (!input.trim() || !conversationId || isLoading) return;
    const text = input;
    setInput('');
    await submitMessage(text);
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950 text-gray-500">
        <p className="border border-gray-800 bg-gray-900 px-6 py-4 rounded-2xl shadow-lg">
          Select a conversation from the sidebar or start a new one.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-950 h-screen relative">
      {/* Speech Indicators */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        {isSpeaking && (
          <div className="bg-blue-500/20 border border-blue-500/50 text-blue-400 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-fade-in backdrop-blur-md">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></span>
            Niko is speaking...
          </div>
        )}
        {(isListening || isAwaitingFollowup) && !isSpeaking && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-fade-in backdrop-blur-md">
            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
            Listening...
          </div>
        )}
      </div>

      {/* Header */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-3">
            Niko OS
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-green-900/40 text-green-400 border border-green-900/50 px-2 py-0.5 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
              </svg>
              Local & Private
            </span>
            {isDemoMode && (
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-orange-900/40 text-orange-400 border border-orange-900/50 px-2 py-0.5 rounded-full">
                Demo Mode
              </span>
            )}
          </h2>
          
          {/* Mode Switcher */}
          <div className="relative group">
            <select 
              value={activeModeId}
              onChange={(e) => handleModeSwitch(e.target.value)}
              className={`appearance-none bg-gray-800/80 hover:bg-gray-700/80 text-sm font-medium pl-8 pr-8 py-1.5 rounded-full border border-gray-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-600 transition-colors ${WORKSPACE_MODES.find(m => m.id === activeModeId)?.color}`}
            >
              {WORKSPACE_MODES.map(m => (
                <option key={m.id} value={m.id} className="bg-gray-900 text-gray-200">
                  {m.name}
                </option>
              ))}
            </select>
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-4 h-4 ${WORKSPACE_MODES.find(m => m.id === activeModeId)?.color}`}>
                <path fillRule="evenodd" d={WORKSPACE_MODES.find(m => m.id === activeModeId)?.icon || ''} clipRule="evenodd" />
              </svg>
            </div>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {isConversationalMode ? (
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${
              isWakeWordReady && isWakeWordListening 
                ? 'text-blue-400 bg-blue-950/30 border border-blue-900/50' 
                : 'text-yellow-400 bg-yellow-950/30 border border-yellow-900/50'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isWakeWordReady && isWakeWordListening ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500'}`}></div>
              {wakeWordError ? 'VAD Error' : isWakeWordListening ? 'Conversational Mode Active' : 'Loading VAD...'}
            </div>
          ) : wakeWordEnabled && (
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${
              isWakeWordReady && isWakeWordListening 
                ? 'text-green-400 bg-green-950/30 border border-green-900/50' 
                : 'text-yellow-400 bg-yellow-950/30 border border-yellow-900/50'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isWakeWordReady && isWakeWordListening ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
              {wakeWordError ? 'VAD Error' : isWakeWordListening ? `Listening for "${wakeWord}"` : 'Loading VAD...'}
            </div>
          )}

          {/* Vision Mode Toggle */}
          <button 
            onClick={() => setIsVisionMode(!isVisionMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              isVisionMode 
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' 
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            {isVisionMode ? (
              <>
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                <span>Vision Active</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                </svg>
                <span>Vision Off</span>
              </>
            )}
          </button>

          {/* Conversational Mode Toggle */}
          <button 
            onClick={() => setIsConversationalMode(!isConversationalMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              isConversationalMode 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            {isConversationalMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.56.276 2.56-1.06V4.06z" />
                <path fillRule="evenodd" d="M17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 101.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 10-1.06-1.06l-1.72 1.72-1.72-1.72z" clipRule="evenodd" />
              </svg>
            )}
            <span>Conversational Voice</span>
          </button>
        </div>
      </div>

      {modelWarning && (
        <div className="bg-yellow-900/30 border-b border-yellow-900/50 px-6 py-2 text-xs text-yellow-500 flex justify-center">
          {modelWarning}
        </div>
      )}

      {suggestedModeId && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-gray-800 border border-purple-500/50 shadow-xl rounded-full px-4 py-2 flex items-center gap-3 animate-fade-in">
          <span className="text-sm text-gray-200">Switch to <strong className={WORKSPACE_MODES.find(m => m.id === suggestedModeId)?.color}>{WORKSPACE_MODES.find(m => m.id === suggestedModeId)?.name}</strong>?</span>
          <div className="flex gap-2 border-l border-gray-700 pl-3">
            <button onClick={() => handleModeSwitch(suggestedModeId)} className="text-xs font-semibold text-purple-400 hover:text-purple-300">Yes</button>
            <button onClick={() => setSuggestedModeId(null)} className="text-xs text-gray-500 hover:text-gray-300">Dismiss</button>
          </div>
        </div>
      )}

      {/* Vision Setup Modal Overlay */}
      {visionSetupNeeded && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-purple-500">
                <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
              </svg>
              Vision Model Required
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Vision Mode allows Niko to see your camera feed, but you don't have a local vision model installed yet.
            </p>
            <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl mb-6">
              <p className="text-xs text-gray-500 mb-2">Run this in your terminal:</p>
              <code className="text-sm text-purple-400 font-mono select-all">ollama pull llava</code>
            </div>
            <button 
              onClick={() => setVisionSetupNeeded(false)}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Picture in Picture Camera Feed */}
      {isVisionMode && (
        <div 
          className="absolute z-40 bg-gray-900 border border-gray-700 shadow-2xl rounded-xl overflow-hidden shadow-purple-900/20"
          style={{ left: pipPos.x, top: pipPos.y, width: 240, height: 180 }}
        >
          {/* Draggable Header */}
          <div 
            className="h-6 bg-gray-800/80 cursor-grab active:cursor-grabbing flex items-center justify-between px-2"
            onMouseDown={(e) => {
              isDragging.current = true;
              dragStart.current = { x: e.clientX - pipPos.x, y: e.clientY - pipPos.y };
            }}
            onMouseMove={(e) => {
              if (!isDragging.current) return;
              setPipPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
            }}
            onMouseUp={() => isDragging.current = false}
            onMouseLeave={() => isDragging.current = false}
          >
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Vision Feed</span>
            <button onClick={() => setIsVisionMode(false)} className="text-gray-500 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
          
          <div className="relative w-full h-[calc(100%-24px)] bg-black">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover transform -scale-x-100"
            />
            {capturedFrame && (
              <div className="absolute inset-0 border-4 border-purple-500 rounded-b-xl overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-purple-500/20 backdrop-blur-sm flex items-center justify-center">
                  <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded shadow">Frame Frozen</span>
                </div>
              </div>
            )}
            
            {/* Capture Controls Overlay */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center opacity-0 hover:opacity-100 transition-opacity">
              {!capturedFrame ? (
                <button 
                  onClick={() => setCapturedFrame(captureFrame())}
                  className="bg-purple-600/90 hover:bg-purple-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md"
                >
                  Capture Now
                </button>
              ) : (
                <button 
                  onClick={() => setCapturedFrame(null)}
                  className="bg-gray-800/90 hover:bg-gray-700 text-gray-200 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md"
                >
                  Clear Frame
                </button>
              )}
            </div>
            
            {/* Battery Warning */}
            <div className="absolute top-2 right-2 flex items-center">
               <div className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 text-[10px] px-1.5 py-0.5 rounded backdrop-blur-md" title="High CPU/Battery usage">
                 ⚠ CPU/BAT
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-3xl mx-auto flex flex-col">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-gray-500 mt-32">
              <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mb-6 border border-gray-800 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2 text-gray-300">Welcome to Niko OS</h3>
              <p>Say hello to start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex flex-col w-full">
                {/* Check for inline tool execution logs */}
                {msg.toolCalls && (
                  <div className="flex justify-start mb-2 mt-2">
                    <div className="inline-flex flex-col gap-1 bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg max-w-sm overflow-hidden">
                      {(() => {
                        try {
                          const calls = JSON.parse(msg.toolCalls);
                          return calls.map((c: any, i: number) => (
                            <div key={i} className="text-xs text-gray-400 flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-blue-500">
                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd" />
                              </svg>
                              <span className="truncate">
                                {c.status === 'canceled' ? <span className="text-red-400">[Canceled]</span> : null} 
                                {c.status === 'confirmed' ? <span className="text-green-400">[Confirmed]</span> : null} 
                                {' '}Used Skill: <span className="font-mono">{c.name}</span>
                              </span>
                            </div>
                          ));
                        } catch (e) {
                          return null;
                        }
                      })()}
                    </div>
                  </div>
                )}
                <MessageBubble message={msg} onRegenerate={handleRegenerate} />
              </div>
            ))
          )}
          
          {pendingToolCall && (
            <div className="bg-gray-900 p-5 rounded-2xl border border-yellow-600/50 shadow-xl my-4 ml-4 max-w-lg self-start">
              <h3 className="text-yellow-500 font-semibold mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
                Permission Required
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                Niko wants to perform a destructive action: <strong>{pendingToolCall.description}</strong>
              </p>
              <div className="bg-gray-950 p-3 rounded-lg text-xs font-mono text-gray-400 overflow-x-auto mb-4 border border-gray-800">
                <div className="text-gray-500 mb-1">{`// ${pendingToolCall.name} payload`}</div>
                {JSON.stringify(pendingToolCall.args, null, 2)}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => resolvePendingTool(pendingToolCall, true)} 
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors flex-1"
                >
                  Allow Action
                </button>
                <button 
                  onClick={() => resolvePendingTool(pendingToolCall, false)} 
                  className="bg-gray-800 hover:bg-red-900/50 hover:text-red-400 hover:border-red-800 border border-gray-700 text-gray-300 px-4 py-2 rounded-xl font-medium text-sm transition-colors flex-1"
                >
                  Deny
                </button>
              </div>
            </div>
          )}

          {isLoading && !pendingToolCall && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-800 px-5 py-3.5 rounded-2xl rounded-bl-none border border-gray-700 animate-pulse text-gray-400 text-sm flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="my-4 p-4 bg-red-950/50 border border-red-900 rounded-xl text-red-200 text-sm">
              <strong className="font-semibold block mb-1">Error</strong>
              {error}
            </div>
          )}

          {speechError && (
            <div className="my-4 p-4 bg-yellow-950/50 border border-yellow-900 rounded-xl text-yellow-200 text-sm flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                 <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
              <div>{speechError}</div>
            </div>
          )}
          
          {/* Invisible div to anchor the scroll */}
          <div ref={messagesEndRef} className="h-4" />

          {/* Large Siri-like Visual Indicator Overlay */}
          {(isListening || isAwaitingFollowup || isTranscribing) && (
            <div className="fixed bottom-28 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center justify-center pointer-events-none">
              <div className="relative flex items-center justify-center">
                {(isListening || isAwaitingFollowup) ? (
                  <>
                    <div className="absolute w-32 h-32 bg-red-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
                    <div className="absolute w-24 h-24 bg-red-500/30 rounded-full animate-pulse"></div>
                    <div className="relative z-10 w-16 h-16 bg-gradient-to-tr from-red-600 to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.7)] border border-red-400/50">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white animate-pulse">
                        <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                        <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                      </svg>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute w-32 h-32 bg-blue-500/20 rounded-full animate-spin" style={{ animationDuration: '3s' }}>
                      <div className="w-full h-full rounded-full border-t-4 border-blue-500 opacity-50"></div>
                    </div>
                    <div className="relative z-10 w-16 h-16 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.7)] border border-blue-400/50">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white animate-pulse">
                        <path fillRule="evenodd" d="M10.5 3.798v5.02a3 3 0 01-.879 2.121l-2.377 2.377a9.845 9.845 0 015.091 1.013 8.315 8.315 0 005.713.636l.285-.071-3.954-3.955a3 3 0 01-.879-2.121v-5.02a23.614 23.614 0 00-3 0zm4.5.138a25.1 25.1 0 00-6 0v5.004a1.5 1.5 0 01-.44 1.06l-3.208 3.206a11.348 11.348 0 002.288 5.343l3.708-3.708a1.5 1.5 0 011.06-.44h.084A6.816 6.816 0 0115.603 15h.063l3.708 3.708a11.35 11.35 0 002.288-5.343l-3.208-3.206a1.5 1.5 0 01-.44-1.06V3.936z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-6 px-5 py-2 bg-black/80 backdrop-blur-xl rounded-full text-sm font-bold tracking-wide text-white shadow-2xl border border-white/20">
                {(isListening || isAwaitingFollowup) ? "Listening..." : "Transcribing..."}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gray-950 border-t border-gray-800">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-center shadow-lg rounded-xl">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={(isListening || isAwaitingFollowup) ? "Listening..." : isTranscribing ? "Niko is transcribing locally..." : pendingToolCall ? "Waiting for permission..." : "Message Niko..."}
              disabled={isLoading || isTranscribing || pendingToolCall}
              className={`w-full bg-gray-900 text-white placeholder-gray-500 rounded-xl pl-5 pr-24 py-4 border focus:outline-none focus:ring-1 transition-all disabled:opacity-50 text-sm ${
                (isListening || isAwaitingFollowup) 
                  ? 'border-red-500/50 focus:ring-red-500 focus:border-red-500 bg-red-950/10' 
                  : isTranscribing
                    ? 'border-blue-500/50 bg-blue-950/10 animate-pulse'
                    : pendingToolCall
                      ? 'border-yellow-500/50 bg-yellow-950/10'
                      : 'border-gray-700 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            <div className="absolute right-2 top-2 bottom-2 flex items-center gap-1">
              <button
                type="button"
                onClick={toggleListening}
                disabled={isTranscribing || pendingToolCall}
                className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                  isListening 
                    ? 'bg-red-500/20 text-red-500 animate-pulse' 
                    : (isTranscribing || pendingToolCall)
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                title="Voice Input"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                  <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                </svg>
              </button>
              <button
                type="submit"
                disabled={!input.trim() || isLoading || pendingToolCall}
                className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors flex items-center justify-center h-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
                </svg>
              </button>
            </div>
          </form>
          <div className="text-center mt-3 text-xs text-gray-600">
            Niko OS uses local AI and may occasionally make mistakes.
          </div>
        </div>
      </div>
    </div>
  );
}
