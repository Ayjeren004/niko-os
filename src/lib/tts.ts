// TTS Helper for Web Speech API

export interface TTSOptions {
  voiceUri?: string;
  pitch?: number;
  rate?: number;
  onEnd?: () => void;
  onStart?: () => void;
}

export class TTSManager {
  private static instance: TTSManager;
  private currentAudio: HTMLAudioElement | null = null;
  private fallbackUtterance: SpeechSynthesisUtterance | null = null;
  private isCurrentlySpeaking = false;
  private voices: SpeechSynthesisVoice[] = [];

  private constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.voices = window.speechSynthesis.getVoices();
      };
    }
  }

  public static getInstance(): TTSManager {
    if (!TTSManager.instance) {
      TTSManager.instance = new TTSManager();
    }
    return TTSManager.instance;
  }

  public getVoices(): any[] {
    return [{ name: "Niko Neural (Kokoro)", voiceURI: "kokoro" }];
  }

  public getMaleVoices(): any[] {
    return this.getVoices();
  }

  public speak(text: string, options: TTSOptions = {}) {
    if (typeof window === 'undefined') return;

    // Interrupt any ongoing speech
    this.stop();

    const hasCyrillic = /[А-Яа-яЁё]/.test(text);

    if (hasCyrillic && 'speechSynthesis' in window) {
      // Fallback to Apple Web Speech API for Russian
      this.fallbackUtterance = new SpeechSynthesisUtterance(text);
      this.fallbackUtterance.lang = 'ru-RU';
      
      const ruVoices = this.voices.filter(v => v.lang.startsWith('ru'));
      const yuri = ruVoices.find(v => v.name.includes('Yuri'));
      const milena = ruVoices.find(v => v.name.includes('Milena'));
      
      if (yuri) this.fallbackUtterance.voice = yuri;
      else if (milena) this.fallbackUtterance.voice = milena;
      else if (ruVoices.length > 0) this.fallbackUtterance.voice = ruVoices[0];

      if (options.onStart) this.fallbackUtterance.onstart = options.onStart;
      this.fallbackUtterance.onend = () => {
        this.isCurrentlySpeaking = false;
        this.fallbackUtterance = null;
        if (options.onEnd) options.onEnd();
      };
      this.fallbackUtterance.onerror = () => {
        this.isCurrentlySpeaking = false;
        this.fallbackUtterance = null;
        if (options.onEnd) options.onEnd();
      };

      this.isCurrentlySpeaking = true;
      window.speechSynthesis.speak(this.fallbackUtterance);
      return;
    }

    // Construct the API URL for Kokoro
    const url = `/api/tts?text=${encodeURIComponent(text)}`;
    const audio = new Audio(url);

    if (options.onStart) {
      audio.onplay = options.onStart;
    }

    audio.onplaying = () => {
      this.isCurrentlySpeaking = true;
    };

    audio.onended = () => {
      this.isCurrentlySpeaking = false;
      this.currentAudio = null;
      if (options.onEnd) options.onEnd();
    };

    audio.onerror = (e) => {
      console.error('Kokoro Audio Error:', e);
      this.isCurrentlySpeaking = false;
      this.currentAudio = null;
      if (options.onEnd) options.onEnd();
    };

    this.currentAudio = audio;
    
    // Play the audio
    audio.play().catch(err => {
      console.warn("Kokoro Audio play failed", err);
      this.isCurrentlySpeaking = false;
    });
  }

  public stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.fallbackUtterance = null;
    }
    this.isCurrentlySpeaking = false;
  }

  public isSpeaking(): boolean {
    if (this.isCurrentlySpeaking) return true;
    if (this.fallbackUtterance && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis.speaking;
    }
    return false;
  }
}

export const tts = TTSManager.getInstance();
