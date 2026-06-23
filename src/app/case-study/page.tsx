import React from 'react';
import Link from 'next/link';

export default function CaseStudyPage() {
  return (
    <main className="min-h-screen bg-[#05050A] text-gray-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 lg:py-32">
        {/* Navigation */}
        <nav className="mb-16">
          <Link href="/" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2 w-max">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            Back to Application
          </Link>
        </nav>

        {/* Hero Section */}
        <header className="mb-24 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide uppercase">
            Portfolio Case Study
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight">
            Niko OS <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
              Local-First AI Agent
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl leading-relaxed">
            A privacy-centric autonomous operating system built entirely on local web technologies. Capable of semantic memory, task orchestration, and continuous voice interaction without a single cloud API call.
          </p>
        </header>

        {/* What I Built */}
        <section className="mb-32">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-4">
            <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm">01</span>
            What I Built
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-8 rounded-3xl bg-gray-900/40 border border-gray-800/50 backdrop-blur-xl">
              <h3 className="text-xl font-semibold text-white mb-4">Autonomous Skill Engine</h3>
              <p className="text-gray-400 leading-relaxed">
                Engineered a modular tool-calling orchestrator that allows the underlying LLM to autonomously manage a local SQLite database, extracting semantic memories, chunking documents, and scheduling tasks based on natural language input.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-gray-900/40 border border-gray-800/50 backdrop-blur-xl">
              <h3 className="text-xl font-semibold text-white mb-4">Semantic Relationship Graph</h3>
              <p className="text-gray-400 leading-relaxed">
                Built a dynamic vector-similarity engine to conceptually link memories, documents, and tasks on the fly, visualizing these high-dimensional relationships using a physics-based 2D force graph.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-gray-900/40 border border-gray-800/50 backdrop-blur-xl">
              <h3 className="text-xl font-semibold text-white mb-4">Conversational Voice Mode</h3>
              <p className="text-gray-400 leading-relaxed">
                Integrated Silero VAD and Whisper transcription natively to support real-time, continuous voice interactions. Implemented zero-latency interruption handling without compromising the local-only data boundary.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-gray-900/40 border border-gray-800/50 backdrop-blur-xl">
              <h3 className="text-xl font-semibold text-white mb-4">Dynamic Model Management</h3>
              <p className="text-gray-400 leading-relaxed">
                Developed an intuitive UI to hot-swap local Ollama models on the fly, with automated safety fallbacks to prevent semantic search corruption when changing vector embedding architectures.
              </p>
            </div>
          </div>
        </section>

        {/* System Architecture */}
        <section className="mb-32">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-4">
            <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm">02</span>
            System Architecture
          </h2>
          
          <div className="p-8 md:p-12 rounded-3xl bg-gray-900/40 border border-gray-800/50 backdrop-blur-xl mb-8">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-center">
              
              {/* Frontend Layer */}
              <div className="flex flex-col gap-4 w-full md:w-1/3">
                <div className="p-4 rounded-2xl bg-blue-900/20 border border-blue-500/30">
                  <h4 className="font-bold text-blue-400 mb-1">Presentation</h4>
                  <p className="text-xs text-gray-400">Electron &bull; Next.js &bull; Tailwind</p>
                </div>
                <div className="h-8 border-l-2 border-dashed border-gray-700 mx-auto"></div>
                <div className="p-4 rounded-2xl bg-indigo-900/20 border border-indigo-500/30">
                  <h4 className="font-bold text-indigo-400 mb-1">Local Audio</h4>
                  <p className="text-xs text-gray-400">Silero VAD &bull; Whisper.cpp</p>
                </div>
              </div>

              {/* Backend Layer */}
              <div className="hidden md:flex h-32 border-t-2 border-dashed border-gray-700 w-16 mt-8"></div>
              
              <div className="flex flex-col gap-4 w-full md:w-1/3">
                <div className="p-4 rounded-2xl bg-purple-900/20 border border-purple-500/30">
                  <h4 className="font-bold text-purple-400 mb-1">Orchestration</h4>
                  <p className="text-xs text-gray-400">Next.js API &bull; Skill Handlers</p>
                </div>
                <div className="h-8 border-l-2 border-dashed border-gray-700 mx-auto"></div>
                <div className="p-4 rounded-2xl bg-pink-900/20 border border-pink-500/30">
                  <h4 className="font-bold text-pink-400 mb-1">Local Inference</h4>
                  <p className="text-xs text-gray-400">Ollama &bull; Llama 3 &bull; Nomic</p>
                </div>
              </div>

              {/* Data Layer */}
              <div className="hidden md:flex h-32 border-t-2 border-dashed border-gray-700 w-16 mt-8"></div>
              
              <div className="flex flex-col gap-4 w-full md:w-1/3">
                <div className="p-4 rounded-2xl bg-emerald-900/20 border border-emerald-500/30">
                  <h4 className="font-bold text-emerald-400 mb-1">Database</h4>
                  <p className="text-xs text-gray-400">SQLite &bull; Prisma ORM</p>
                </div>
                <div className="h-8 border-l-2 border-dashed border-gray-700 mx-auto"></div>
                <div className="p-4 rounded-2xl bg-teal-900/20 border border-teal-500/30">
                  <h4 className="font-bold text-teal-400 mb-1">Data Types</h4>
                  <p className="text-xs text-gray-400">Vectors &bull; JSON &bull; Timestamps</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Technical Challenges */}
        <section className="mb-32">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-4">
            <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm">03</span>
            Technical Challenges
          </h2>
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gray-900/20 border border-gray-800 pl-8 relative">
              <div className="absolute top-0 left-0 h-full w-1.5 bg-red-500/50 rounded-l-2xl"></div>
              <h3 className="text-lg font-semibold text-white mb-2">Vector Incompatibility During Model Swaps</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                <strong>Challenge:</strong> Allowing users to hot-swap local embedding models means previously generated high-dimensional vectors become mathematically incompatible, breaking semantic search.
                <br/><br/>
                <strong>Solution:</strong> I updated the Prisma schema to tag every database entry with the specific `embeddingModel` used at generation. Upon retrieval, the application validates the active model against the data tag. If a mismatch occurs, it gracefully falls back to a deterministic keyword search while prompting the user to run a batch re-indexing job.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gray-900/20 border border-gray-800 pl-8 relative">
              <div className="absolute top-0 left-0 h-full w-1.5 bg-amber-500/50 rounded-l-2xl"></div>
              <h3 className="text-lg font-semibold text-white mb-2">Autonomous Action Guardrails</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                <strong>Challenge:</strong> An LLM with database write access is prone to hallucinated destructive actions (e.g., deleting critical documents).
                <br/><br/>
                <strong>Solution:</strong> I built a middleware layer in the Skill Interface. Skills are tagged with safety levels. Read-only actions auto-execute, but destructive operations pause the agent loop, push a UI prompt to the frontend, and await cryptographic confirmation before committing the transaction.
              </p>
            </div>
          </div>
        </section>

        {/* Privacy & Security */}
        <section className="mb-32">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-4">
            <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm">04</span>
            Privacy & Security Design
          </h2>
          <div className="p-8 rounded-3xl bg-gradient-to-br from-gray-900/80 to-[#0a0a0f] border border-gray-800">
            <ul className="space-y-4">
              <li className="flex items-start gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-500 mt-1 shrink-0">
                  <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-white font-medium mb-1">Zero-Cloud Footprint</h4>
                  <p className="text-gray-400 text-sm">Every API, database transaction, and AI inference runs exclusively on the user's local hardware. No telemetry, no cloud sync, no data harvesting.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-500 mt-1 shrink-0">
                  <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-white font-medium mb-1">AES-256-GCM Encrypted Backups</h4>
                  <p className="text-gray-400 text-sm">When users export their data, the SQLite database is compressed and symmetrically encrypted in-memory using WebCrypto APIs before ever touching the disk.</p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* Future Roadmap */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-4">
            <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm">05</span>
            Future Roadmap
          </h2>
          <div className="flex flex-wrap gap-3">
            <span className="px-4 py-2 rounded-full border border-gray-700 bg-gray-800/50 text-gray-300 text-sm">macOS Native Notifications Integration</span>
            <span className="px-4 py-2 rounded-full border border-gray-700 bg-gray-800/50 text-gray-300 text-sm">Background Worker Queues for OCR</span>
            <span className="px-4 py-2 rounded-full border border-gray-700 bg-gray-800/50 text-gray-300 text-sm">Stable Diffusion Image Generation Skill</span>
            <span className="px-4 py-2 rounded-full border border-gray-700 bg-gray-800/50 text-gray-300 text-sm">Advanced Graph Sub-clustering</span>
          </div>
        </section>

      </div>
    </main>
  );
}
