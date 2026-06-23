'use client';

import React, { useState, useEffect } from 'react';
import { Message } from '@/types';
import { tts } from '@/lib/tts';

interface Props {
  message: Message;
  onRegenerate?: (messageId: string, modelOverride: string) => void;
}

export default function MessageBubble({ message, onRegenerate }: Props) {
  const isUser = message.role === 'user';
  
  const [rating, setRating] = useState<number | null>(null);
  const [isSpeakingMessage, setIsSpeakingMessage] = useState(false);

  useEffect(() => {
    return () => {
      if (isSpeakingMessage) {
        tts.stop();
      }
    };
  }, [isSpeakingMessage]);

  const handleSpeak = () => {
    if (isSpeakingMessage) {
      tts.stop();
      setIsSpeakingMessage(false);
    } else {
      const cleanText = message.content
        .replace(/[*#`~]/g, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/\[[^\]]*\]/g, '')
        .trim();
        
      if (!cleanText) return;
      
      tts.speak(cleanText, {
        onStart: () => setIsSpeakingMessage(true),
        onEnd: () => setIsSpeakingMessage(false)
      });
    }
  };
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showRegenerate, setShowRegenerate] = useState(false);
  
  const handleRating = async (val: number) => {
    setRating(val);
    if (val === -1) setShowFeedback(true);
    else submitFeedback(val, '');
  };

  const submitFeedback = async (val: number, text: string) => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: message.id, rating: val, text })
      });
      setFeedbackSubmitted(true);
      setShowFeedback(false);
    } catch(e) {}
  };
  
  let toolActivityLog: any[] = [];
  if (message.toolCalls) {
    try {
      toolActivityLog = JSON.parse(message.toolCalls);
    } catch (e) {}
  }

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shrink-0 mr-3 mt-1 shadow-md border border-gray-700">
          <span className="text-white text-xs font-bold">N</span>
        </div>
      )}
      
      <div 
        className={`max-w-[75%] px-5 py-3.5 rounded-2xl ${
          isUser 
            ? 'bg-blue-600 text-white rounded-br-none' 
            : 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700'
        }`}
      >
        {toolActivityLog.length > 0 && (
          <div className="mb-3 pb-3 border-b border-gray-700/50 flex flex-col gap-2">
            {toolActivityLog.map((log, idx) => {
              let displayName = log.name;
              let isAgent = false;
              if (log.name === 'invoke_research_agent') { displayName = 'Research Agent'; isAgent = true; }
              else if (log.name === 'invoke_planner_agent') { displayName = 'Planner Agent'; isAgent = true; }
              else if (log.name === 'invoke_memory_agent') { displayName = 'Memory Agent'; isAgent = true; }

              return (
                <div key={idx} className={`flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-md w-fit ${isAgent ? 'text-blue-300 bg-blue-900/20' : 'text-purple-300 bg-purple-900/20'}`}>
                  {isAgent ? (
                    <span className="text-sm">🤖</span>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
                      <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l1.093.892c.12.098.197.24.21.391.01.121.011.244.011.368 0 .124-.001.247-.011.368-.013.15-.09.293-.21.391l-1.093.892a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-1.093-.892c-.12-.098-.197-.24-.21-.391a7.465 7.465 0 000-.736c.013-.15.09-.293.21-.391l1.093-.892a1.875 1.875 0 00.432-2.385l-.923-1.597a1.875 1.875 0 00-2.28-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="font-medium">{isAgent ? 'Delegated to:' : 'Niko used:'}</span>
                  <span className="opacity-80 font-mono">{displayName}</span>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        
        {/* Feedback Action Bar */}
        {!isUser && (
          <div className="mt-4 pt-3 border-t border-gray-700/50 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSpeak}
                  className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${isSpeakingMessage ? 'text-blue-400 bg-blue-400/10 animate-pulse' : 'text-gray-400'}`}
                  title={isSpeakingMessage ? "Stop speaking" : "Speak response"}
                >
                  {isSpeakingMessage ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 1 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06z" />
                      <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06z" />
                    </svg>
                  )}
                </button>
                <button 
                  onClick={() => handleRating(1)}
                  className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${rating === 1 ? 'text-green-400 bg-green-400/10' : 'text-gray-400'}`}
                  title="Good response"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M1 8.25a1.25 1.25 0 112.5 0v7.5a1.25 1.25 0 11-2.5 0v-7.5zM11 3V1.7c0-.268.14-.526.395-.607A2 2 0 0114 3c0 .995-.182 1.948-.514 2.826-.204.54.166 1.09.74 1.09h1.025a1.5 1.5 0 011.513 1.625l-1.077 8.58A1.5 1.5 0 0114.198 18H8.5a1.5 1.5 0 01-1.06-.44l-2.43-2.43A1.5 1.5 0 014.5 14.07v-3.57a1.5 1.5 0 01.326-.93l2.43-3.24c.2-.267.514-.426.844-.426h2.9z" /></svg>
                </button>
                <button 
                  onClick={() => handleRating(-1)}
                  className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${rating === -1 ? 'text-red-400 bg-red-400/10' : 'text-gray-400'}`}
                  title="Bad response"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M1 11.75a1.25 1.25 0 102.5 0v-7.5a1.25 1.25 0 10-2.5 0v7.5zM11 17v1.3c0 .268.14.526.395.607A2 2 0 0014 17c0-.995-.182-1.948-.514-2.826-.204-.54.166-1.09.74-1.09h1.025a1.5 1.5 0 001.513-1.625l-1.077-8.58A1.5 1.5 0 0014.198 2H8.5a1.5 1.5 0 00-1.06.44l-2.43 2.43A1.5 1.5 0 004.5 5.93v3.57a1.5 1.5 0 00.326.93l2.43 3.24c.2.267.514.426.844.426h2.9z" /></svg>
                </button>
                {feedbackSubmitted && <span className="text-xs text-green-400 ml-2">Feedback saved!</span>}
              </div>
              
              <div className="flex items-center gap-3">
                {(message as any).modelUsed && (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-gray-900 border border-gray-700 text-gray-400 rounded">
                    {(message as any).modelUsed}
                  </span>
                )}
                {onRegenerate && (
                  <div className="relative">
                    <button 
                      onClick={() => setShowRegenerate(!showRegenerate)}
                      className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400"
                      title="Regenerate"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                    </button>
                    {showRegenerate && (
                      <div className="absolute bottom-full right-0 mb-1 w-32 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-10">
                        <div className="text-xs font-semibold text-gray-500 px-3 py-1.5 bg-gray-800">Regenerate with:</div>
                        {['llama3.2', 'mistral', 'phi3'].map(m => (
                          <button 
                            key={m}
                            onClick={() => { setShowRegenerate(false); onRegenerate(message.id, m); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-blue-600 hover:text-white"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {showFeedback && (
              <div className="flex items-center gap-2 mt-1">
                <input 
                  type="text" 
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="What went wrong?" 
                  className="flex-1 bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
                <button 
                  onClick={() => submitFeedback(rating!, feedbackText)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
                >
                  Submit
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
