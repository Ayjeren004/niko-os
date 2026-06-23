import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get('text');

  if (!text) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  const pythonPath = path.join(process.cwd(), 'python_kokoro', 'venv', 'bin', 'python');
  const kokoroScriptPath = path.join(process.cwd(), 'python_kokoro', 'kokoro_tts.py');

  return new Promise<Response>((resolve) => {
    const tmpDir = os.tmpdir();
    const tempFile = path.join(tmpDir, `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`);
    
    const piperProcess = spawn(pythonPath, [
      kokoroScriptPath,
      '--output', tempFile,
      '--voice', 'am_adam'
    ]);

    let errorOutput = '';
    let isResolved = false;

    // Timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      if (isResolved) return;
      isResolved = true;
      piperProcess.kill();
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch (e) {}
      resolve(NextResponse.json({ error: 'TTS timed out' }, { status: 504 }));
    }, 15000); // 15 seconds max

    piperProcess.stdin.write(text);
    piperProcess.stdin.end();

    piperProcess.stderr.on('data', (chunk) => {
      errorOutput += chunk.toString();
    });

    piperProcess.on('close', (code) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeoutId);

      if (code !== 0) {
        console.error('Kokoro error:', errorOutput);
        resolve(NextResponse.json({ error: 'TTS generation failed' }, { status: 500 }));
        return;
      }

      try {
        const audioBuffer = fs.readFileSync(tempFile);
        resolve(new NextResponse(audioBuffer, {
          headers: {
            'Content-Type': 'audio/wav',
            'Content-Length': audioBuffer.length.toString(),
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        }));
      } catch (err) {
        console.error('File read error:', err);
        resolve(NextResponse.json({ error: 'Failed to read audio' }, { status: 500 }));
      } finally {
        try {
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        } catch (e) {}
      }
    });

    piperProcess.on('error', (err) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeoutId);
      console.error('Kokoro spawn error:', err);
      resolve(NextResponse.json({ error: 'TTS engine not found' }, { status: 500 }));
    });
  });
}
