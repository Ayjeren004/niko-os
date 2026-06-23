# Niko OS

A local, privacy-first personal AI assistant built for the desktop web. 

Niko OS orchestrates tasks, notes, documents, and real-time voice/vision pipelines locally on your machine. Everything runs 100% offline, keeping your data private.

## Key Features

### 1. Offline & Private by Design
No external API calls are made. Niko OS uses Ollama for local LLM reasoning (Llama 3.2), memory extraction, and vector embeddings (nomic-embed-text) to keep all interactions completely private.

### 2. Local Vision Pipeline
A real-time vision mode that connects to your local webcam using the browser's Picture-in-Picture API. When enabled, frames are securely captured and analyzed using a local LLaVA model running via Ollama. 

### 3. Voice Activity Detection (VAD) & Text-to-Speech (TTS)
- **Voice Activity Detection**: Uses a WebAssembly port of the Silero VAD engine to detect speech boundaries in the browser.
- **Local Transcription**: Transcribes audio using a local Whisper model (`@xenova/transformers` base model).
- **Expressive Speech Synthesis**: Generates emotional and natural speech locally via Kokoro TTS running in an ONNX runtime, dynamically reacting to text punctuation for human-like inflection.

### 4. Automated Memory Extraction
During chat, a background worker parses conversation logs to extract facts, preferences, and context. These are saved in a local SQLite database and retrieved semantically via vector similarity search to enrich future prompts.

### 5. Encrypted Context Backups
Supports exporting user profile context, tasks, memories, and documents into a secure snapshot encrypted with AES-256-GCM.

### 6. Recruiter Demo Mode
A safe execution mode designed for live demonstrations. When active, system-modifying actions are mocked on the backend, allowing recruiters to test function-calling reasoning without altering the database.

## Technical Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Database**: SQLite, Prisma ORM
- **Local AI Core**: Ollama (Llama 3.2, LLaVA, nomic-embed-text), `@xenova/transformers` (Whisper), Kokoro ONNX

---

## Technical Challenges & Implementations

### Low-Latency Voice Pipeline
Connecting browser audio inputs, WASM voice activity detection, local Whisper transcription, Ollama inference, and Kokoro speech generation introduces significant latency. I resolved this by wrapping the Kokoro python subprocess in a stream handler and caching files in the system temp directory, yielding near real-time response audio.

### Resource Lifecycle Management
Webcam and microphone tracks must be handled carefully to avoid keeping the hardware active when not in use. I implemented strict cleanup hooks (`MediaStreamTrack.stop()`) on React component unmounts to ensure the camera shuts down immediately when vision mode is turned off.

---

## Getting Started

### Prerequisites
1. Node.js (v20+)
2. Ollama installed locally

### Setup Models
```bash
ollama pull llama3.2
ollama pull llava
ollama pull nomic-embed-text
```

### Installation
1. Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd niko-os
npm install
```

2. Run database migrations:
```bash
npx prisma generate
npx prisma db push
```

3. Start the dev server:
```bash
npm run dev
```
