import { useState, useEffect, useRef, useCallback } from 'react';
import { MicVAD } from '@ricky0123/vad-web';

interface UseWakeWordProps {
  enabled: boolean;
  onSpeechDetected: (audioBlob: Blob) => void;
  onSpeechStart?: () => void;
  vadOptions?: any;
}

export function useWakeWord({ enabled, onSpeechDetected, onSpeechStart, vadOptions = {} }: UseWakeWordProps) {
  const [isListening, setIsListening] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const myvad = useRef<any>(null);
  
  const onSpeechDetectedRef = useRef(onSpeechDetected);
  const onSpeechStartRef = useRef(onSpeechStart);
  
  useEffect(() => {
    onSpeechDetectedRef.current = onSpeechDetected;
    onSpeechStartRef.current = onSpeechStart;
  }, [onSpeechDetected, onSpeechStart]);

  const initEngine = useCallback(async () => {
    try {
      if (!myvad.current) {
        myvad.current = await MicVAD.new({
          startOnLoad: false,
          model: 'v5',
          baseAssetPath: window.location.origin + '/',
          onnxWASMBasePath: window.location.origin + '/',
          ortConfig: (ort: any) => {
            ort.env.wasm.numThreads = 1;
          },
          ...vadOptions,
          onSpeechStart: () => {
            if (onSpeechStartRef.current) onSpeechStartRef.current();
          },
          onSpeechEnd: (audio: Float32Array) => {
            console.log("VAD Speech End Detected");
            const wavBlob = float32ToWav(audio, 16000);
            onSpeechDetectedRef.current(wavBlob);
          },
          onVADMisfire: () => {
            console.log("VAD Misfire");
          }
        });
      }
      setIsReady(true);
      setError(null);
    } catch (err: any) {
      const fullErr = err.toString() + "\n" + (err.stack || '') + "\n" + (err.message || '');
      console.error("Failed to initialize VAD:", err);
      setError(err.toString());
      setIsReady(false);
    }
  }, [onSpeechDetected]);

  const startListening = useCallback(async () => {
    if (!myvad.current || !isReady) return;
    try {
      await myvad.current.start();
      setIsListening(true);
    } catch (err: any) {
      console.error("Failed to start VAD:", err);
      setError(err.toString());
      setIsListening(false);
    }
  }, [isReady]);

  const stopListening = useCallback(async () => {
    if (!myvad.current) return;
    try {
      await myvad.current.pause();
      setIsListening(false);
    } catch (err: any) {
      console.error("Failed to stop VAD:", err);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      if (!isReady) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        initEngine().then(() => {
          // Will start listening in the next cycle if isReady becomes true
        });
      } else {
        startListening();
      }
    } else {
      stopListening();
    }
  }, [enabled, isReady, initEngine, startListening, stopListening]);

  useEffect(() => {
    return () => {
      if (myvad.current) {
        myvad.current.destroy();
        myvad.current = null;
      }
    };
  }, []);

  return {
    isListening,
    isReady,
    error,
    startListening,
    stopListening
  };
}

// Utility to convert raw float32 audio from VAD to WAV blob for transcription
function float32ToWav(float32Array: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + float32Array.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + float32Array.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, float32Array.length * 2, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
